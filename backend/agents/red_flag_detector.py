from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ValidationError

from .openrouter_client import AgentFailure, OpenRouterClient

_MODEL_ROLE = "fast_trio"
_TEMPERATURE = 0.1  # lowest temperature — safety-critical classification

# Exact keys from spec §3.3 — Supervisor and response shapes use these strings
RedFlagKey = Literal[
    "chest_pain",
    "shortness_of_breath",
    "sudden_severe_headache",
    "vision_loss",
    "slurred_speech",
    "one_sided_weakness",
    "severe_abdominal_pain",
    "blood_in_stool_or_vomit",
    "suicidal_ideation",
    "fainting",
]

_SYSTEM_PROMPT = """You are an emergency red flag detector for HealthNav, a symptom preparation tool.

Scan the symptom description for any of these 10 emergency red flags. Return a JSON object:

{
  "red_flags_detected": ["key", ...],
  "is_emergency": true | false,
  "advisory": "string or null"
}

Red flag keys and what they cover:
- "chest_pain"              — chest pain, pressure, tightness, squeezing, heaviness, or burning in the chest
- "shortness_of_breath"     — difficulty breathing, can't catch breath, breathlessness at rest or with minimal activity
- "sudden_severe_headache"  — worst headache of life, thunderclap onset, sudden severe head pain unlike previous headaches
- "vision_loss"             — sudden vision loss, blurry vision, double vision, temporary or partial loss of sight
- "slurred_speech"          — slurred, garbled, or incomprehensible speech; difficulty forming or finding words
- "one_sided_weakness"      — weakness, numbness, tingling, or paralysis on one side of the body or face
- "severe_abdominal_pain"   — severe, excruciating, or sudden-onset abdominal pain; rigid or board-like abdomen
- "blood_in_stool_or_vomit" — blood in stool, bloody or black tarry diarrhea, vomiting blood, coffee-ground vomit
- "suicidal_ideation"       — thoughts of self-harm or suicide, wanting to die, suicidal plans or intent
- "fainting"                — fainting, passing out, loss of consciousness, near-syncope, blackout

Rules:
- Detect by meaning, not exact wording. "My chest feels like someone is sitting on it" → "chest_pain".
- Set is_emergency=true if ANY flag is detected. One flag is enough.
- When is_emergency=true: advisory must be a non-empty string — "Seek immediate medical attention. [brief reason based on flags found]"
- When is_emergency=false: advisory must be null and red_flags_detected must be an empty list [].
- Use ONLY the exact key strings listed above. No variations or synonyms in the list.
- Respond ONLY with a valid JSON object. No markdown fences, no text outside the JSON.
"""


class RedFlagInput(BaseModel):
    symptom_description: str


class RedFlagOutput(BaseModel):
    red_flags_detected: list[RedFlagKey]
    is_emergency: bool
    advisory: str | None


class RedFlagDetector:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def run(self, inp: RedFlagInput) -> RedFlagOutput:
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": inp.symptom_description},
        ]
        data = await self._client.chat(role=_MODEL_ROLE, messages=messages, temperature=_TEMPERATURE)
        try:
            return RedFlagOutput.model_validate(data)
        except ValidationError as exc:
            raise AgentFailure("MALFORMED_JSON") from exc
