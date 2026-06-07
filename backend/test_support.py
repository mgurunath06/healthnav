"""Compatibility helpers for deterministic tests on restricted Windows hosts."""

from __future__ import annotations

import importlib.machinery
import json
import sys
import types


def install_orjson_stub_if_native_import_is_blocked() -> None:
    try:
        __import__("orjson")
        return
    except (ImportError, OSError):
        pass

    module = types.ModuleType("orjson")
    module.__spec__ = importlib.machinery.ModuleSpec("orjson", loader=None)
    module.OPT_NON_STR_KEYS = 0
    module.OPT_SERIALIZE_NUMPY = 0
    module.dumps = lambda value, option=None: json.dumps(
        value,
        default=str,
        separators=(",", ":"),
    ).encode()
    sys.modules["orjson"] = module


def install_asyncpg_stub_if_native_import_is_blocked() -> None:
    try:
        __import__("asyncpg")
        return
    except (ImportError, OSError):
        pass

    module = types.ModuleType("asyncpg")

    class Pool:
        async def close(self) -> None:
            return None

    class Connection:
        pass

    async def create_pool(*_args, **_kwargs):
        raise RuntimeError("Database access is unavailable in deterministic unit tests")

    module.Pool = Pool
    module.Connection = Connection
    module.create_pool = create_pool
    sys.modules["asyncpg"] = module
