import asyncio
import json
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_RATE_LIMIT_DELAYS = [2.0, 5.0]  # seconds between 429 retries (spec §7.1)

_PLACEHOLDER_KEY = "your_key_here"


def _ollama_base() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")

def _ollama_model() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3.2")


class AgentFailure(Exception):
    """Raised when an agent call exhausts all retries."""
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class OpenRouterClient:
    def __init__(self):
        key = os.getenv("OPENROUTER_API_KEY", "")
        # Fall back to Ollama when the key is absent or still the placeholder
        self._use_ollama = not key or key == _PLACEHOLDER_KEY
        self._api_key = key if not self._use_ollama else ""
        if self._use_ollama:
            print(json.dumps({
                "event": "backend_selection",
                "backend": "ollama",
                "model": _ollama_model(),
                "base_url": _ollama_base(),
                "reason": "OPENROUTER_API_KEY not set — using local Ollama",
            }), flush=True)

    async def chat(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.3,
        timeout: float = 30.0,
    ) -> dict:
        """
        Call OpenRouter chat completions and return parsed JSON.

        Retry policy (spec §7.1):
        - Timeout:       retry once → AgentFailure("LLM_TIMEOUT")
        - Malformed JSON: retry once with stricter prompt → AgentFailure("MALFORMED_JSON")
        - 429:           backoff 2s / 5s, max 2 retries → AgentFailure("RATE_LIMITED")
        - 5xx:           retry once → AgentFailure("SERVER_ERROR")
        """
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
            actual_model = _ollama_model()
        else:
            url = f"{_OPENROUTER_BASE}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://healthnav.app",
                "X-Title": "HealthNav",
            }
            actual_model = model

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={
                        "model": actual_model,
                        "messages": messages,
                        "temperature": temperature,
                        "response_format": {"type": "json_object"},
                    },
                )
        except httpx.TimeoutException:
            raise _TimeoutError()

        if response.status_code == 429:
            raise _RateLimitError()
        if response.status_code >= 500:
            raise _ServerError()
        response.raise_for_status()

        try:
            return response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise AgentFailure("MALFORMED_JSON") from exc


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
