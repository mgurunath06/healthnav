from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import verify_clerk_token
from db.client import get_pool
from db.users import ensure_user

router = APIRouter(tags=["cards"])


class CardCreate(BaseModel):
    request_id: str
    prep_card: dict
    symptom_description: str | None = None
    profile_id: str | None = None


class CardSummary(BaseModel):
    card_id: str
    request_id: str
    profile_id: str | None
    profile_display_name: str | None
    symptom_description: str | None
    summary: str | None
    quadrant: dict | None
    created_at: str


class CardDetail(CardSummary):
    prep_card: dict


@router.post("")
async def save_card(
    body: CardCreate,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> CardDetail:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    profile_uuid = _parse_optional_uuid(body.profile_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        if profile_uuid is not None:
            await _assert_profile_owner(conn, profile_uuid, user_id)
        row = await conn.fetchrow(
            """
            INSERT INTO saved_prep_cards (user_id, profile_id, request_id, symptom_description, prep_card)
            VALUES ($1, $2, $3, $4, $5::jsonb)
            RETURNING id, request_id, profile_id, symptom_description, prep_card, created_at
            """,
            user_id,
            profile_uuid,
            body.request_id,
            body.symptom_description,
            json.dumps(body.prep_card),
        )
    return _card(row, None, detail=True)


@router.get("")
async def list_cards(clerk_user_id: str = Depends(verify_clerk_token)) -> list[CardSummary]:
    pool = await get_pool()
    if pool is None:
        return []

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        rows = await conn.fetch(
            """
            SELECT c.id, c.request_id, c.profile_id, c.symptom_description, c.prep_card, c.created_at,
                   COALESCE(p.display_name, p.name) AS profile_display_name
            FROM saved_prep_cards c
            LEFT JOIN profiles p ON p.id = c.profile_id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
            """,
            user_id,
        )
    return [_card(row, row["profile_display_name"], detail=False) for row in rows]


@router.get("/{card_id}")
async def get_card(
    card_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> CardDetail:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    card_uuid = _parse_uuid(card_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        row = await conn.fetchrow(
            """
            SELECT c.id, c.request_id, c.profile_id, c.symptom_description, c.prep_card, c.created_at,
                   COALESCE(p.display_name, p.name) AS profile_display_name
            FROM saved_prep_cards c
            LEFT JOIN profiles p ON p.id = c.profile_id
            WHERE c.id = $1 AND c.user_id = $2
            """,
            card_uuid,
            user_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return _card(row, row["profile_display_name"], detail=True)


async def _assert_profile_owner(conn, profile_id: uuid.UUID, user_id: uuid.UUID) -> None:
    row = await conn.fetchrow("SELECT id FROM profiles WHERE id = $1 AND user_id = $2", profile_id, user_id)
    if row is None:
        raise HTTPException(status_code=403, detail="FORBIDDEN")


def _card(row, profile_display_name: str | None, *, detail: bool):
    prep_card = _json_obj(row["prep_card"])
    summary = prep_card.get("summary") if isinstance(prep_card, dict) else None
    quadrant = prep_card.get("quadrant") if isinstance(prep_card, dict) else None
    cls = CardDetail if detail else CardSummary
    data = {
        "card_id": str(row["id"]),
        "request_id": row["request_id"],
        "profile_id": str(row["profile_id"]) if row["profile_id"] else None,
        "profile_display_name": profile_display_name,
        "symptom_description": row["symptom_description"],
        "summary": summary,
        "quadrant": quadrant,
        "created_at": row["created_at"].isoformat(),
    }
    if detail:
        data["prep_card"] = prep_card
    return cls(**data)


def _json_obj(value) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return {}


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")


def _parse_optional_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid profile_id format")
