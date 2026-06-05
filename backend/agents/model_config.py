from __future__ import annotations

import os

# OpenRouter chains — ordered primary → backup 1 → backup 2 (spec §2.2)
#
# Verified working as of 2026-05-31:
#   gemini-2.5-pro-preview   ✓  (reliable across all roles)
#   claude-sonnet-4-5        ✓  (assembler primary, no fallbacks seen)
#   gemini-2.5-flash-preview ✗  (consistent SERVER_ERROR — kept as last-resort only)
#   claude-haiku-4-5-20251001 ✗ (date suffix is not a valid OpenRouter slug)
#   claude-haiku-3-5         ✗  (unavailable on this key)
_OPENROUTER_CHAINS: dict[str, list[str]] = {
    "fast_trio": [
        "google/gemini-2.5-pro-preview",     # reliable primary
        "anthropic/claude-sonnet-4-5",       # backup
        "anthropic/claude-haiku-4-5",        # last resort
    ],
    "deep_dive": [
        "google/gemini-2.5-pro-preview",     # promoted to primary (flash fails)
        "anthropic/claude-sonnet-4-5",       # backup
        "google/gemini-2.5-flash-preview",   # last resort
    ],
    "assembler": [
        "anthropic/claude-sonnet-4-5",       # unchanged — confirmed working
        "google/gemini-2.5-pro-preview",     # unchanged
        "google/gemini-2.5-flash-preview",   # last resort
    ],
    "doc_extraction": [
        "google/gemini-2.5-pro-preview",     # promoted to primary (flash fails)
        "google/gemini-2.5-flash-preview",   # last resort
    ],
    "companion": [
        "google/gemini-2.5-pro-preview",
        "anthropic/claude-sonnet-4-5",
        "google/gemini-2.5-flash-preview",
    ],
}

# Ollama chains — ordered best → worst quality (spec §2.2)
# Same order for all roles: start with the most capable locally-available model.
_OLLAMA_CHAINS: dict[str, list[str]] = {
    "fast_trio": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "deep_dive": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "assembler": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "doc_extraction": ["llama3.1:8b"],
    "companion": ["llama3.1:8b"],
}

# Env vars that override the OpenRouter chain for each role (comma-separated model IDs).
# Example: HEALTHNAV_FAST_TRIO_MODELS=anthropic/claude-haiku-4-5-20251001,anthropic/claude-haiku-3-5
_OPENROUTER_ENV_VARS: dict[str, str] = {
    "fast_trio": "HEALTHNAV_FAST_TRIO_MODELS",
    "deep_dive": "HEALTHNAV_DEEP_DIVE_MODELS",
    "assembler": "HEALTHNAV_ASSEMBLER_MODELS",
    "doc_extraction": "HEALTHNAV_DOC_EXTRACTION_MODELS",
    "companion": "HEALTHNAV_COMPANION_MODELS",
}


def get_model_chain(role: str, use_ollama: bool) -> list[str]:
    """Return the ordered model chain for a role and provider."""
    if use_ollama:
        return list(_OLLAMA_CHAINS.get(role, ["gemma4:latest", "llama3.1:8b"]))

    env_key = _OPENROUTER_ENV_VARS.get(role)
    if env_key:
        override = os.getenv(env_key, "").strip()
        if override:
            return [m.strip() for m in override.split(",") if m.strip()]

    return list(_OPENROUTER_CHAINS.get(role, []))
