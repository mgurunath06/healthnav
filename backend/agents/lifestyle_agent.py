from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ValidationError

from .deep_dive_agent import FollowUpQuestion, StructuredFindings
from .openrouter_client import AgentFailure, OpenRouterClient

_MODEL_ROLE = "deep_dive"
_TEMPERATURE = 0.6

_SYSTEM_PROMPT = """You are the Lifestyle agent for HealthNav, a doctor visit preparation tool.

Your job: given a symptom description and structured clinical findings, assess how lifestyle factors may relate to the reported symptoms. Extract what can be inferred from context, identify correlations, generate doctor-facing questions, and ask the user targeted follow-up questions only when lifestyle data that is genuinely relevant to their symptoms is missing.

--- Output format ---
Respond ONLY with a valid JSON object — no markdown fences, no text outside the JSON.

{
  "lifestyle_factors": {
    "sleep_quality": "good" | "poor" | "unknown",
    "estimated_sleep_hours": <number or null>,
    "screen_time_hours": <number or null>,
    "stress_level": "low" | "moderate" | "high" | "unknown",
    "exercise_frequency": "regular" | "occasional" | "none" | "unknown",
    "diet_quality": "good" | "poor" | "unknown"
  },
  "lifestyle_correlations": [
    "Plain-English sentence linking a lifestyle factor to a reported symptom"
  ],
  "follow_up_questions_for_doctor": [
    "Question the user should ask their doctor about lifestyle and this symptom"
  ],
  "needs_followup": true | false,
  "followup_questions": [
    {
      "id": "unique_snake_case_id",
      "question": "plain English question for the user",
      "type": "single_choice" | "multi_choice" | "yes_no" | "scale",
      "choices": [{"value": "snake_case", "label": "Display text"}],
      "scale_min": 1,
      "scale_max": 10,
      "scale_min_label": "No stress",
      "scale_max_label": "Extreme stress",
      "allow_other_text": true
    }
  ]
}

--- lifestyle_factors rules ---
- Infer from context wherever possible (e.g. "working from home all day" → screen_time_hours likely high).
- Use "unknown" / null only when genuinely not inferable from the description or findings.
- estimated_sleep_hours and screen_time_hours are numbers (e.g. 7.5) or null — not strings.

--- lifestyle_correlations rules ---
- Only list correlations that are plausible given the reported symptoms and findings.
- Each entry is one plain-English sentence: "<lifestyle factor> may be contributing to <symptom>."
- Empty array [] if no plausible correlations exist.
- Do not speculate beyond what the findings support.

--- follow_up_questions_for_doctor rules ---
- 2–4 questions the user should raise with their doctor specifically about lifestyle-symptom links.
- Phrased from the patient's perspective: "Should I track my screen time to see if it affects my headaches?"
- Empty array [] if lifestyle appears unrelated to the symptoms.

--- needs_followup rules ---
- Set true ONLY when: (a) a lifestyle factor is "unknown" AND (b) that factor is plausibly relevant to the reported symptoms.
- Do NOT ask follow-up questions about lifestyle factors that are clearly unrelated to the symptoms.
- Example: for headaches + screen/work mentions, ask about screen time and stress but NOT about diet.
- If enough lifestyle context can be inferred from the description and findings, set false.

--- followup_questions rules ---
- Required when needs_followup=true, otherwise empty array [].
- Generate 2–4 questions maximum. Never ask about factors already described in the input.
- single_choice / multi_choice → populate choices[]. Omit scale fields.
- yes_no → fixed choices: [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]
- scale → populate scale_min, scale_max, scale_min_label, scale_max_label. Omit choices[].
- allow_other_text: true for single/multi choice; false for yes_no and scale.

--- Question type rules ---
- Prefer scale for sleep hours, screen hours, stress level.
- Prefer single_choice for exercise frequency, diet quality.
- Prefer yes_no for simple yes/no facts ("Do you work night shifts?").

--- Examples ---
Symptoms: "headaches every afternoon, work from home"
Findings: triggers=["screen use", "work"], associated_symptoms=["fatigue"]
→ screen_time_hours: ask (unknown but relevant)
→ stress_level: ask (work-from-home context, plausible)
→ diet_quality: do NOT ask (not relevant to afternoon headaches)
→ correlation: "High screen time may be contributing to afternoon headaches."

Symptoms: "knee pain after running"
Findings: triggers=["running"], associated_symptoms=[]
→ exercise_frequency: infer "regular" from running context
→ sleep/stress/diet: do NOT ask (not relevant to exercise-induced knee pain)
→ needs_followup: false (enough context)"""


class LifestyleFactors(BaseModel):
    sleep_quality: Literal["good", "poor", "unknown"] = "unknown"
    estimated_sleep_hours: float | None = None
    screen_time_hours: float | None = None
    stress_level: Literal["low", "moderate", "high", "unknown"] = "unknown"
    exercise_frequency: Literal["regular", "occasional", "none", "unknown"] = "unknown"
    diet_quality: Literal["good", "poor", "unknown"] = "unknown"


class LifestyleInput(BaseModel):
    symptom_description: str
    deep_dive_findings: StructuredFindings
    personal_context: dict | None = None


class LifestyleOutput(BaseModel):
    lifestyle_factors: LifestyleFactors
    lifestyle_correlations: list[str] = []
    follow_up_questions_for_doctor: list[str] = []
    needs_followup: bool
    followup_questions: list[FollowUpQuestion] = []


class LifestyleAgent:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def run(self, inp: LifestyleInput) -> LifestyleOutput:
        findings_json = json.dumps(inp.deep_dive_findings.model_dump(), indent=2)
        user_content = (
            f"Symptom description: {inp.symptom_description}\n\n"
            f"Clinical findings from deep-dive:\n{findings_json}"
            f"{_personal_context_section(inp.personal_context)}"
        )

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]
        data = await self._client.chat(role=_MODEL_ROLE, messages=messages, temperature=_TEMPERATURE)
        try:
            return LifestyleOutput.model_validate(data)
        except ValidationError as exc:
            raise AgentFailure("MALFORMED_JSON") from exc


def _personal_context_section(context: dict | None) -> str:
    if not context:
        return ""
    summary = context.get("summary") or "No prior profile-specific summary."
    return (
        "\n\nRelevant personal health memory:\n"
        f"Subject profile: {context.get('profile') or {}}\n"
        f"{summary}\n"
        f"Family history summaries: {context.get('family_history') or []}\n"
        f"Family-risk considerations: {context.get('family_risk_considerations') or []}\n"
        f"Current setting: {context.get('current_context') or {}}\n"
        "Do not merge a relative's condition into the subject's history. Family conditions "
        "may support a clinician-led screening discussion when age and risk make it relevant.\n"
        "Mention a possible pattern only when repeated dated episodes support it. Require at least "
        "three similar episodes for unusual correlations such as lunar phase and explicitly note that "
        "coincidence is possible. State the count and phrase it as something to discuss with a licensed "
        "clinician, never as a diagnosis or causal claim."
    )
