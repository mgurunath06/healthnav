from __future__ import annotations

import os

# Cost-aware production routing. Stable model slugs are preferred over previews.
_OPENROUTER_CHAINS: dict[str, list[str]] = {
    "screening": [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.5-pro",
    ],
    "fast_trio": [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.5-pro",
    ],
    "deep_dive": [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.5-pro",
    ],
    "deep_dive_premium": [
        "google/gemini-2.5-pro",
        "anthropic/claude-sonnet-4-5",
        "google/gemini-2.5-flash",
    ],
    "assembler": [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.5-pro",
    ],
    "assembler_premium": [
        "anthropic/claude-sonnet-4-5",
        "google/gemini-2.5-pro",
        "google/gemini-2.5-flash",
    ],
    "doc_extraction": [
        "google/gemini-2.5-flash",
        "google/gemini-2.5-pro",
    ],
    "companion": [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "google/gemini-2.5-pro",
    ],
}

_OLLAMA_CHAINS: dict[str, list[str]] = {
    "screening": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "fast_trio": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "deep_dive": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "deep_dive_premium": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "assembler": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "assembler_premium": ["gemma4:latest", "qwen3:14b", "llama3.1:8b"],
    "doc_extraction": ["llama3.1:8b"],
    "companion": ["llama3.1:8b"],
}

_OPENROUTER_ENV_VARS: dict[str, str] = {
    "screening": "HEALTHNAV_SCREENING_MODELS",
    "fast_trio": "HEALTHNAV_FAST_TRIO_MODELS",
    "deep_dive": "HEALTHNAV_DEEP_DIVE_MODELS",
    "deep_dive_premium": "HEALTHNAV_DEEP_DIVE_PREMIUM_MODELS",
    "assembler": "HEALTHNAV_ASSEMBLER_MODELS",
    "assembler_premium": "HEALTHNAV_ASSEMBLER_PREMIUM_MODELS",
    "doc_extraction": "HEALTHNAV_DOC_EXTRACTION_MODELS",
    "companion": "HEALTHNAV_COMPANION_MODELS",
}

_ROLE_MAX_TOKENS: dict[str, int] = {
    "screening": 450,
    "fast_trio": 350,
    "deep_dive": 800,
    "deep_dive_premium": 1000,
    "assembler": 1100,
    "assembler_premium": 1500,
    "doc_extraction": 1800,
    "companion": 600,
}


def get_model_chain(role: str, use_ollama: bool) -> list[str]:
    """Return the ordered model chain for a role and provider."""
    if use_ollama:
        return list(_OLLAMA_CHAINS.get(role, ["gemma4:latest", "llama3.1:8b"]))

    env_key = _OPENROUTER_ENV_VARS.get(role)
    if env_key:
        override = os.getenv(env_key, "").strip()
        if override:
            return [model.strip() for model in override.split(",") if model.strip()]

    return list(_OPENROUTER_CHAINS.get(role, []))


def get_max_tokens(role: str) -> int:
    """Return the output-token ceiling for a role."""
    return _ROLE_MAX_TOKENS.get(role, 800)
