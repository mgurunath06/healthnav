from __future__ import annotations

import json
import uuid
from collections.abc import Iterable

from asyncpg import Connection

_EMPTY_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")


async def ensure_health_memory_schema(conn: Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profile_health_memory (
          user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          profile_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
          summary            TEXT NOT NULL DEFAULT '',
          durable_facts      JSONB NOT NULL DEFAULT '[]'::JSONB,
          recurring_concerns JSONB NOT NULL DEFAULT '[]'::JSONB,
          notable_results    JSONB NOT NULL DEFAULT '[]'::JSONB,
          recent_episodes    JSONB NOT NULL DEFAULT '[]'::JSONB,
          source_counts      JSONB NOT NULL DEFAULT '{}'::JSONB,
          updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_health_memory_owner
          ON profile_health_memory (
            user_id,
            COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::UUID)
          );
        """
    )


async def get_health_memory(
    conn: Connection,
    user_id: str,
    profile_id: uuid.UUID | None,
) -> dict:
    await ensure_health_memory_schema(conn)
    row = await conn.fetchrow(
        """
        SELECT summary, durable_facts, recurring_concerns, notable_results,
               recent_episodes, source_counts, updated_at
        FROM profile_health_memory
        WHERE user_id = $1
          AND COALESCE(profile_id, $3::UUID) = COALESCE($2::UUID, $3::UUID)
        """,
        user_id,
        profile_id,
        _EMPTY_UUID,
    )
    if row is None:
        return {
            "summary": "",
            "durable_facts": [],
            "recurring_concerns": [],
            "notable_results": [],
            "recent_episodes": [],
            "source_counts": {},
        }
    return {
        "summary": row["summary"],
        "durable_facts": _json_list(row["durable_facts"]),
        "recurring_concerns": _json_list(row["recurring_concerns"]),
        "notable_results": _json_list(row["notable_results"]),
        "recent_episodes": _json_list(row["recent_episodes"]),
        "source_counts": _json_obj(row["source_counts"]),
        "updated_at": row["updated_at"].isoformat(),
    }


async def merge_health_memory(
    conn: Connection,
    user_id: str,
    profile_id: uuid.UUID | None,
    *,
    durable_facts: Iterable[str] = (),
    recurring_concerns: Iterable[str] = (),
    notable_results: Iterable[str] = (),
    recent_episodes: Iterable[str] = (),
    source: str,
) -> dict:
    current = await get_health_memory(conn, user_id, profile_id)
    facts = _merge(current["durable_facts"], durable_facts, 30)
    concerns = _merge(current["recurring_concerns"], recurring_concerns, 20)
    results = _merge(current["notable_results"], notable_results, 25)
    episodes = _merge(current["recent_episodes"], recent_episodes, 12)
    counts = current["source_counts"]
    counts[source] = int(counts.get(source, 0)) + 1
    summary = _build_summary(facts, concerns, results, episodes)

    await conn.execute(
        """
        INSERT INTO profile_health_memory
          (user_id, profile_id, summary, durable_facts, recurring_concerns,
           notable_results, recent_episodes, source_counts, updated_at)
        VALUES ($1,$2,$3,$4::JSONB,$5::JSONB,$6::JSONB,$7::JSONB,$8::JSONB,NOW())
        ON CONFLICT (
          user_id,
          (COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::UUID))
        ) DO UPDATE SET
          summary = EXCLUDED.summary,
          durable_facts = EXCLUDED.durable_facts,
          recurring_concerns = EXCLUDED.recurring_concerns,
          notable_results = EXCLUDED.notable_results,
          recent_episodes = EXCLUDED.recent_episodes,
          source_counts = EXCLUDED.source_counts,
          updated_at = NOW()
        """,
        user_id,
        profile_id,
        summary,
        json.dumps(facts),
        json.dumps(concerns),
        json.dumps(results),
        json.dumps(episodes),
        json.dumps(counts),
    )
    return {
        "summary": summary,
        "durable_facts": facts,
        "recurring_concerns": concerns,
        "notable_results": results,
        "recent_episodes": episodes,
        "source_counts": counts,
    }


async def remove_health_memory_items(
    conn: Connection,
    user_id: str,
    profile_id: uuid.UUID | None,
    *,
    durable_facts: Iterable[str] = (),
    notable_results: Iterable[str] = (),
) -> None:
    current = await get_health_memory(conn, user_id, profile_id)
    remove_facts = {_normalise(item) for item in durable_facts}
    remove_results = {_normalise(item) for item in notable_results}
    facts = [item for item in current["durable_facts"] if _normalise(item) not in remove_facts]
    results = [item for item in current["notable_results"] if _normalise(item) not in remove_results]
    summary = _build_summary(
        facts,
        current["recurring_concerns"],
        results,
        current["recent_episodes"],
    )
    await conn.execute(
        """
        UPDATE profile_health_memory
        SET summary = $3,
            durable_facts = $4::JSONB,
            notable_results = $5::JSONB,
            updated_at = NOW()
        WHERE user_id = $1
          AND COALESCE(profile_id, $6::UUID) = COALESCE($2::UUID, $6::UUID)
        """,
        user_id,
        profile_id,
        summary,
        json.dumps(facts),
        json.dumps(results),
        _EMPTY_UUID,
    )


def _merge(existing: Iterable[str], additions: Iterable[str], limit: int) -> list[str]:
    rows: list[str] = []
    seen: set[str] = set()
    for raw in [*additions, *existing]:
        value = " ".join(str(raw).split()).strip()
        key = value.casefold()
        if not value or key in seen:
            continue
        seen.add(key)
        rows.append(value[:500])
    return rows[:limit]


def _normalise(value: str) -> str:
    return " ".join(str(value).casefold().split())


def _build_summary(
    facts: list[str],
    concerns: list[str],
    results: list[str],
    episodes: list[str],
) -> str:
    sections = []
    if facts:
        sections.append("Known background: " + "; ".join(facts[:8]))
    if concerns:
        sections.append("Recurring concerns: " + "; ".join(concerns[:6]))
    if results:
        sections.append("Notable recorded results: " + "; ".join(results[:8]))
    if episodes:
        sections.append("Recent investigations: " + "; ".join(episodes[:12]))
    return "\n".join(sections)[:6000]


def _json_list(value) -> list[str]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    return [str(item) for item in value] if isinstance(value, list) else []


def _json_obj(value) -> dict:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return {}
    return dict(value) if isinstance(value, dict) else {}
