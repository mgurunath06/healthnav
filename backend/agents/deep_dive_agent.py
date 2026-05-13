from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ValidationError

from .openrouter_client import AgentFailure, OpenRouterClient

_MODEL_ROLE = "deep_dive"
_TEMPERATURE = 0.6

_SYSTEM_PROMPT = """You are the Symptom Deep-Dive agent for HealthNav, a doctor visit preparation tool.

Your job: extract structured clinical findings from the user's symptom description, then decide whether you need follow-up questions to fill gaps. If the user has already answered follow-up questions, incorporate those answers into the findings.

--- Output format ---
Respond ONLY with a valid JSON object — no markdown fences, no text outside the JSON.

{
  "structured_findings": {
    "duration": "string describing how long (e.g. '3 days', '2 weeks', 'since Monday') or null if unknown",
    "severity": "mild" | "moderate" | "severe" | null,
    "frequency": "string describing pattern (e.g. 'constant', 'every morning', 'comes and goes') or null if unknown",
    "triggers": ["list of things that make it worse or cause onset — empty array if none identified"],
    "associated_symptoms": ["list of other symptoms mentioned alongside the main one — empty array if none"],
    "alleviating_factors": ["list of things that help or reduce the symptom — empty array if none"]
  },
  "needs_followup": true | false,
  "followup_questions": [
    {
      "id": "unique_snake_case_id",
      "question": "plain English question for the user",
      "type": "single_choice" | "multi_choice" | "yes_no" | "scale",
      "choices": [{"value": "snake_case", "label": "Display text"}],
      "scale_min": 1,
      "scale_max": 10,
      "scale_min_label": "No pain",
      "scale_max_label": "Worst pain",
      "allow_other_text": true
    }
  ]
}

--- Field rules ---
- structured_findings: populate every field you can from the description. Use null / empty array only when genuinely unknown.
- needs_followup: set true ONLY on the FIRST call when key fields (duration, severity, or frequency) are all null AND no previous_answers were provided.
- followup_questions: required when needs_followup=true, otherwise empty array [].
- If previous_answers are provided, needs_followup must be false — incorporate the answers and return complete findings.

--- Question type rules ---
- single_choice / multi_choice → populate choices[] with {"value": ..., "label": ...}. Omit scale fields.
- yes_no → fixed choices: [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]
- scale → populate scale_min, scale_max, scale_min_label, scale_max_label. Omit choices[].
- allow_other_text defaults to true for single_choice and multi_choice; false for yes_no and scale.
- Generate 2–4 targeted questions. Don't ask about information already in the description.

--- Severity mapping ---
- "mild"     = noticeable but not interfering with daily activities
- "moderate" = interfering with some daily activities
- "severe"   = significantly limiting or disabling

--- Examples of good structured_findings extraction ---
Input: "I've had a throbbing headache for 3 days, mostly in the morning, worse with bright light"
→ duration: "3 days", severity: infer from "throbbing" → "moderate", frequency: "mostly in the morning",
  triggers: ["bright light"], associated_symptoms: [], alleviating_factors: []

Input: "lower back pain for 2 weeks, gets better when I lie down, worse after sitting"
→ duration: "2 weeks", frequency: "persistent", triggers: ["prolonged sitting"],
  alleviating_factors: ["lying down"]"""


class FollowUpChoice(BaseModel):
    value: str
    label: str


class FollowUpQuestion(BaseModel):
    id: str
    question: str
    type: Literal["single_choice", "multi_choice", "yes_no", "scale"]
    choices: list[FollowUpChoice] = []
    scale_min: int | None = None
    scale_max: int | None = None
    scale_min_label: str | None = None
    scale_max_label: str | None = None
    allow_other_text: bool = True


class StructuredFindings(BaseModel):
    duration: str | None = None
    severity: Literal["mild", "moderate", "severe"] | None = None
    frequency: str | None = None
    triggers: list[str] = []
    associated_symptoms: list[str] = []
    alleviating_factors: list[str] = []


class DeepDiveInput(BaseModel):
    symptom_description: str
    primary_symptom_category: str
    previous_answers: dict[str, str] = {}


class DeepDiveOutput(BaseModel):
    structured_findings: StructuredFindings
    needs_followup: bool
    followup_questions: list[FollowUpQuestion] = []


class DeepDiveAgent:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def run(self, inp: DeepDiveInput) -> DeepDiveOutput:
        previous_section = ""
        if inp.previous_answers:
            answers_lines = "\n".join(
                f"  {q_id}: {answer}" for q_id, answer in inp.previous_answers.items()
            )
            previous_section = f"\n\nPrevious follow-up answers:\n{answers_lines}"

        user_content = (
            f"Symptom description: {inp.symptom_description}\n"
            f"Primary symptom category: {inp.primary_symptom_category}"
            f"{previous_section}"
        )

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]
        data = await self._client.chat(role=_MODEL_ROLE, messages=messages, temperature=_TEMPERATURE)
        try:
            return DeepDiveOutput.model_validate(data)
        except ValidationError as exc:
            raise AgentFailure("MALFORMED_JSON") from exc
