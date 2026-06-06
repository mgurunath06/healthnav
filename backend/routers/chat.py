from __future__ import annotations

import json
import logging
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from agents.openrouter_client import AgentFailure, OpenRouterClient
from auth import verify_clerk_token
from db.client import get_pool
from db.health_memory import get_health_memory, merge_health_memory
from db.users import ensure_user

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)

_client = OpenRouterClient()
_DISCLAIMER = "This is general wellness information - not medical advice. Please discuss with your doctor."


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None
    profile_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    disclaimer_shown: bool
    sources_used: list[str]


@router.post("")
async def post_chat(
    body: ChatRequest,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> ChatResponse:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    conversation_uuid = _parse_optional_uuid(body.conversation_id)
    profile_uuid = _parse_optional_uuid(body.profile_id)

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        if profile_uuid is None and conversation_uuid is None:
            profile_uuid = await conn.fetchval(
                """
                SELECT id
                FROM profiles
                WHERE user_id = $1
                ORDER BY CASE
                  WHEN COALESCE(relation, relationship) = 'self' THEN 0
                  ELSE 1
                END, created_at ASC
                LIMIT 1
                """,
                user_id,
            )
        if profile_uuid is not None:
            await _assert_profile_owner(conn, profile_uuid, user_id)
        if conversation_uuid is None:
            title = _title(body.message)
            row = await conn.fetchrow(
                """
                INSERT INTO chat_conversations (user_id, profile_id, title)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                user_id,
                profile_uuid,
                title,
            )
            conversation_uuid = row["id"]
        else:
            row = await conn.fetchrow(
                "SELECT id, profile_id FROM chat_conversations WHERE id = $1 AND user_id = $2",
                conversation_uuid,
                user_id,
            )
            if row is None:
                raise HTTPException(status_code=404, detail="NOT_FOUND")
            if row["profile_id"] is not None:
                profile_uuid = row["profile_id"]
            elif profile_uuid is not None:
                await conn.execute(
                    "UPDATE chat_conversations SET profile_id = $2 WHERE id = $1",
                    conversation_uuid,
                    profile_uuid,
                )

        context = await _build_context(conn, user_id, profile_uuid)
        history = await conn.fetch(
            """
            SELECT role, content
            FROM chat_messages
            WHERE conversation_id = $1
            ORDER BY created_at DESC
            LIMIT 10
            """,
            conversation_uuid,
        )

    reply, sources, memory_updates = await _generate_reply(
        body.message,
        context,
        list(reversed(history)),
    )
    memory_updates = _ground_memory_updates(memory_updates, body.message)
    disclaimer_shown = True
    if _DISCLAIMER not in reply:
        reply = f"{reply.rstrip()}\n\n{_DISCLAIMER}"

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO chat_messages (conversation_id, role, content, disclaimer_shown, sources_used)
                VALUES ($1, 'user', $2, false, '[]'::jsonb)
                """,
                conversation_uuid,
                body.message,
            )
            await conn.execute(
                """
                INSERT INTO chat_messages (conversation_id, role, content, disclaimer_shown, sources_used)
                VALUES ($1, 'assistant', $2, $3, $4::jsonb)
                """,
                conversation_uuid,
                reply,
                disclaimer_shown,
                json.dumps(sources),
            )
            await conn.execute(
                "UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1",
                conversation_uuid,
            )
            if any(memory_updates.values()):
                await merge_health_memory(
                    conn,
                    user_id,
                    profile_uuid,
                    durable_facts=memory_updates["durable_facts"],
                    recurring_concerns=memory_updates["recurring_concerns"],
                    recent_episodes=memory_updates["recent_episodes"],
                    source="chat",
                )

    return ChatResponse(
        conversation_id=str(conversation_uuid),
        reply=reply,
        disclaimer_shown=disclaimer_shown,
        sources_used=sources,
    )


@router.get("")
async def list_conversations(clerk_user_id: str = Depends(verify_clerk_token)) -> list[dict]:
    pool = await get_pool()
    if pool is None:
        return []

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        rows = await conn.fetch(
            """
            SELECT id, title, profile_id, created_at, updated_at
            FROM chat_conversations
            WHERE user_id = $1
            ORDER BY updated_at DESC
            """,
            user_id,
        )
    return [
        {
            "conversation_id": str(row["id"]),
            "title": row["title"],
            "profile_id": str(row["profile_id"]) if row["profile_id"] else None,
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
        for row in rows
    ]


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> dict:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    conversation_uuid = _parse_uuid(conversation_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        conv = await conn.fetchrow(
            "SELECT id, title, profile_id FROM chat_conversations WHERE id = $1 AND user_id = $2",
            conversation_uuid,
            user_id,
        )
        if conv is None:
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        messages = await conn.fetch(
            """
            SELECT role, content, disclaimer_shown, created_at
            FROM chat_messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            """,
            conversation_uuid,
        )
    return {
        "conversation_id": str(conv["id"]),
        "title": conv["title"],
        "profile_id": str(conv["profile_id"]) if conv["profile_id"] else None,
        "messages": [
            {
                "role": row["role"],
                "content": row["content"],
                "disclaimer_shown": row["disclaimer_shown"],
                "created_at": row["created_at"].isoformat(),
            }
            for row in messages
        ],
    }


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> dict:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    conversation_uuid = _parse_uuid(conversation_id)
    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        result = await conn.execute(
            "DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2",
            conversation_uuid,
            user_id,
        )
    if result.endswith("0"):
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return {"deleted": True, "conversation_id": conversation_id}


async def _build_context(conn, user_id: str, profile_id: uuid.UUID | None) -> dict:
    profile = None
    if profile_id is not None:
        profile = await conn.fetchrow(
            """
            SELECT COALESCE(display_name, name, 'Me') AS display_name,
                   date_of_birth, COALESCE(relation, relationship, 'self') AS relation
            FROM profiles
            WHERE id = $1 AND user_id = $2
            """,
            profile_id,
            user_id,
        )

    values = await conn.fetch(
        """
        SELECT ev.value_name, ev.value_raw, ev.unit, ev.reference_range,
               ev.is_abnormal, ev.recorded_date
        FROM extracted_health_values ev
        LEFT JOIN document_upload_logs dul ON dul.id = ev.upload_log_id
        WHERE ev.user_id = $1
          AND ($2::UUID IS NULL OR ev.profile_id = $2)
          AND (dul.is_deleted = FALSE OR ev.upload_log_id IS NULL)
          AND (ev.recorded_date IS NULL OR ev.recorded_date >= CURRENT_DATE - INTERVAL '90 days')
        ORDER BY ev.is_abnormal DESC NULLS LAST,
                 ev.recorded_date DESC NULLS LAST,
                 ev.created_at DESC
        LIMIT 15
        """,
        user_id,
        profile_id,
    )
    findings = await conn.fetch(
        """
        SELECT df.section, df.finding, df.is_abnormal, df.recorded_date
        FROM document_findings df
        LEFT JOIN document_upload_logs dul ON dul.id = df.upload_log_id
        WHERE df.user_id = $1
          AND ($2::UUID IS NULL OR df.profile_id = $2)
          AND (dul.is_deleted = FALSE OR df.upload_log_id IS NULL)
        ORDER BY df.is_abnormal DESC NULLS LAST,
                 df.recorded_date DESC NULLS LAST,
                 df.created_at DESC
        LIMIT 10
        """,
        user_id,
        profile_id,
    )
    cards = await conn.fetch(
        """
        SELECT symptom_description, prep_card, created_at
        FROM saved_prep_cards
        WHERE user_id = $1 AND ($2::UUID IS NULL OR profile_id = $2)
        ORDER BY created_at DESC
        LIMIT 3
        """,
        user_id,
        profile_id,
    )
    memory = await get_health_memory(conn, user_id, profile_id)
    return {
        "profile": dict(profile) if profile else None,
        "health_memory": memory,
        "extracted_health_values": [dict(v) for v in values],
        "document_findings": [dict(f) for f in findings],
        "past_prep_cards": [
            {
                "symptom_description": c["symptom_description"],
                "quadrant": _json_obj(c["prep_card"]).get("quadrant"),
                "date": c["created_at"].date().isoformat(),
            }
            for c in cards
        ],
    }


async def _generate_reply(
    message: str,
    context: dict,
    history: list,
) -> tuple[str, list[str], dict[str, list[str]]]:
    prompt = (
        "You are HealthNav's clinically informed health companion. Respond with the "
        "clarity and structured questioning of a careful medical professional, while "
        "being explicit that you are not a clinician and cannot diagnose. Use the "
        "profile's longitudinal memory and records in every relevant response. Never "
        "diagnose, prescribe, provide dosages, treatment plans, or clinical reassurance. "
        "If asked for diagnosis, medication advice, or whether they are okay, redirect "
        "to a licensed clinician and offer useful questions or data points to discuss.\n\n"
        "You may surface longitudinal observations only when supported by repeated, dated "
        "evidence. State the count and relevant dates, seasons, locations, or other context. "
        "For unusual candidate correlations such as lunar phase, require at least 3 similar "
        "episodes and explicitly say that coincidence is possible and no causal relationship "
        "is established. Use language such "
        "as 'I notice' or 'this may be a pattern worth discussing', never causal claims "
        "such as a city being bad for the person's body. Do not treat a pattern as a diagnosis.\n\n"
        "Memory updates must contain only facts explicitly stated by the user or present "
        "in supplied records. Never store your own inference, diagnosis, or advice.\n\n"
        "Return only JSON with this schema: "
        '{"reply":"string","sources_used":["health_memory|health_values|document_findings|prep_cards|general_knowledge"],'
        '"memory_updates":{"durable_facts":["string"],"recurring_concerns":["string"],'
        '"recent_episodes":["string"]}}.\n\n'
        f"User health context:\n{json.dumps(context, default=str)}"
    )
    messages = [{"role": "system", "content": prompt}]
    messages.extend({"role": row["role"], "content": row["content"]} for row in history)
    messages.append({"role": "user", "content": message})

    try:
        data = await _client.chat(role="companion", messages=messages, temperature=0.3)
    except AgentFailure as exc:
        logger.warning("Companion model failure: %s", exc.code)
        return (_fallback_reply(message, context), ["general_knowledge"], _empty_memory_updates())
    except Exception:
        logger.exception("Unexpected companion generation failure")
        return (_fallback_reply(message, context), ["general_knowledge"], _empty_memory_updates())

    if not isinstance(data, dict):
        logger.warning("Companion returned a non-object JSON response")
        return (_fallback_reply(message, context), ["general_knowledge"], _empty_memory_updates())

    reply = str(data.get("reply") or "").strip()
    sources = _normalise_sources(data.get("sources_used"))
    if not reply:
        return (
            _fallback_reply(message, context),
            ["general_knowledge"],
            _empty_memory_updates(),
        )
    return reply, sources, _normalise_memory_updates(data.get("memory_updates"))


def _normalise_sources(value) -> list[str]:
    allowed = {"health_memory", "health_values", "document_findings", "prep_cards", "general_knowledge"}
    if not isinstance(value, list):
        return ["general_knowledge"]
    sources = [str(source) for source in value if str(source) in allowed]
    return sources or ["general_knowledge"]


def _normalise_memory_updates(value) -> dict[str, list[str]]:
    result = _empty_memory_updates()
    if not isinstance(value, dict):
        return result
    for key in result:
        rows = value.get(key)
        if isinstance(rows, list):
            result[key] = [
                " ".join(str(item).split())[:500]
                for item in rows[:8]
                if str(item).strip()
            ]
    return result


def _empty_memory_updates() -> dict[str, list[str]]:
    return {
        "durable_facts": [],
        "recurring_concerns": [],
        "recent_episodes": [],
    }


def _ground_memory_updates(
    updates: dict[str, list[str]],
    user_message: str,
) -> dict[str, list[str]]:
    source_tokens = _meaningful_tokens(user_message)
    grounded = _empty_memory_updates()
    for key, rows in updates.items():
        for row in rows:
            row_tokens = _meaningful_tokens(row)
            required = 1 if len(row_tokens) <= 3 else 2
            if len(source_tokens.intersection(row_tokens)) >= required:
                grounded[key].append(row)
    return grounded


def _meaningful_tokens(value: str) -> set[str]:
    ignored = {
        "about", "after", "before", "been", "from", "have", "having",
        "this", "that", "with", "were", "when", "where", "which", "your",
    }
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.casefold())
        if len(token) >= 3 and token not in ignored
    }


def _fallback_reply(message: str, context: dict) -> str:
    clinical_question = any(
        phrase in message.lower()
        for phrase in (
            "do i have",
            "should i take",
            "am i okay",
            "is this normal",
            "what is wrong with me",
            "diagnose",
            "dosage",
        )
    )
    has_records = any(
        context.get(key)
        for key in ("extracted_health_values", "document_findings", "past_prep_cards")
    )
    if clinical_question:
        return (
            "That question is best answered by your doctor, who can evaluate you directly. "
            "I can still help you organize your symptoms, recent results, and questions to discuss with them."
        )
    if has_records:
        return (
            "I could not complete a full review of your records just now. "
            "You can ask me to summarize a specific result or help prepare questions for your doctor."
        )
    return (
        "I could not complete the full response just now. "
        "I can still help with general wellness routines or prepare questions for your doctor."
    )


async def _assert_profile_owner(conn, profile_id: uuid.UUID, user_id: str) -> None:
    row = await conn.fetchrow("SELECT id FROM profiles WHERE id = $1 AND user_id = $2", profile_id, user_id)
    if row is None:
        raise HTTPException(status_code=403, detail="FORBIDDEN")


def _title(message: str) -> str:
    cleaned = " ".join(message.split())
    return cleaned[:77] + "..." if len(cleaned) > 80 else cleaned


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
        raise HTTPException(status_code=422, detail="Invalid UUID format")
