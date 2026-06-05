from __future__ import annotations

from asyncpg import Connection


async def ensure_user(conn: Connection, clerk_user_id: str) -> str:
    """Ensure the Clerk user exists and return its canonical text ID."""
    row = await conn.fetchrow(
        """
        INSERT INTO users (id, clerk_user_id, email, last_active_at)
        VALUES ($1, $1, $2, NOW())
        ON CONFLICT (id) DO UPDATE
        SET clerk_user_id = COALESCE(users.clerk_user_id, EXCLUDED.clerk_user_id),
            last_active_at = NOW()
        RETURNING id
        """,
        clerk_user_id,
        f"{clerk_user_id}@clerk.placeholder",
    )
    return row["id"]
