from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ValidationError

from .openrouter_client import AgentFailure, OpenRouterClient

_MODEL_ROLE = "deep_dive"
_TEMPERATURE = 0.6

_DEPTH_GUIDANCE: dict[int, str] = {
    1: "Quick: do not request follow-up. Extract the best useful findings from the initial description.",
    2: "Focused: ask at most 2 high-impact follow-ups, prioritising duration and severity.",
    3: "Standard: ask at most 4 follow-ups for a balanced clinical picture.",
    4: "Thorough: ask at most 6 useful follow-ups, including triggers, associated symptoms, relief, and daily impact when relevant.",
    5: "Comprehensive: ask at most 8 useful follow-ups for the fullest non-diagnostic doctor brief, including history and patterns when relevant.",
}

_SYSTEM_PROMPT = """You are a clinical interviewer for HealthNav, a doctor visit preparation tool. Your job is to build a complete clinical picture of the patient's symptoms through targeted, adaptive questioning — one question at a time.

You receive the patient's symptom description and the full conversation history (every question asked and every answer given so far). Use this to decide:
1. What you now know about the clinical picture.
2. What is the single most important thing still unknown that would change the Doctor Prep Card.
3. Whether you have enough — if so, stop asking.

--- Output format ---
Respond ONLY with a valid JSON object — no markdown fences, no text outside the JSON.

{
  "structured_findings": {
    "duration": "string or null",
    "severity": "mild" | "moderate" | "severe" | null,
    "frequency": "string or null",
    "triggers": ["list"],
    "associated_symptoms": ["list"],
    "alleviating_factors": ["list"]
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
      "scale_min_label": "string",
      "scale_max_label": "string",
      "allow_other_text": false
    }
  ],
  "topic_overview": {
    "title": "short title e.g. 'About Back Pain'",
    "summary": "2-3 sentence general medical overview of this symptom category — NOT specific to this patient",
    "common_causes": ["3-4 general causes that commonly produce this symptom type"],
    "when_to_see_doctor": "one sentence of general guidance on urgency"
  }
}

--- Clinical interviewer rules ---
- Generate exactly ONE question in followup_questions when needs_followup=true. Never more than one.
- Every question must be a DIRECT consequence of what was just answered. Ask what the answer made you curious about. Do not ask generic, template questions.
  BAD: "How long have you had this symptom?" (generic)
  GOOD: "You said the pain is constant — does it wake you up at night, or is it only while you're awake?" (follows from the previous answer)
- Never ask about anything already covered in the conversation history.
- Choose the question type that fits the question naturally:
  yes_no → strictly true/false binary ("does it wake you at night?", "have you tried painkillers?"). Both answers must be literally Yes or No.
  single_choice → one answer from a list of named options. Use this even for two options when the options have distinct labels ("Painful" vs "Pins and needles", "Better" vs "Worse" vs "Same"). Never use yes_no when the options are anything other than a plain yes/no.
  multi_choice → multiple answers may apply ("which of these make it worse?")
  scale → intensity or quantity on a spectrum ("rate your pain 1–10")
- allow_other_text: true only for single_choice and multi_choice when the options may not cover the patient's experience. False for yes_no and scale always.
- Respect the investigation depth and maximum follow-up budget supplied in the user message.
- Stop asking (needs_followup=false) when the depth budget is exhausted or additional questions would not meaningfully change the prep card.
- For Quick depth, always return needs_followup=false.

--- Structured findings rules ---
- Extract from the symptom description AND every answer in the conversation history.
- When an answer contains free text (e.g. the key ends in "_other"), treat it as the patient's own clinical description and extract meaning from it.
- Use null / empty array only when genuinely unknown after considering all available information.

--- Topic overview rules ---
- topic_overview is general educational content about this symptom CATEGORY — it would appear in a medical encyclopedia, not in this patient's chart.
- summary: 2-3 sentences of neutral medical context, written for a lay audience.
- common_causes: 3-4 of the most common general causes for this symptom type.
- when_to_see_doctor: one sentence of general guidance (e.g. "See a doctor if symptoms persist beyond a week or are accompanied by fever.").
- Always return topic_overview on every response.

--- Severity mapping ---
mild = noticeable but not interfering with daily activities
moderate = interfering with some daily activities
severe = significantly limiting or disabling"""


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
    allow_other_text: bool = False


class FollowUpQA(BaseModel):
    question_id: str
    question_text: str
    answer: str


class TopicOverview(BaseModel):
    title: str
    summary: str
    common_causes: list[str] = []
    when_to_see_doctor: str


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
    investigation_depth: int = 3
    max_followups: int = 4
    follow_up_history: list[FollowUpQA] = []


class DeepDiveOutput(BaseModel):
    structured_findings: StructuredFindings
    needs_followup: bool
    followup_questions: list[FollowUpQuestion] = []
    topic_overview: TopicOverview | None = None


class DeepDiveAgent:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def run(self, inp: DeepDiveInput) -> DeepDiveOutput:
        history_section = ""
        if inp.follow_up_history:
            lines = []
            already_asked = []
            for i, qa in enumerate(inp.follow_up_history, 1):
                lines.append(f"Q{i}: {qa.question_text}")
                lines.append(f"A{i}: {qa.answer}")
                already_asked.append(f'  - "{qa.question_text}"')
            history_section = (
                "\n\nConversation so far:\n" + "\n".join(lines)
                + "\n\nALREADY ASKED — you MUST NOT ask these again or any question on the same topic:\n"
                + "\n".join(already_asked)
            )

        user_content = (
            f"Symptom description: {inp.symptom_description}\n"
            f"Primary symptom category: {inp.primary_symptom_category}\n"
            f"Investigation depth: {inp.investigation_depth}/5\n"
            f"Maximum follow-up exchanges: {inp.max_followups}\n"
            f"Depth guidance: {_DEPTH_GUIDANCE[inp.investigation_depth]}"
            f"{history_section}"
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
