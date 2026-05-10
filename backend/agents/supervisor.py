from __future__ import annotations

import asyncio
import hashlib
import json
import time
from datetime import datetime, timezone
from typing import Any

from .guardrail_agent import GuardrailAgent, GuardrailInput, GuardrailOutput
from .openrouter_client import AgentFailure
from .red_flag_detector import RedFlagDetector, RedFlagInput, RedFlagOutput
from .triage_agent import TriageAgent, TriageInput, TriageOutput


class Supervisor:
    def __init__(self) -> None:
        self._guardrail = GuardrailAgent()
        self._triage = TriageAgent()
        self._red_flag = RedFlagDetector()

    async def run(
        self,
        request_id: str,
        symptom_description: str,
        follow_up_answers: dict[str, str] | None = None,
    ) -> dict:
        follow_up_answers = follow_up_answers or {}
        trace: list[dict] = []

        self._log(request_id, "request_received", metadata={"symptom_hash": _sha256_prefix(symptom_description)})

        # ── Phase 1: Parallel agents ──────────────────────────────────────────
        guardrail, triage, red_flag, phase1_trace = await self._run_parallel(
            request_id, symptom_description
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

        # ── Phase 3: Deep-Dive (TODO Sprint 2) ───────────────────────────────
        # deep_dive = await self._run_deep_dive(request_id, symptom_description, triage, follow_up_answers, trace)
        # if deep_dive is not None and deep_dive.needs_followup and not follow_up_answers:
        #     return self._needs_followup(request_id, deep_dive.followup_questions, trace)

        # ── Phase 4: Lifestyle (TODO Sprint 2) ───────────────────────────────
        # if self._should_run_lifestyle(triage, deep_dive):
        #     lifestyle = await self._run_lifestyle(request_id, symptom_description, deep_dive, follow_up_answers, trace)

        # ── Phase 5: Assembler (TODO Sprint 2) ───────────────────────────────
        # doctor_prep_card = await self._run_assembler(request_id, triage, deep_dive, lifestyle, trace)
        # return self._complete(request_id, doctor_prep_card, trace)

        # Temporary stub until Sprint 2 agents are implemented
        self._log_routing(request_id, "continue: parallel phase complete — deep-dive not yet implemented", trace)
        return self._stub_incomplete(request_id, trace)

    # ── Parallel runner ───────────────────────────────────────────────────────

    async def _run_parallel(
        self,
        request_id: str,
        symptom_description: str,
    ) -> tuple[GuardrailOutput | None, TriageOutput | None, RedFlagOutput | None, list[dict]]:
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

        await asyncio.gather(run_guardrail(), run_triage(), run_red_flag())

        # Merge in spec-defined order (guardrail, triage, red_flag)
        ordered_trace = [e for e in [guardrail_entry, triage_entry, red_flag_entry] if e is not None]
        return guardrail_result, triage_result, red_flag_result, ordered_trace

    # ── Lifestyle routing rule (pure logic, called in Sprint 2) ──────────────

    @staticmethod
    def should_run_lifestyle(triage: TriageOutput | None, deep_dive_findings: dict) -> bool:
        """Deterministic rule from spec §4.1."""
        if triage and triage.primary_symptom_category in ("general", "neurological", "musculoskeletal"):
            return True
        triggers = [t.lower() for t in deep_dive_findings.get("triggers", [])]
        if any(kw in t for t in triggers for kw in ("stress", "screen_time", "screen", "work", "sleep")):
            return True
        associated = [s.lower() for s in deep_dive_findings.get("associated_symptoms", [])]
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

    def _stub_incomplete(self, request_id: str, trace: list[dict]) -> dict:
        response = {
            "status": "error",
            "request_id": request_id,
            "error_code": "NOT_IMPLEMENTED",
            "message": "Deep-dive and assembler agents not yet built (Sprint 2).",
            "agent_trace": trace,
        }
        self._log(request_id, "response_sent", metadata={"status": "error", "reason": "not_implemented"})
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
