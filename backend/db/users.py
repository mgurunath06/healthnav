from __future__ import annotations

from asyncpg import Connection


def db_user_id(clerk_user_id: str) -> str:
    """Return Clerk's user id as stored in users.id."""
    return clerk_user_id


async def ensure_user(conn: Connection, clerk_user_id: str) -> str:
    user_id = db_user_id(clerk_user_id)
    await conn.execute(
        """
        INSERT INTO users (id, email)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING
        """,
        user_id,
        f"{clerk_user_id}@clerk.placeholder",
    )
    return user_id
