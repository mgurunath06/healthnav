from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import verify_clerk_token
from db.client import get_pool
from db.health_memory import get_health_memory
from db.profile_context import RELATION_ALIASES, list_family_profiles, profile_age
from db.users import ensure_user

router = APIRouter(tags=["profiles"])

RELATIONS = set(RELATION_ALIASES)


class Profile(BaseModel):
    id: str
    display_name: str
    relation: str
    date_of_birth: str | None
    age: int | None
    sex: str | None
    aliases: list[str]
    notes: str | None
    document_count: int = 0
    card_count: int = 0
    conversation_count: int = 0
    created_at: str


class ProfileCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    relation: str = "other"
    date_of_birth: date | None = None
    sex: str | None = Field(default=None, max_length=20)
    aliases: list[str] = Field(default_factory=list, max_length=12)
    notes: str | None = Field(default=None, max_length=1000)


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    relation: str | None = None
    date_of_birth: date | None = None
    sex: str | None = Field(default=None, max_length=20)
    aliases: list[str] | None = Field(default=None, max_length=12)
    notes: str | None = Field(default=None, max_length=1000)


@router.get("")
async def list_profiles(clerk_user_id: str = Depends(verify_clerk_token)) -> list[Profile]:
    pool = await get_pool()
    if pool is None:
        return []

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        await _ensure_self_profile(conn, user_id)
        rows = await conn.fetch(
            """
            SELECT id, COALESCE(display_name, name, 'Me') AS display_name,
                   COALESCE(relation, relationship, 'self') AS relation,
                   date_of_birth, sex, aliases, notes, created_at,
                   (SELECT COUNT(*) FROM document_upload_logs d
                    WHERE d.profile_id = profiles.id AND d.is_deleted = FALSE) AS document_count,
                   (SELECT COUNT(*) FROM saved_prep_cards c
                    WHERE c.profile_id = profiles.id) AS card_count,
                   (SELECT COUNT(*) FROM chat_conversations cc
                    WHERE cc.profile_id = profiles.id) AS conversation_count
            FROM profiles
            WHERE user_id = $1
            ORDER BY CASE WHEN COALESCE(relation, relationship) = 'self' THEN 0 ELSE 1 END,
                     created_at ASC
            """,
            user_id,
        )
    return [_profile(row) for row in rows]


