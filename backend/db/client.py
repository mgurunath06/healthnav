from __future__ import annotations

import os

import asyncpg
from dotenv import load_dotenv

load_dotenv()

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool | None:
    """Return the connection pool, or None if DATABASE_URL is not configured."""
    global _pool
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    if _pool is None:
        _pool = await asyncpg.create_pool(url)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
