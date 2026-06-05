from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ValidationError

from .deep_dive_agent import DeepDiveOutput
from .lifestyle_agent import LifestyleOutput
from .openrouter_client import AgentFailure, OpenRouterClient
from .red_flag_detector import RedFlagOutput
from .triage_agent import TriageOutput

_MODEL_ROLE = "assembler"
_TEMPERATURE = 0.5

_DISCLAIMER = (
    "This is a preparation tool, not a diagnosis. "
    "The information here should be reviewed with a licensed medical professional. "
    "Do not delay seeking care based on this output."
)

_QUADRANT_ACTIONS: dict[str, str] = {
    "Q1": "Seek medical attention today or go to urgent care.",
    "Q2": "Schedule an appointment with a specialist within 1-2 weeks.",
    "Q3": "Monitor symptoms and self-care. See a doctor if it worsens.",
    "Q4": "Note this for your next routine doctor visit.",
}

_DEPTH_CARD_GUIDANCE: dict[int, str] = {
    1: "Quick card: 2-3 key findings and 2-3 doctor questions. Keep every section concise.",
    2: "Focused card: 3-4 key findings and 3 doctor questions. Emphasise the most actionable context.",
    3: "Standard card: 3-6 key findings and 3-5 doctor questions with balanced detail.",
    4: "Thorough card: 5-7 key findings and 4-6 doctor questions. Include broader symptom and lifestyle context.",
    5: "Comprehensive card: 6-9 key findings and 5-7 doctor questions. Preserve all useful non-diagnostic context without repetition.",
}

_SYSTEM_PROMPT = """You are the Assembler agent for HealthNav, a doctor visit preparation tool.

Your job: synthesise all agent findings into a clear, structured Doctor Prep Card a patient can take to their appointment.

You receive structured data from earlier agents. Use it to write a useful, plain-English card.

--- Output format ---
Respond ONLY with a valid JSON object — no markdown fences, no text outside the JSON.

{
  "summary": "2-3 sentence plain-English summary of the situation. What the symptom is, how long/severe, any notable findings.",
  "symptom_timeline": {
    "primary_symptom": "The main complaint in plain English",
    "duration": "How long, e.g. '3 days' or null if unknown",
    "severity": "mild | moderate | severe or null if unknown",
    "frequency": "Pattern e.g. 'constant', 'every morning' or null if unknown"
  },
  "key_findings": [
    "Each entry is one concise finding worth mentioning to the doctor"
  ],
  "lifestyle_context": "1-2 sentences on lifestyle factors if a lifestyle assessment was run, otherwise null",
  "questions_to_ask_doctor": [
    "Specific questions the patient should ask their doctor; count follows the supplied depth instruction"
  ],
  "potentially_relevant_specialties": [
    "Medical specialty name only, e.g. 'Neurology', 'Cardiology'"
  ],
  "suspected_cause": "One sentence. Hedged plain-English assessment of what may be causing the symptoms. Must start with 'Based on findings, this may be consistent with...' or similar. Do NOT diagnose. Do NOT use definitive language.",
  "recommended_next_step": "One sentence. MUST recommend consulting a licensed medical professional. Never suggest the user does not need to see a doctor."
}

--- Rules ---
- summary: plain language, no jargon, no diagnosis, no speculation beyond what findings support.
- key_findings: follow the supplied depth instruction. Include duration, severity, triggers, associated symptoms, and red flags when known.
- lifestyle_context: populate only if lifestyle_output is present in the input. null otherwise.
- questions_to_ask_doctor: follow the supplied depth instruction and stay specific to the symptom — not generic. "Should I get a head MRI given my recurring morning headaches?" not "Should I see a doctor?".
- potentially_relevant_specialties: 1–3 specialties maximum. Only list if genuinely relevant. Empty array [] if unclear.
- recommended_next_step: ALWAYS recommend professional consultation. Examples: "Schedule an appointment with your GP to discuss these findings." / "Seek medical evaluation promptly given the duration and severity."
- DO NOT include a quadrant — that is computed separately.
- DO NOT include a disclaimer — that is added separately.
- DO NOT diagnose, prescribe, or state what disease the patient has."""


# ── Pydantic models ────────────────────────────────────────────────────────────

class SymptomTimeline(BaseModel):
    primary_symptom: str
    duration: str | None = None
    severity: str | None = None
    frequency: str | None = None


class QuadrantData(BaseModel):
    urgency_score: int
    importance_score: int
    quadrant_id: Literal["Q1", "Q2", "Q3", "Q4"]
    quadrant_label: Literal["Act Now", "Schedule Soon", "Watch & Self-Care", "Monitor"]
    urgency_axis_label: str
    importance_axis_label: str
    recommended_action: str


class DoctorPrepCard(BaseModel):
    investigation_depth: int
    summary: str
    suspected_cause: str | None = None
    symptom_timeline: SymptomTimeline
    key_findings: list[str]
    lifestyle_context: str | None = None
    questions_to_ask_doctor: list[str]
    potentially_relevant_specialties: list[str] = []
    recommended_next_step: str
    quadrant: QuadrantData
    disclaimer: str


class AssemblerInput(BaseModel):
    symptom_description: str
    investigation_depth: int = 3
    triage_output: TriageOutput | None
    red_flag_output: RedFlagOutput | None
    deep_dive_output: DeepDiveOutput | None
    lifestyle_output: LifestyleOutput | None = None
    agents_run: list[str]


class AssemblerOutput(BaseModel):
    doctor_prep_card: DoctorPrepCard


# ── Internal LLM draft (no quadrant or disclaimer — Python adds those) ─────────

