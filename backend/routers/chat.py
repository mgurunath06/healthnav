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
from db.profile_context import (
    ensure_profiles_from_message,
    family_risk_considerations,
    list_family_profiles,
    memory_target_profile,
    public_profile,
    resolve_referenced_profiles,
)
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
        family_profiles = await list_family_profiles(conn, user_id)
        family_profiles = await ensure_profiles_from_message(
            conn,
            user_id,
            body.message,
            family_profiles,
        )
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
            else:
                if profile_uuid is None:
                    profile_uuid = await _default_profile_id(conn, user_id)
                if profile_uuid is not None:
                    await _assert_profile_owner(conn, profile_uuid, user_id)
            if row["profile_id"] is None and profile_uuid is not None:
                await conn.execute(
                    "UPDATE chat_conversations SET profile_id = $2 WHERE id = $1",
                    conversation_uuid,
                    profile_uuid,
                )

        referenced_profiles = resolve_referenced_profiles(body.message, family_profiles)
        context = await _build_context(
            conn,
            user_id,
            profile_uuid,
            family_profiles=family_profiles,
            referenced_profiles=referenced_profiles,
        )
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
    reply = _strip_standard_disclaimer(reply)
    memory_updates = _ground_memory_updates(memory_updates, body.message)
    disclaimer_shown = True

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
            memory_profile_id = memory_target_profile(
                profile_uuid,
                referenced_profiles,
            )
            if any(memory_updates.values()) and memory_profile_id is not None:
                await merge_health_memory(
                    conn,
                    user_id,
                    memory_profile_id,
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


async def _build_context(
    conn,
    user_id: str,
    profile_id: uuid.UUID | None,
    *,
    family_profiles: list[dict] | None = None,
    referenced_profiles: list[dict] | None = None,
) -> dict:
    profile = None
    include_unassigned = profile_id is None
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
        include_unassigned = bool(profile and profile["relation"] == "self")

    values = await conn.fetch(
        """
        SELECT ev.value_name, ev.value_raw, ev.unit, ev.reference_range,
               ev.is_abnormal, ev.recorded_date
        FROM extracted_health_values ev
        LEFT JOIN document_upload_logs dul ON dul.id = ev.upload_log_id
        WHERE ev.user_id = $1
          AND (
            $2::UUID IS NULL
            OR ev.profile_id = $2
            OR ($3::BOOLEAN AND ev.profile_id IS NULL)
          )
          AND (dul.is_deleted = FALSE OR ev.upload_log_id IS NULL)
        ORDER BY ev.is_abnormal DESC NULLS LAST,
                 ev.recorded_date DESC NULLS LAST,
                 ev.created_at DESC
        LIMIT 30
        """,
        user_id,
        profile_id,
        include_unassigned,
    )
    findings = await conn.fetch(
        """
        SELECT df.section, df.finding, df.is_abnormal, df.recorded_date
        FROM document_findings df
        LEFT JOIN document_upload_logs dul ON dul.id = df.upload_log_id
        WHERE df.user_id = $1
          AND (
            $2::UUID IS NULL
            OR df.profile_id = $2
            OR ($3::BOOLEAN AND df.profile_id IS NULL)
          )
          AND (dul.is_deleted = FALSE OR df.upload_log_id IS NULL)
        ORDER BY df.is_abnormal DESC NULLS LAST,
                 df.recorded_date DESC NULLS LAST,
                 df.created_at DESC
        LIMIT 25
        """,
        user_id,
        profile_id,
        include_unassigned,
    )
    cards = await conn.fetch(
        """
        SELECT symptom_description, prep_card, created_at
        FROM saved_prep_cards
        WHERE user_id = $1
          AND (
            $2::UUID IS NULL
            OR profile_id = $2
            OR ($3::BOOLEAN AND profile_id IS NULL)
          )
        ORDER BY created_at DESC
        LIMIT 8
        """,
        user_id,
        profile_id,
        include_unassigned,
    )
    recent_user_history = await conn.fetch(
        """
        SELECT cm.content, cm.created_at
        FROM chat_messages cm
        JOIN chat_conversations cc ON cc.id = cm.conversation_id
        WHERE cc.user_id = $1
          AND cm.role = 'user'
          AND (
            $2::UUID IS NULL
            OR cc.profile_id = $2
            OR ($3::BOOLEAN AND cc.profile_id IS NULL)
          )
        ORDER BY cm.created_at DESC
        LIMIT 20
        """,
        user_id,
        profile_id,
        include_unassigned,
    )
    memory = await get_health_memory(conn, user_id, profile_id)
    if include_unassigned and profile_id is not None:
        legacy_memory = await get_health_memory(conn, user_id, None)
        memory = _combine_health_memory(memory, legacy_memory)
    family_profiles = family_profiles or await list_family_profiles(conn, user_id)
    referenced_ids = {
        profile["id"] for profile in (referenced_profiles or [])
        if profile["id"] != profile_id
    }
    family_context = []
    for family_profile in family_profiles:
        family_memory = await get_health_memory(conn, user_id, family_profile["id"])
        item = {
            **public_profile(family_profile),
            "health_summary": family_memory.get("summary") or "",
        }
        if family_profile["id"] in referenced_ids:
            item["health_memory"] = family_memory
        family_context.append(item)
    subject_profile = next(
        (profile for profile in family_profiles if profile["id"] == profile_id),
        None,
    )
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
        "recent_user_health_statements": [
            {
                "content": row["content"],
                "date": row["created_at"].date().isoformat(),
            }
            for row in recent_user_history
            if len(str(row["content"]).strip()) >= 8
            and not _is_diagnostic_question(str(row["content"]))
        ],
        "family_profiles": family_context,
        "family_risk_considerations": family_risk_considerations(
            subject_profile,
            [
                {
                    **profile,
                    "health_summary": item["health_summary"],
                }
                for profile, item in zip(family_profiles, family_context)
            ],
        ),
        "referenced_profile_ids": [str(profile["id"]) for profile in (referenced_profiles or [])],
    }