@router.post("")
async def create_profile(
    body: ProfileCreate,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> Profile:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        _validate_relation(body.relation)
        if body.relation == "self":
            existing = await conn.fetchrow(
                "SELECT id FROM profiles WHERE user_id = $1 AND COALESCE(relation, relationship) = 'self'",
                user_id,
            )
            if existing:
                raise HTTPException(status_code=409, detail="SELF_PROFILE_EXISTS")

        row = await conn.fetchrow(
            """
            INSERT INTO profiles
              (user_id, display_name, relation, name, relationship, date_of_birth,
               sex, aliases, notes)
            VALUES ($1, $2, $3, $2, $3, $4, $5, $6::JSONB, $7)
            RETURNING id, display_name, relation, date_of_birth, sex, aliases, notes,
                      created_at
            """,
            user_id,
            body.display_name,
            body.relation,
            body.date_of_birth,
            body.sex,
            _json_aliases(body.aliases),
            body.notes,
        )
    return _profile(row)


@router.patch("/{profile_id}")
async def update_profile(
    profile_id: str,
    body: ProfileUpdate,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> Profile:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    profile_uuid = _parse_uuid(profile_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        current = await conn.fetchrow(
            "SELECT COALESCE(relation, relationship, 'self') AS relation FROM profiles WHERE id = $1 AND user_id = $2",
            profile_uuid,
            user_id,
        )
        if current is None:
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        if current["relation"] == "self" and body.relation and body.relation != "self":
            raise HTTPException(status_code=400, detail="SELF_RELATION_IMMUTABLE")
        if body.relation:
            _validate_relation(body.relation)

        row = await conn.fetchrow(
            """
            UPDATE profiles
            SET display_name = COALESCE($3, display_name),
                relation = COALESCE($4, relation),
                name = COALESCE($3, name),
                relationship = COALESCE($4, relationship),
                date_of_birth = CASE WHEN $9 THEN $5 ELSE date_of_birth END,
                sex = CASE WHEN $10 THEN $6 ELSE sex END,
                aliases = CASE WHEN $11 THEN COALESCE($7::JSONB, '[]'::JSONB) ELSE aliases END,
                notes = CASE WHEN $12 THEN $8 ELSE notes END,
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id, COALESCE(display_name, name, 'Me') AS display_name,
                      COALESCE(relation, relationship, 'self') AS relation,
                      date_of_birth, sex, aliases, notes, created_at
            """,
            profile_uuid,
            user_id,
            body.display_name,
            body.relation,
            body.date_of_birth,
            body.sex,
            _json_aliases(body.aliases) if body.aliases is not None else None,
            body.notes,
            "date_of_birth" in body.model_fields_set,
            "sex" in body.model_fields_set,
            "aliases" in body.model_fields_set,
            "notes" in body.model_fields_set,
        )
    return _profile(row)


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> dict:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    profile_uuid = _parse_uuid(profile_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        current = await conn.fetchrow(
            "SELECT COALESCE(relation, relationship, 'self') AS relation FROM profiles WHERE id = $1 AND user_id = $2",
            profile_uuid,
            user_id,
        )
        if current is None:
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        if current["relation"] == "self":
            raise HTTPException(status_code=400, detail="SELF_PROFILE_IMMUTABLE")
        async with conn.transaction():
            upload_ids = await conn.fetch(
                "SELECT id FROM document_upload_logs WHERE user_id = $1 AND profile_id = $2",
                user_id,
                profile_uuid,
            )
            ids = [row["id"] for row in upload_ids]
            if ids:
                await conn.execute("DELETE FROM extracted_health_values WHERE upload_log_id = ANY($1::UUID[])", ids)
                await conn.execute("DELETE FROM document_findings WHERE upload_log_id = ANY($1::UUID[])", ids)
            await conn.execute(
                "DELETE FROM document_upload_logs WHERE user_id = $1 AND profile_id = $2",
                user_id,
                profile_uuid,
            )
            await conn.execute(
                "DELETE FROM saved_prep_cards WHERE user_id = $1 AND profile_id = $2",
                user_id,
                profile_uuid,
            )
            await conn.execute(
                "DELETE FROM chat_conversations WHERE user_id = $1 AND profile_id = $2",
                user_id,
                profile_uuid,
            )
            await conn.execute(
                "DELETE FROM profile_health_memory WHERE user_id = $1 AND profile_id = $2",
                user_id,
                profile_uuid,
            )
            await conn.execute("DELETE FROM profiles WHERE id = $1 AND user_id = $2", profile_uuid, user_id)
    return {"deleted": True, "profile_id": profile_id}


@router.get("/{profile_id}/memory")
async def view_profile_memory(
    profile_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> dict:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    profile_uuid = _parse_uuid(profile_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        await _assert_profile_owner(conn, profile_uuid, user_id)
        return await get_health_memory(conn, user_id, profile_uuid)


@router.get("/{profile_id}/overview")
async def profile_overview(
    profile_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> dict:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    profile_uuid = _parse_uuid(profile_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        await _assert_profile_owner(conn, profile_uuid, user_id)
        profiles = await list_family_profiles(conn, user_id)
        selected = next((profile for profile in profiles if profile["id"] == profile_uuid), None)
        if selected is None:
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        memory = await get_health_memory(conn, user_id, profile_uuid)
        documents = await conn.fetch(
            """
            SELECT id, original_filename, document_type, uploaded_at, patient_name
            FROM document_upload_logs
            WHERE user_id = $1 AND profile_id = $2 AND is_deleted = FALSE
            ORDER BY uploaded_at DESC
            LIMIT 8
            """,
            user_id,
            profile_uuid,
        )
        cards = await conn.fetch(
            """
            SELECT id, symptom_description, prep_card, created_at
            FROM saved_prep_cards
            WHERE user_id = $1 AND profile_id = $2
            ORDER BY created_at DESC
            LIMIT 8
            """,
            user_id,
            profile_uuid,
        )
        counts = await conn.fetchrow(
            """
            SELECT
              (SELECT COUNT(*) FROM document_upload_logs
               WHERE user_id = $1 AND profile_id = $2 AND is_deleted = FALSE) AS documents,
              (SELECT COUNT(*) FROM saved_prep_cards
               WHERE user_id = $1 AND profile_id = $2) AS cards,
              (SELECT COUNT(*) FROM chat_conversations
               WHERE user_id = $1 AND profile_id = $2) AS conversations
            """,
            user_id,
            profile_uuid,
        )
    return {
        "profile": {
            **_profile(selected).model_dump(),
            "document_count": int(counts["documents"]),
            "card_count": int(counts["cards"]),
            "conversation_count": int(counts["conversations"]),
        },
        "memory": memory,
        "documents": [
            {
                "upload_id": str(row["id"]),
                "title": row["original_filename"],
                "document_type": row["document_type"],
                "patient_name": row["patient_name"],
                "date": row["uploaded_at"].date().isoformat(),
            }
            for row in documents
        ],
        "cards": [
            {
                "card_id": str(row["id"]),
                "title": row["symptom_description"] or "Doctor brief",
                "quadrant": _card_quadrant(row["prep_card"]),
                "date": row["created_at"].date().isoformat(),
            }
            for row in cards
        ],
    }


@router.delete("/{profile_id}/memory")
async def clear_profile_memory(
    profile_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> dict:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    profile_uuid = _parse_uuid(profile_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        await _assert_profile_owner(conn, profile_uuid, user_id)
        await conn.execute(
            "DELETE FROM profile_health_memory WHERE user_id = $1 AND profile_id = $2",
            user_id,
            profile_uuid,
        )
    return {"cleared": True, "profile_id": profile_id}


async def _ensure_self_profile(conn, user_id: str) -> None:
    existing = await conn.fetchrow(
        "SELECT id FROM profiles WHERE user_id = $1 AND COALESCE(relation, relationship) = 'self'",
        user_id,
    )
    if existing:
        return
    await conn.execute(
        """
        INSERT INTO profiles (user_id, display_name, relation, name, relationship)
        VALUES ($1, 'Me', 'self', 'Me', 'self')
        """,
        user_id,
    )


async def _assert_profile_owner(conn, profile_id, user_id: str) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM profiles WHERE id = $1 AND user_id = $2",
        profile_id,
        user_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")


def _profile(row) -> Profile:
    return Profile(
        id=str(row["id"]),
        display_name=row["display_name"],
        relation=row["relation"],
        date_of_birth=row["date_of_birth"].isoformat() if row["date_of_birth"] else None,
        age=profile_age(dict(row)),
        sex=row["sex"],
        aliases=list(row["aliases"] or []),
        notes=row["notes"],
        document_count=int(_row_value(row, "document_count", 0)),
        card_count=int(_row_value(row, "card_count", 0)),
        conversation_count=int(_row_value(row, "conversation_count", 0)),
        created_at=row["created_at"].isoformat(),
    )


def _validate_relation(value: str) -> None:
    if value not in RELATIONS:
        raise HTTPException(status_code=422, detail="INVALID_RELATION")


def _json_aliases(values: list[str] | None) -> str:
    import json

    cleaned = []
    seen = set()
    for value in values or []:
        alias = " ".join(value.split())[:100]
        marker = alias.casefold()
        if alias and marker not in seen:
            cleaned.append(alias)
            seen.add(marker)
    return json.dumps(cleaned[:12])


def _row_value(row, key: str, default=None):
    return row[key] if key in row.keys() else default


def _card_quadrant(value):
    import json

    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None
    return value.get("quadrant") if isinstance(value, dict) else None


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
