import asyncio
import json
import os

import httpx
from dotenv import load_dotenv

from .model_config import get_model_chain

load_dotenv()

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_RATE_LIMIT_DELAYS = [2.0, 5.0]  # seconds between 429 retries (spec §9)

_PLACEHOLDER_KEY = "your_key_here"


def _ollama_base() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")


class AgentFailure(Exception):
    """Raised when an agent call exhausts all retries or all models in chain."""
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class OpenRouterClient:
    def __init__(self):
        key = os.getenv("OPENROUTER_API_KEY", "")
        self._use_ollama = not key or key == _PLACEHOLDER_KEY
        self._api_key = key if not self._use_ollama else ""
        if self._use_ollama:
            print(json.dumps({
                "event": "backend_selection",
                "backend": "ollama",
                "base_url": _ollama_base(),
                "reason": "OPENROUTER_API_KEY not set — using local Ollama",
            }), flush=True)

    async def chat(
        self,
        role: str,
        messages: list[dict],
        temperature: float = 0.3,
        timeout: float = 30.0,
    ) -> dict:
        """
        Call the LLM and return parsed JSON.

        Tries each model in the role's chain (spec §2.5):
        - Provider failures (5xx, timeout, rate limit exhausted) → try next model.
        - Malformed JSON → re-prompt same model once, then AgentFailure("MALFORMED_JSON").
        - All models exhausted → AgentFailure("ALL_MODELS_EXHAUSTED").
        """
        chain = get_model_chain(role, self._use_ollama)
        if not chain:
            raise AgentFailure("ALL_MODELS_EXHAUSTED")

        last_error_code = "ALL_MODELS_EXHAUSTED"

        for i, model in enumerate(chain):
            try:
                return await self._try_model(model, messages, temperature, timeout)
            except AgentFailure as exc:
                last_error_code = exc.code
                if exc.code == "MALFORMED_JSON":
                    # Prompt issue — don't switch models
                    raise
                # Provider failure — log and try next
                next_model = chain[i + 1] if i + 1 < len(chain) else None
                self._log_fallback(role, model, next_model, exc.code)
                continue

        raise AgentFailure(last_error_code)

    async def _try_model(
        self,
        model: str,
        messages: list[dict],
        temperature: float,
        timeout: float,
    ) -> dict:
        """Run one model with its own retry budget (timeout x1, rate-limit x2, 5xx x1)."""
        current_messages = list(messages)
        rate_limit_count = 0
        request_fail_count = 0
        json_fail_count = 0

        while True:
            try:
                content = await self._post(model, current_messages, temperature, timeout)
            except _RateLimitError:
                if rate_limit_count >= 2:
                    raise AgentFailure("RATE_LIMITED")
                await asyncio.sleep(_RATE_LIMIT_DELAYS[rate_limit_count])
                rate_limit_count += 1
                continue
            except _TimeoutError:
                if request_fail_count >= 1:
                    raise AgentFailure("LLM_TIMEOUT")
                request_fail_count += 1
                continue
            except _ServerError:
                if request_fail_count >= 1:
                    raise AgentFailure("SERVER_ERROR")
                request_fail_count += 1
                continue

            try:
                return json.loads(content)
            except (json.JSONDecodeError, ValueError):
                if json_fail_count >= 1:
                    raise AgentFailure("MALFORMED_JSON")
                current_messages = _append_json_reminder(current_messages)
                json_fail_count += 1

    async def _post(
        self,
        model: str,
        messages: list[dict],
        temperature: float,
        timeout: float,
    ) -> str:
        if self._use_ollama:
            url = f"{_ollama_base()}/chat/completions"
            headers = {"Content-Type": "application/json"}
        else:
            url = f"{_OPENROUTER_BASE}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://healthnav.app",
                "X-Title": "HealthNav",
            }

        body: dict = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        # Ollama does not support response_format (spec §2.3)
        if not self._use_ollama:
            body["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=body)
        except httpx.TimeoutException:
            raise _TimeoutError()
        except httpx.RequestError:
            raise _ServerError()

        if response.status_code == 429:
            raise _RateLimitError()
        if response.status_code >= 500:
            raise _ServerError()
        if response.status_code >= 400:
            raise _ServerError()

        try:
            content = response.json()["choices"][0]["message"]["content"]
            return _extract_json(_strip_think_tags(content))
        except (KeyError, IndexError) as exc:
            raise AgentFailure("MALFORMED_JSON") from exc

    def _log_fallback(
        self,
        role: str,
        failed_model: str,
        next_model: str | None,
        reason: str,
    ) -> None:
        print(json.dumps({
            "event_type": "model_fallback",
            "role": role,
            "failed_model": failed_model,
            "next_model": next_model,
            "reason": reason,
        }), flush=True)


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks emitted by reasoning models (e.g. Qwen3)."""
    import re
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _extract_json(text: str) -> str:
    """Extract JSON from potential markdown code fences."""
    import re
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()
    return text


def _append_json_reminder(messages: list[dict]) -> list[dict]:
    return messages + [{
        "role": "user",
        "content": (
            "Your previous response was not valid JSON. "
            "Reply ONLY with a valid JSON object — no markdown, no explanation."
        ),
    }]


class _RateLimitError(Exception):
    pass

class _TimeoutError(Exception):
    pass

class _ServerError(Exception):
    pass
