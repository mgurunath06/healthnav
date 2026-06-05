from __future__ import annotations

import uuid

from asyncpg import Connection


async def ensure_user(conn: Connection, clerk_user_id: str) -> uuid.UUID:
    """Resolve a Clerk user to HealthNav's internal UUID, creating it if needed."""
    row = await conn.fetchrow(
        """
        INSERT INTO users (clerk_user_id, email, last_active_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (clerk_user_id) DO UPDATE
        SET last_active_at = NOW()
        RETURNING id
        """,
        clerk_user_id,
        f"{clerk_user_id}@clerk.placeholder",
    )
    return row["id"]