class _LLMCardDraft(BaseModel):
    summary: str
    suspected_cause: str | None = None
    symptom_timeline: SymptomTimeline
    key_findings: list[str]
    lifestyle_context: str | None = None
    questions_to_ask_doctor: list[str]
    potentially_relevant_specialties: list[str] = []
    recommended_next_step: str


# ── Quadrant scoring (pure Python — spec §6.1) ────────────────────────────────

def _compute_urgency(triage: TriageOutput | None, red_flag: RedFlagOutput | None) -> int:
    score = 2  # routine baseline (spec: routine → 1-4)

    if triage:
        if triage.urgency_level == "emergency":
            score = 9
        elif triage.urgency_level == "urgent":
            score = 6
        # routine stays at 2

    # Red flag hit overrides triage — minimum 8 (spec §6.1)
    if red_flag and (red_flag.is_emergency or red_flag.red_flags_detected):
        score = max(score, 8)

    return min(score, 10)


def _compute_importance(
    inp: AssemblerInput,
    draft: _LLMCardDraft,
) -> int:
    score = 3  # baseline importance

    # Neurological/cardiovascular → +2 baseline (spec §6.1)
    if inp.triage_output:
        category = inp.triage_output.primary_symptom_category.lower()
        if category in ("neurological", "cardiovascular"):
            score += 2

    if inp.deep_dive_output:
        findings = inp.deep_dive_output.structured_findings

        # Chronic duration (weeks/months) → +2
        duration = (findings.duration or "").lower()
        if any(kw in duration for kw in ("week", "month", "year")):
            score += 2

        # Multiple associated symptoms → +1 per, capped at +3
        score += min(len(findings.associated_symptoms), 3)

        # Severe rating → +2
        if findings.severity == "severe":
            score += 2

    # Lifestyle correlation found → +1
    if inp.lifestyle_output and inp.lifestyle_output.lifestyle_correlations:
        score += 1

    # Specialist recommended (from LLM draft) → +1
    if draft.potentially_relevant_specialties:
        score += 1

    return min(score, 10)


def _build_quadrant(urgency: int, importance: int) -> QuadrantData:
    if urgency >= 6 and importance >= 6:
        qid, label = "Q1", "Act Now"
    elif urgency < 6 and importance >= 6:
        qid, label = "Q2", "Schedule Soon"
    elif urgency >= 6 and importance < 6:
        qid, label = "Q3", "Watch & Self-Care"
    else:
        qid, label = "Q4", "Monitor"

    urgency_label = "High Urgency" if urgency >= 6 else "Low Urgency"
    importance_label = "High Importance" if importance >= 6 else "Low Importance"

    return QuadrantData(
        urgency_score=urgency,
        importance_score=importance,
        quadrant_id=qid,
        quadrant_label=label,
        urgency_axis_label=urgency_label,
        importance_axis_label=importance_label,
        recommended_action=_QUADRANT_ACTIONS[qid],
    )


# ── Agent ──────────────────────────────────────────────────────────────────────

class AssemblerAgent:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def run(self, inp: AssemblerInput) -> AssemblerOutput:
        user_content = self._build_user_message(inp)
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        data = await self._client.chat(role=_MODEL_ROLE, messages=messages, temperature=_TEMPERATURE)
        try:
            draft = _LLMCardDraft.model_validate(data)
        except ValidationError as exc:
            raise AgentFailure("MALFORMED_JSON") from exc

        # Quadrant scoring is pure Python (spec §6.1) — computed after LLM so we
        # can include the "specialist recommended → +1" factor from the draft.
        urgency = _compute_urgency(inp.triage_output, inp.red_flag_output)
        importance = _compute_importance(inp, draft)
        quadrant = _build_quadrant(urgency, importance)

        card = DoctorPrepCard(
            investigation_depth=inp.investigation_depth,
            summary=draft.summary,
            suspected_cause=draft.suspected_cause,
            symptom_timeline=draft.symptom_timeline,
            key_findings=draft.key_findings,
            lifestyle_context=draft.lifestyle_context,
            questions_to_ask_doctor=draft.questions_to_ask_doctor,
            potentially_relevant_specialties=draft.potentially_relevant_specialties,
            recommended_next_step=draft.recommended_next_step,
            quadrant=quadrant,
            disclaimer=_DISCLAIMER,
        )
        return AssemblerOutput(doctor_prep_card=card)

    @staticmethod
    def _build_user_message(inp: AssemblerInput) -> str:
        sections: list[str] = [
            f"Symptom description: {inp.symptom_description}",
            f"Investigation depth: {inp.investigation_depth}/5",
            f"Card detail instruction: {_DEPTH_CARD_GUIDANCE[inp.investigation_depth]}",
        ]
        sections.append(f"Agents run: {', '.join(inp.agents_run)}")

        if inp.triage_output:
            sections.append(
                f"Triage: urgency={inp.triage_output.urgency_level}, "
                f"category={inp.triage_output.primary_symptom_category}, "
                f"reasoning={inp.triage_output.reasoning}"
            )

        if inp.red_flag_output:
            flags = inp.red_flag_output.red_flags_detected
            sections.append(
                f"Red flags: {flags if flags else 'none detected'}"
            )

        if inp.deep_dive_output:
            sections.append(
                "Deep-dive findings:\n"
                + json.dumps(inp.deep_dive_output.structured_findings.model_dump(), indent=2)
            )

        if inp.lifestyle_output:
            lo = inp.lifestyle_output
            sections.append(
                "Lifestyle assessment:\n"
                + json.dumps({
                    "lifestyle_factors": lo.lifestyle_factors.model_dump(),
                    "lifestyle_correlations": lo.lifestyle_correlations,
                    "follow_up_questions_for_doctor": lo.follow_up_questions_for_doctor,
                }, indent=2)
            )

        return "\n\n".join(sections)
