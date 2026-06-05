from __future__ import annotations

import asyncio
import hashlib
import json
import time
from datetime import datetime, timezone

from .assembler_agent import AssemblerAgent, AssemblerInput, AssemblerOutput
from .deep_dive_agent import DeepDiveAgent, DeepDiveInput, DeepDiveOutput
from .guardrail_agent import GuardrailAgent, GuardrailInput, GuardrailOutput
from .lifestyle_agent import LifestyleAgent, LifestyleInput, LifestyleOutput
from .openrouter_client import AgentFailure
from .red_flag_detector import RedFlagDetector, RedFlagInput, RedFlagOutput
from .triage_agent import TriageAgent, TriageInput, TriageOutput

_FOLLOWUP_BUDGETS = {1: 0, 2: 2, 3: 4, 4: 6, 5: 8}


class Supervisor:
    def __init__(self) -> None:
        self._guardrail = GuardrailAgent()
        self._triage = TriageAgent()
        self._red_flag = RedFlagDetector()
        self._deep_dive = DeepDiveAgent()
        self._lifestyle = LifestyleAgent()
        self._assembler = AssemblerAgent()

    async def run(
        self,
        request_id: str,
        symptom_description: str,
        investigation_depth: int = 3,
        follow_up_history: list[dict] | None = None,
    ) -> dict:
        follow_up_history = follow_up_history or []
        trace: list[dict] = []
        max_followups = _FOLLOWUP_BUDGETS.get(investigation_depth, 4)

        self._log(
            request_id,
            "request_received",
            metadata={
                "symptom_hash": _sha256_prefix(symptom_description),
                "investigation_depth": investigation_depth,
            },
        )

        # ── Phase 1: Parallel agents ──────────────────────────────────────────
        # Red flag runs ONLY on the initial description (round 0).
        # Subsequent rounds answer structured questions — no new emergency
        # symptoms can emerge from "yes/no" or scale answers, and the initial
        # description has already been screened.
        guardrail, triage, red_flag, phase1_trace = await self._run_parallel(
            request_id, symptom_description, follow_up_history
        )
        trace.extend(phase1_trace)

        # ── Phase 2: Short-circuit routing ────────────────────────────────────

        # Guardrail — high-confidence block → redirect
        if guardrail is not None and not guardrail.should_proceed and guardrail.confidence == "high":
            return self._redirect(request_id, guardrail.reason_category, trace)

        # Red Flag — any emergency flag → emergency
        if red_flag is not None and red_flag.is_emergency:
            advisory = red_flag.advisory or "Seek immediate medical attention."
            return self._emergency(request_id, advisory, red_flag.red_flags_detected, trace)

        # Triage — urgency=emergency → emergency
        if triage is not None and triage.urgency_level == "emergency":
            return self._emergency(
                request_id,
                "Seek immediate medical attention based on the urgency of your symptoms.",
                [],
                trace,
            )

        # ── Phase 3: Deep-Dive ────────────────────────────────────────────────
        _MAX_FOLLOWUP = 20  # absolute runaway ceiling only
        deep_dive = await self._run_deep_dive(
            request_id,
            symptom_description,
            triage,
            investigation_depth,
            max_followups,
            follow_up_history,
            trace,
        )
        if (
            deep_dive is not None
            and deep_dive.needs_followup
            and len(follow_up_history) < min(_MAX_FOLLOWUP, max_followups)
        ):
            # Stop early if key clinical dimensions are already covered
            if not _findings_sufficient(
                deep_dive.structured_findings,
                follow_up_history,
                investigation_depth,
            ):
                deduped = _dedup_questions(deep_dive.followup_questions, follow_up_history)
                filtered = _filter_saturated_topics(deduped, follow_up_history)
                if filtered:
                    return self._needs_followup(request_id, filtered, trace, deep_dive.topic_overview)

        # ── Phase 4: Lifestyle ────────────────────────────────────────────────
        lifestyle: LifestyleOutput | None = None
        if deep_dive is not None and self.should_run_lifestyle(triage, deep_dive):
            lifestyle = await self._run_lifestyle(
                request_id, symptom_description, deep_dive, trace
            )
            # Lifestyle may also request follow-up (spec §7.1 path 8)
            if lifestyle is not None and lifestyle.needs_followup and len(follow_up_history) < _MAX_FOLLOWUP:
                remaining_budget = len(follow_up_history) < min(_MAX_FOLLOWUP, max_followups)
                lf_filtered = _filter_saturated_topics(lifestyle.followup_questions, follow_up_history)
                if remaining_budget and lf_filtered:
                    return self._needs_followup(request_id, lf_filtered, trace)

        # ── Phase 5: Assembler ────────────────────────────────────────────────
        agents_run = [
            e["agent"] for e in trace
            if isinstance(e.get("status"), str) and e["status"] == "ok"
        ]
        assembler_out = await self._run_assembler(
            request_id, symptom_description, triage, red_flag,
            deep_dive, lifestyle, investigation_depth, agents_run, trace,
        )
        if assembler_out is None:
            # Assembler failed → error with raw outputs (spec §7.3)
            return self._assembler_error(request_id, trace)
        return self._complete(request_id, assembler_out, trace)

    # ── Parallel runner ───────────────────────────────────────────────────────

    async def _run_parallel(
        self,
        request_id: str,
        symptom_description: str,
        follow_up_history: list[dict],
    ) -> tuple[GuardrailOutput | None, TriageOutput | None, RedFlagOutput | None, list[dict]]:
        round_number = len(follow_up_history)

        # Red flag: initial round only.
        # Follow-up answers are selections from our own predefined options — they
        # cannot introduce new emergency symptoms. Initial description already screened.
        should_run_red_flag = (round_number == 0)

        # Guardrail: skip when the user was selecting (not typing).
        # yes_no / scale / single_choice / multi_choice are all button/slider interactions —
        # injection is impossible. Only run guardrail when the user could have typed
        # free text (round 0, or a follow-up where question_type is absent/unknown).
        should_run_guardrail = not _last_answer_was_selection(follow_up_history)

        guardrail_result: GuardrailOutput | None = None
        triage_result: TriageOutput | None = None
        red_flag_result: RedFlagOutput | None = None

        # Each slot holds exactly one trace entry; merged in fixed order after gather
        guardrail_entry: dict | None = None
        triage_entry: dict | None = None
        red_flag_entry: dict | None = None

        async def run_guardrail() -> None:
            nonlocal guardrail_result, guardrail_entry
            started = _iso_now()
            t = _ms()
            self._log(request_id, "agent_started", agent="guardrail")
            try:
                guardrail_result = await self._guardrail.run(
                    GuardrailInput(symptom_description=symptom_description)
                )
                dur = _ms() - t
                self._log(request_id, "agent_completed", agent="guardrail", duration_ms=dur)
                guardrail_entry = {
                    "agent": "guardrail",
                    "started_at": started,
                    "duration_ms": dur,
                    "status": "ok",
                    "decision": f"should_proceed={guardrail_result.should_proceed}, confidence={guardrail_result.confidence}",
                }
            except Exception as exc:
                dur = _ms() - t
                code = exc.code if isinstance(exc, AgentFailure) else "AGENT_FAILURE"
                self._log(request_id, "agent_failed", agent="guardrail", duration_ms=dur, status=code)
                guardrail_entry = {
                    "agent": "guardrail",
                    "started_at": started,
                    "duration_ms": dur,
                    "status": "failed",
                    "decision": "failed — defaulting to should_proceed=true",
                }

        async def run_triage() -> None:
            nonlocal triage_result, triage_entry
            started = _iso_now()
            t = _ms()
            self._log(request_id, "agent_started", agent="triage")
            try:
                triage_result = await self._triage.run(
                    TriageInput(symptom_description=symptom_description)
                )
                dur = _ms() - t
                self._log(request_id, "agent_completed", agent="triage", duration_ms=dur)
                triage_entry = {
                    "agent": "triage",
                    "started_at": started,
                    "duration_ms": dur,
                    "status": "ok",
                    "decision": f"category={triage_result.primary_symptom_category}, urgency={triage_result.urgency_level}",
                }
            except Exception as exc:
                dur = _ms() - t
                code = exc.code if isinstance(exc, AgentFailure) else "AGENT_FAILURE"
                self._log(request_id, "agent_failed", agent="triage", duration_ms=dur, status=code)
                triage_entry = {
                    "agent": "triage",
                    "started_at": started,
                    "duration_ms": dur,
                    "status": "failed",
                    "decision": "failed — defaulting to routine/general",
                }

        async def run_red_flag() -> None:
            nonlocal red_flag_result, red_flag_entry
            started = _iso_now()
            t = _ms()
            self._log(request_id, "agent_started", agent="red_flag_detector")
            try:
                red_flag_result = await self._red_flag.run(
                    RedFlagInput(symptom_description=symptom_description)
                )
                dur = _ms() - t
                flags = red_flag_result.red_flags_detected
                self._log(request_id, "agent_completed", agent="red_flag_detector", duration_ms=dur)
                red_flag_entry = {
                    "agent": "red_flag_detector",
                    "started_at": started,
                    "duration_ms": dur,
                    "status": "ok",
                    "decision": f"flags={flags}" if flags else "no flags",
                }
            except Exception as exc:
                dur = _ms() - t
                code = exc.code if isinstance(exc, AgentFailure) else "AGENT_FAILURE"
                self._log(request_id, "agent_failed", agent="red_flag_detector", duration_ms=dur, status=code)
                red_flag_entry = {
                    "agent": "red_flag_detector",
                    "started_at": started,
                    "duration_ms": dur,
                    "status": "failed",
                    "decision": "failed — defaulting to is_emergency=false",
                }

        coros = [run_triage()]

        if should_run_guardrail:
            coros.append(run_guardrail())
        else:
            guardrail_entry = {
                "agent": "guardrail",
                "status": "skipped",
                "decision": f"skipped — round {round_number} answer was a selection (injection impossible)",
            }

        if should_run_red_flag:
            coros.append(run_red_flag())
        else:
            red_flag_entry = {
                "agent": "red_flag_detector",
                "status": "skipped",
                "decision": f"skipped — follow-up round {round_number} (structured answers cannot introduce new red flags)",
            }

        await asyncio.gather(*coros)

        # Merge in spec-defined order (guardrail, triage, red_flag)
        ordered_trace = [e for e in [guardrail_entry, triage_entry, red_flag_entry] if e is not None]
        return guardrail_result, triage_result, red_flag_result, ordered_trace

    # ── Deep-Dive runner ──────────────────────────────────────────────────────

    async def _run_deep_dive(
        self,
        request_id: str,
        symptom_description: str,
        triage: TriageOutput | None,
        investigation_depth: int,
        max_followups: int,
        follow_up_history: list[dict],
        trace: list[dict],
    ) -> DeepDiveOutput | None:
        started = _iso_now()
        t = _ms()
        self._log(request_id, "agent_started", agent="deep_dive")
        category = triage.primary_symptom_category if triage else "general"
        try:
            result = await self._deep_dive.run(
                DeepDiveInput(
                    symptom_description=symptom_description,
                    primary_symptom_category=category,
                    investigation_depth=investigation_depth,
                    max_followups=max_followups,
                    follow_up_history=follow_up_history,
                )
            )
            dur = _ms() - t
            self._log(request_id, "agent_completed", agent="deep_dive", duration_ms=dur)
            trace.append({
                "agent": "deep_dive",
                "started_at": started,
                "duration_ms": dur,
                "status": "ok",
                "decision": f"needs_followup={result.needs_followup}, severity={result.structured_findings.severity}",
            })
            return result
        except Exception as exc:
            dur = _ms() - t
            code = exc.code if isinstance(exc, AgentFailure) else "AGENT_FAILURE"
            self._log(request_id, "agent_failed", agent="deep_dive", duration_ms=dur, status=code)
            trace.append({
                "agent": "deep_dive",
                "started_at": started,
                "duration_ms": dur,
                "status": "failed",
                "decision": "failed — continuing with partial data",
            })
            return None

    # ── Lifestyle runner ──────────────────────────────────────────────────────

    async def _run_lifestyle(
        self,
        request_id: str,
        symptom_description: str,
        deep_dive: DeepDiveOutput,
        trace: list[dict],
    ) -> LifestyleOutput | None:
        started = _iso_now()
        t = _ms()
        self._log(request_id, "agent_started", agent="lifestyle")
        try:
            result = await self._lifestyle.run(
                LifestyleInput(
                    symptom_description=symptom_description,
                    deep_dive_findings=deep_dive.structured_findings,
                )
            )
            dur = _ms() - t
            self._log(request_id, "agent_completed", agent="lifestyle", duration_ms=dur)
            trace.append({
                "agent": "lifestyle",
                "started_at": started,
                "duration_ms": dur,
                "status": "ok",
                "decision": (
                    f"correlations={len(result.lifestyle_correlations)}, "
                    f"needs_followup={result.needs_followup}"
                ),
            })
            return result
        except Exception as exc:
            dur = _ms() - t
            code = exc.code if isinstance(exc, AgentFailure) else "AGENT_FAILURE"
            self._log(request_id, "agent_failed", agent="lifestyle", duration_ms=dur, status=code)
            trace.append({
                "agent": "lifestyle",
                "started_at": started,
                "duration_ms": dur,
                "status": "failed",
                "decision": "failed — skipping lifestyle (spec §7.3)",
            })
            return None  # Skip silently, continue to assembler

    # ── Assembler runner ──────────────────────────────────────────────────────

    async def _run_assembler(
        self,
        request_id: str,
        symptom_description: str,
        triage: TriageOutput | None,
        red_flag: RedFlagOutput | None,
        deep_dive: DeepDiveOutput | None,
        lifestyle: LifestyleOutput | None,
        investigation_depth: int,
        agents_run: list[str],
        trace: list[dict],
    ) -> AssemblerOutput | None:
        started = _iso_now()
        t = _ms()
        self._log(request_id, "agent_started", agent="assembler")
        try:
            result = await self._assembler.run(
                AssemblerInput(
                    symptom_description=symptom_description,
                    investigation_depth=investigation_depth,
                    triage_output=triage,
                    red_flag_output=red_flag,
                    deep_dive_output=deep_dive,
                    lifestyle_output=lifestyle,
                    agents_run=agents_run,
                )
            )
            dur = _ms() - t
            qid = result.doctor_prep_card.quadrant.quadrant_id
            self._log(request_id, "agent_completed", agent="assembler", duration_ms=dur)
            trace.append({
                "agent": "assembler",
                "started_at": started,
                "duration_ms": dur,
                "status": "ok",
                "decision": f"quadrant={qid}",
            })
            return result
        except Exception as exc:
            dur = _ms() - t
            code = exc.code if isinstance(exc, AgentFailure) else "AGENT_FAILURE"
            self._log(request_id, "agent_failed", agent="assembler", duration_ms=dur, status=code)
            trace.append({
                "agent": "assembler",
                "started_at": started,
                "duration_ms": dur,
                "status": "failed",
                "decision": "assembler failed",
            })
            return None

    # ── Lifestyle routing rule ────────────────────────────────────────────────

    @staticmethod
    def should_run_lifestyle(triage: TriageOutput | None, deep_dive: DeepDiveOutput | None) -> bool:
        """Deterministic routing rule — spec §7.1."""
        if triage and triage.primary_symptom_category in ("general", "neurological", "musculoskeletal"):
            return True
        if deep_dive is None:
            return False
        findings = deep_dive.structured_findings
        triggers = [t.lower() for t in findings.triggers]
        if any(kw in t for t in triggers for kw in ("stress", "screen_time", "screen", "work", "sleep")):
            return True
        associated = [s.lower() for s in findings.associated_symptoms]
        if any(s in ("fatigue", "headache") for s in associated):
            return True
        return False

    # ── Response builders ─────────────────────────────────────────────────────

    def _redirect(self, request_id: str, reason_category: str, trace: list[dict]) -> dict:
        self._log_routing(request_id, f"redirect: {reason_category}", trace)
        self._log(request_id, "redirect_triggered", metadata={"reason_category": reason_category})
        response = {
            "status": "redirect",
            "request_id": request_id,
            "message": "We're not able to help with this query. Please consult a healthcare professional for personalized advice.",
            "reason_category": reason_category,
            "agent_trace": trace,
        }
        self._log(request_id, "response_sent", metadata={"status": "redirect"})
        return response

    def _emergency(self, request_id: str, advisory: str, red_flags: list[str], trace: list[dict]) -> dict:
        source = "red_flag_detector" if red_flags else "triage"
        self._log_routing(request_id, f"emergency: source={source}", trace)
        response = {
            "status": "emergency",
            "request_id": request_id,
            "advisory": advisory,
            "red_flags": red_flags,
            "agent_trace": trace,
        }
        self._log(request_id, "response_sent", metadata={"status": "emergency"})
        return response

    def _needs_followup(self, request_id: str, questions: list, trace: list[dict], topic_overview=None) -> dict:
        self._log_routing(request_id, "needs_followup: deep-dive requested more info", trace)
        response = {
            "status": "needs_followup",
            "request_id": request_id,
            "questions": [q.model_dump(exclude_none=True) for q in questions],
            "topic_overview": topic_overview.model_dump() if topic_overview else None,
            "agent_trace": trace,
        }
        self._log(request_id, "response_sent", metadata={"status": "needs_followup"})
        return response

    def _complete(self, request_id: str, assembler_out: AssemblerOutput, trace: list[dict]) -> dict:
        self._log_routing(request_id, "complete", trace)
        response = {
            "status": "complete",
            "request_id": request_id,
            "doctor_prep_card": assembler_out.doctor_prep_card.model_dump(),
            "agent_trace": trace,
        }
        self._log(request_id, "response_sent", metadata={"status": "complete"})
        return response

    def _assembler_error(self, request_id: str, trace: list[dict]) -> dict:
        self._log_routing(request_id, "error: assembler failed", trace)
        response = {
            "status": "error",
            "request_id": request_id,
            "error_code": "AGENT_FAILURE",
            "message": "Failed to generate Doctor Prep Card. Please try again.",
            "agent_trace": trace,
        }
        self._log(request_id, "response_sent", metadata={"status": "error", "reason": "assembler_failed"})
        return response

    # ── Logging ───────────────────────────────────────────────────────────────

    def _log_routing(self, request_id: str, decision: str, trace: list[dict]) -> None:
        self._log(request_id, "routing_decision", metadata={"decision": decision})
        trace.append({"agent": "supervisor", "decision": decision})

    def _log(
        self,
        request_id: str,
        event_type: str,
        agent: str | None = None,
        duration_ms: int | None = None,
        status: str = "ok",
        metadata: dict | None = None,
    ) -> None:
        print(json.dumps({
            "timestamp": _iso_now(),
            "request_id": request_id,
            "event_type": event_type,
            "agent": agent,
            "duration_ms": duration_ms,
            "status": status,
            "metadata": metadata or {},
        }), flush=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _ms() -> int:
    return int(time.monotonic() * 1000)

def _sha256_prefix(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]

def _has_answers_for(questions: list, answers: dict[str, str]) -> bool:
    """True if at least one answer from this question set is present in the answers dict."""
    return any(q.id in answers for q in questions)

def _dedup_questions(questions: list, history: list) -> list:
    """Filter out questions whose text is too similar to already-asked ones."""
    if not history:
        return questions
    asked_texts = [h.get("question_text", "").lower() for h in history]
    unique = []
    for q in questions:
        q_words = set(q.question.lower().split())
        is_dup = any(
            len(q_words & set(asked.split())) / max(len(q_words), 1) > 0.4
            for asked in asked_texts
        )
        if not is_dup:
            unique.append(q)
    return unique


# Topic clusters — keyword sets that define each clinical dimension
_TOPIC_CLUSTERS: dict[str, list[str]] = {
    "sleep":      ["sleep", "sleeping", "night", "rest", "insomnia", "awake", "hours"],
    "stress":     ["stress", "anxiety", "worry", "tense", "tension", "mental", "nervous"],
    "pain":       ["pain", "ache", "hurt", "sore", "sharp", "dull", "throb", "burning", "numb"],
    "duration":   ["long", "started", "began", "ago", "since", "week", "day", "month", "year", "when"],
    "triggers":   ["trigger", "cause", "worse", "worsens", "brings", "after", "during", "activity"],
    "relief":     ["better", "relief", "helps", "medication", "painkiller", "ibuprofen", "paracetamol"],
    "lifestyle":  ["exercise", "diet", "screen", "work", "food", "drink", "alcohol", "caffeine", "posture"],
    "history":    ["before", "previously", "history", "past", "condition", "diagnosed", "family"],
    "associated": ["also", "alongside", "other", "nausea", "dizziness", "fever", "fatigue", "vision"],
}


def _question_topics(text: str) -> set[str]:
    words = text.lower().split()
    topics = set()
    for topic, keywords in _TOPIC_CLUSTERS.items():
        if any(kw in word for word in words for kw in keywords):
            topics.add(topic)
    return topics


def _filter_saturated_topics(questions: list, history: list) -> list:
    """Remove questions whose topic cluster already has 2+ questions in history."""
    topic_counts: dict[str, int] = {}
    for h in history:
        for t in _question_topics(h.get("question_text", "")):
            topic_counts[t] = topic_counts.get(t, 0) + 1

    result = []
    for q in questions:
        q_topics = _question_topics(q.question)
        saturated = q_topics and all(topic_counts.get(t, 0) >= 1 for t in q_topics)
        if not saturated:
            result.append(q)
    return result


_SELECTION_TYPES = frozenset({"yes_no", "scale", "single_choice", "multi_choice"})

def _last_answer_was_selection(follow_up_history: list[dict]) -> bool:
    """True when the most recent follow-up answer came from a selection UI (not typed)."""
    if not follow_up_history:
        return False
    return follow_up_history[-1].get("question_type") in _SELECTION_TYPES


def _findings_sufficient(
    findings,
    follow_up_history: list[dict],
    investigation_depth: int = 3,
) -> bool:
    """True when core clinical dimensions are covered — safe to stop asking."""
    minimum_by_depth = {1: 0, 2: 2, 3: 4, 4: 6, 5: 8}
    if len(follow_up_history) < minimum_by_depth.get(investigation_depth, 4):
        return False
    return (
        findings.duration is not None
        and findings.severity is not None
        and findings.frequency is not None
        and len(findings.triggers) > 0
    )
