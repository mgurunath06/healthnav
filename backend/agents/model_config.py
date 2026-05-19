from __future__ import annotations

import os

# OpenRouter chains — ordered primary → backup 1 → backup 2 (spec §2.2)
_OPENROUTER_CHAINS: dict[str, list[str]] = {
    "fast_trio": [
        "anthropic/claude-3.5-haiku",
        "anthropic/claude-3-haiku",
        "google/gemini-2.0-flash",
    ],
    "deep_dive": [
        "google/gemini-2.0-flash",
        "anthropic/claude-3.5-haiku",
        "anthropic/claude-3-haiku",
    ],
    "assembler": [
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.0-flash",
    ],
}

# Ollama chains — ordered best → worst quality (spec §2.2)
# Same order for all roles: start with the most capable locally-available model.
_OLLAMA_CHAINS: dict[str, list[str]] = {
    "fast_trio": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "deep_dive": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "assembler": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
}

# Env vars that override the OpenRouter chain for each role (comma-separated model IDs).
# Example: HEALTHNAV_FAST_TRIO_MODELS=anthropic/claude-haiku-4-5,anthropic/claude-haiku-3-5
_OPENROUTER_ENV_VARS: dict[str, str] = {
    "fast_trio": "HEALTHNAV_FAST_TRIO_MODELS",
    "deep_dive": "HEALTHNAV_DEEP_DIVE_MODELS",
    "assembler": "HEALTHNAV_ASSEMBLER_MODELS",
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