async def _generate_reply(
    message: str,
    context: dict,
    history: list,
) -> tuple[str, list[str], dict[str, list[str]]]:
    prompt = (
        "You are HealthNav's clinically informed health companion. Respond with the "
        "clarity and structured reasoning of a careful medical professional. Use the "
        "profile's longitudinal memory and records in every relevant response. Never "
        "diagnose, prescribe, provide dosages, treatment plans, or clinical reassurance. "
        "Do not begin with a refusal or a generic statement that you cannot diagnose. "
        "The interface displays a medical disclaimer separately, so never repeat a "
        "boilerplate disclaimer in the reply.\n\n"
        "When asked what condition the person may have, provide a useful non-diagnostic "
        "record synthesis and differential instead of refusing or merely paraphrasing one "
        "report. Review every supplied context category before answering. Clearly separate: "
        "(1) 'Documented in your records' for diagnoses or findings explicitly written in "
        "reports, preserving the report date and severity; (2) 'What these findings may point "
        "to' for plausible clinical explanations, ranked only when the combined evidence "
        "supports ranking; (3) 'Patterns across your history' connecting repeated symptoms, "
        "results, dates, locations, and prior investigations; (4) evidence that does not fit "
        "or information still needed; and (5) prioritized next clinical steps and urgent "
        "warning signs. Use language such as 'could be "
        "consistent with', 'one possibility is', and 'this does not establish a diagnosis'. "
        "Never convert an imaging estimate or report abbreviation into a newly confirmed "
        "diagnosis. For example, preserve wording such as 'the report describes mild PH with "
        "an estimated pressure of 36 mmHg' and note that interpretation depends on the full "
        "echocardiogram and clinical context. Do not end with only 'ask your doctor'; name "
        "the specialty, question, comparison, examination, or test that would clarify it. "
        "If the records are insufficient, say exactly what is known and what would distinguish "
        "the possibilities. For medication or dosage requests, do not provide instructions; "
        "explain what a clinician or pharmacist needs to assess.\n\n"
        "You may surface longitudinal observations only when supported by repeated, dated "
        "evidence. State the count and relevant dates, seasons, locations, or other context. "
        "For unusual candidate correlations such as lunar phase, require at least 3 similar "
        "episodes and explicitly say that coincidence is possible and no causal relationship "
        "is established. Use language such "
        "as 'I notice' or 'this may be a pattern worth discussing', never causal claims "
        "such as a city being bad for the person's body. Do not treat a pattern as a diagnosis.\n\n"
        "Family profiles are independent medical records. Use the primary profile for the "
        "person currently being discussed, and use family_profiles only for relevant family "
        "history or when the user explicitly names another person. Never merge one person's "
        "symptoms, tests, medications, or diagnoses into another person's record. You may "
        "identify evidence-based familial risk considerations, such as discussing diabetes "
        "screening when a parent has diabetes, but account for the target person's age, sex, "
        "existing results, symptoms, and standard clinician-led risk assessment. State which "
        "relative supplies the family-history evidence. If a person reference is ambiguous, "
        "ask the user to identify the profile rather than guessing.\n\n"
        "Memory updates must contain only facts explicitly stated by the user or present "
        "in supplied records. Never store your own inference, diagnosis, or advice.\n\n"
        "Return only JSON with this schema: "
        '{"reply":"string","sources_used":["health_memory|health_values|document_findings|prep_cards|chat_history|family_history|general_knowledge"],'
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
    if _is_diagnostic_question(message) and _is_unhelpful_refusal(reply, context):
        retry_messages = [
            *messages,
            {"role": "assistant", "content": json.dumps(data, default=str)},
            {
                "role": "user",
                "content": (
                    "That answer was an unhelpful generic refusal. Do not claim a diagnosis. "
                    "Instead, use my supplied records to provide an educational differential: "
                    "plausible possibilities, evidence for and against each, missing information, "
                    "red flags, and the next clinical step. Return the required JSON only."
                ),
            },
        ]
        try:
            retry_data = await _client.chat(
                role="companion",
                messages=retry_messages,
                temperature=0.2,
            )
        except Exception:
            logger.exception("Companion differential retry failed")
            retry_data = None

        if isinstance(retry_data, dict):
            retry_reply = str(retry_data.get("reply") or "").strip()
            if retry_reply and not _is_unhelpful_refusal(retry_reply, context):
                return (
                    retry_reply,
                    _normalise_sources(retry_data.get("sources_used")),
                    _normalise_memory_updates(retry_data.get("memory_updates")),
                )

        logger.warning("Companion returned repeated generic diagnosis refusal")
        return (
            _fallback_reply(message, context),
            _context_sources(context),
            _empty_memory_updates(),
        )
    return reply, sources, _normalise_memory_updates(data.get("memory_updates"))


def _normalise_sources(value) -> list[str]:
    allowed = {
        "health_memory",
        "health_values",
        "document_findings",
        "prep_cards",
        "chat_history",
        "family_history",
        "general_knowledge",
    }
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
    clinical_question = _is_diagnostic_question(message)
    has_records = any(
        context.get(key)
        for key in ("extracted_health_values", "document_findings", "past_prep_cards")
    )
    if clinical_question:
        evidence = _fallback_evidence(context)
        if evidence:
            return (
                "I cannot identify one condition reliably from the available information, "
                f"but the relevant evidence I have is: {evidence}. Several conditions can "
                "produce overlapping symptoms, so this does not establish a diagnosis. "
                "A clinician can narrow the possibilities using the symptom timeline, an "
                "examination, and targeted tests. Tell me which symptom concerns you most "
                "and when it began, and I can compare it with this history more precisely."
            )
        return (
            "There is not enough specific symptom or record evidence here to identify the "
            "most plausible possibilities. Tell me the main symptom, when it began, what "
            "makes it better or worse, and any associated symptoms. I can then outline a "
            "non-diagnostic differential and the warning signs that need prompt medical care."
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


def _fallback_evidence(context: dict) -> str:
    items: list[str] = []
    memory = context.get("health_memory") or {}
    summary = str(memory.get("summary") or "").strip()
    if summary:
        items.append(summary[:350])

    for card in (context.get("past_prep_cards") or [])[:2]:
        symptom = str(card.get("symptom_description") or "").strip()
        date = str(card.get("date") or "").strip()
        if symptom:
            items.append(f"{symptom[:160]} ({date})" if date else symptom[:160])

    for value in (context.get("extracted_health_values") or [])[:3]:
        name = str(value.get("value_name") or "").strip()
        raw = str(value.get("value_raw") or "").strip()
        unit = str(value.get("unit") or "").strip()
        if name and raw:
            items.append(" ".join(part for part in (name, raw, unit) if part))

    for statement in (context.get("recent_user_health_statements") or [])[:3]:
        content = str(statement.get("content") or "").strip()
        date = str(statement.get("date") or "").strip()
        if content:
            items.append(f"{content[:180]} ({date})" if date else content[:180])

    return "; ".join(items[:5])


def _strip_standard_disclaimer(reply: str) -> str:
    cleaned = reply.strip()
    while cleaned.casefold().endswith(_DISCLAIMER.casefold()):
        cleaned = cleaned[: -len(_DISCLAIMER)].rstrip()
    return cleaned


def _is_diagnostic_question(message: str) -> bool:
    lowered = message.casefold()
    return any(
        phrase in lowered
        for phrase in (
            "do i have",
            "what do i have",
            "what ailment",
            "which ailment",
            "what condition",
            "which condition",
            "what disease",
            "what is wrong with me",
            "based on my information",
            "basis the information",
            "should i take",
            "am i okay",
            "is this normal",
            "diagnose",
            "diagnosis",
            "dosage",
        )
    )


def _is_unhelpful_refusal(reply: str, context: dict | None = None) -> bool:
    lowered = reply.casefold()
    refusal_markers = (
        "i cannot provide a diagnosis",
        "i can't provide a diagnosis",
        "i cannot diagnose",
        "i can't diagnose",
        "cannot tell you what ailments",
        "can't tell you what ailments",
        "not to act as a medical professional",
        "consult with a doctor or other qualified",
        "only a licensed healthcare professional",
        "i do not have access to any of your health records",
        "i don't have access to any of your health records",
        "i do not have access to your health records",
        "without this information, i cannot offer",
        "please provide me with some details about your health concerns",
    )
    useful_markers = (
        "consistent with",
        "could be",
        "may be",
        "one possibility",
        "most plausible",
        "less likely",
    )
    generic_refusal = any(marker in lowered for marker in refusal_markers) and not any(
        marker in lowered for marker in useful_markers
    )
    false_no_context_claim = (
        _context_has_evidence(context or {})
        and any(
            marker in lowered
            for marker in (
                "do not have access to any of your health records",
                "don't have access to any of your health records",
                "do not have access to your health records",
                "without this information",
                "need details about your symptoms",
            )
        )
    )
    return generic_refusal or false_no_context_claim


def _context_sources(context: dict) -> list[str]:
    sources = []
    if context.get("health_memory"):
        sources.append("health_memory")
    if context.get("extracted_health_values"):
        sources.append("health_values")
    if context.get("document_findings"):
        sources.append("document_findings")
    if context.get("past_prep_cards"):
        sources.append("prep_cards")
    if context.get("recent_user_health_statements"):
        sources.append("chat_history")
    if context.get("family_profiles"):
        sources.append("family_history")
    return sources or ["general_knowledge"]


def _context_has_evidence(context: dict) -> bool:
    memory = context.get("health_memory") or {}
    return bool(
        memory.get("summary")
        or memory.get("durable_facts")
        or memory.get("recurring_concerns")
        or memory.get("notable_results")
        or memory.get("recent_episodes")
        or context.get("extracted_health_values")
        or context.get("document_findings")
        or context.get("past_prep_cards")
        or context.get("recent_user_health_statements")
    )


def _combine_health_memory(primary: dict, legacy: dict) -> dict:
    def combine_rows(key: str, limit: int) -> list:
        rows = []
        seen = set()
        for item in [*(primary.get(key) or []), *(legacy.get(key) or [])]:
            marker = json.dumps(item, sort_keys=True, default=str).casefold()
            if marker not in seen:
                rows.append(item)
                seen.add(marker)
        return rows[:limit]

    durable_facts = combine_rows("durable_facts", 30)
    recurring_concerns = combine_rows("recurring_concerns", 20)
    notable_results = combine_rows("notable_results", 25)
    recent_episodes = combine_rows("recent_episodes", 12)
    summaries = [
        str(value).strip()
        for value in (primary.get("summary"), legacy.get("summary"))
        if str(value or "").strip()
    ]
    return {
        "summary": "\n".join(dict.fromkeys(summaries)),
        "durable_facts": durable_facts,
        "recurring_concerns": recurring_concerns,
        "notable_results": notable_results,
        "recent_episodes": recent_episodes,
        "source_counts": {
            **(legacy.get("source_counts") or {}),
            **(primary.get("source_counts") or {}),
        },
        "updated_at": primary.get("updated_at") or legacy.get("updated_at"),
    }


async def _assert_profile_owner(conn, profile_id: uuid.UUID, user_id: str) -> None:
    row = await conn.fetchrow("SELECT id FROM profiles WHERE id = $1 AND user_id = $2", profile_id, user_id)
    if row is None:
        raise HTTPException(status_code=403, detail="FORBIDDEN")


async def _default_profile_id(conn, user_id: str) -> uuid.UUID | None:
    return await conn.fetchval(
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
