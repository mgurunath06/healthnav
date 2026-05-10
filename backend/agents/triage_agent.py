from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ValidationError

from .openrouter_client import AgentFailure, OpenRouterClient

_MODEL = "anthropic/claude-haiku-4-5"
_TEMPERATURE = 0.2

# Supervisor routing depends on these exact strings (spec §4.1)
_CATEGORIES = (
    "cardiovascular | musculoskeletal | neurological | respiratory | "
    "gastrointestinal | dermatological | urological | mental_health | general"
)

_SYSTEM_PROMPT = f"""You are a medical triage classifier. Given a symptom description, return a JSON object with exactly these fields:

{{
  "urgency_level": "emergency" | "urgent" | "routine",
  "primary_symptom_category": one of [{_CATEGORIES}],
  "reasoning": "1-3 sentences explaining your classification"
}}

Urgency level definitions:
- "emergency" — life-threatening, requires immediate ER: chest pain, stroke signs (facial droop / arm weakness / slurred speech), severe breathing difficulty, uncontrolled bleeding, loss of consciousness, suicidal ideation with plan
- "urgent" — needs prompt care but not immediate ER: high fever, moderate-severe uncontrolled pain, worsening infection, significant injury
- "routine" — scheduled appointment appropriate: mild, chronic, or stable symptoms

Rules:
- Use ONLY the listed category values. Choose the closest match; default to "general" if uncertain.
- You are NOT diagnosing — only classifying urgency for doctor-visit preparation.
- Respond ONLY with a valid JSON object. No markdown fences, no text outside the JSON.
"""


class TriageInput(BaseModel):
    symptom_description: str


class TriageOutput(BaseModel):
    urgency_level: Literal["emergency", "urgent", "routine"]
    primary_symptom_category: str
    reasoning: str


class TriageAgent:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def run(self, inp: TriageInput) -> TriageOutput:
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": inp.symptom_description},
        ]
        data = await self._client.chat(model=_MODEL, messages=messages, temperature=_TEMPERATURE)
        try:
            return TriageOutput.model_validate(data)
        except ValidationError as exc:
            raise AgentFailure("MALFORMED_JSON") from exc
