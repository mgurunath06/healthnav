from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import verify_clerk_token
from db.client import get_pool
from db.users import ensure_user

router = APIRouter(tags=["profiles"])

Relation = Literal["self", "spouse", "child", "parent", "sibling", "other"]


class Profile(BaseModel):
    id: str
    display_name: str
    relation: str
    date_of_birth: str | None
    created_at: str


class ProfileCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    relation: Relation = "other"
    date_of_birth: date | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    relation: Relation | None = None
    date_of_birth: date | None = None


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
                   date_of_birth, created_at
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
        if body.relation == "self":
            existing = await conn.fetchrow(
                "SELECT id FROM profiles WHERE user_id = $1 AND COALESCE(relation, relationship) = 'self'",
                user_id,
            )
            if existing:
                raise HTTPException(status_code=409, detail="SELF_PROFILE_EXISTS")

        row = await conn.fetchrow(
            """
            INSERT INTO profiles (user_id, display_name, relation, name, relationship, date_of_birth)
            VALUES ($1, $2, $3, $2, $3, $4)
            RETURNING id, display_name, relation, date_of_birth, created_at
            """,
            user_id,
            body.display_name,
            body.relation,
            body.date_of_birth,
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

        row = await conn.fetchrow(
            """
            UPDATE profiles
            SET display_name = COALESCE($3, display_name),
                relation = COALESCE($4, relation),
                name = COALESCE($3, name),
                relationship = COALESCE($4, relationship),
                date_of_birth = COALESCE($5, date_of_birth),
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id, COALESCE(display_name, name, 'Me') AS display_name,
                      COALESCE(relation, relationship, 'self') AS relation,
                      date_of_birth, created_at
            """,
            profile_uuid,
            user_id,
            body.display_name,
            body.relation,
            body.date_of_birth,
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
        await conn.execute("DELETE FROM profiles WHERE id = $1 AND user_id = $2", profile_uuid, user_id)
    return {"deleted": True, "profile_id": profile_id}


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


def _profile(row) -> Profile:
    return Profile(
        id=str(row["id"]),
        display_name=row["display_name"],
        relation=row["relation"],
        date_of_birth=row["date_of_birth"].isoformat() if row["date_of_birth"] else None,
        created_at=row["created_at"].isoformat(),
    )


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
