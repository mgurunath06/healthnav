from types import SimpleNamespace
from unittest import TestCase

from test_support import (
    install_asyncpg_stub_if_native_import_is_blocked,
    install_orjson_stub_if_native_import_is_blocked,
)

install_orjson_stub_if_native_import_is_blocked()
install_asyncpg_stub_if_native_import_is_blocked()

from pydantic import ValidationError

from agents.supervisor import (
    _FOLLOWUP_BUDGETS,
    _FOLLOWUP_MINIMUMS,
    _fallback_followup_question,
    _findings_sufficient,
    _last_answer_was_selection,
)
from main import InvestigateRequest


class InvestigationDepthTests(TestCase):
    def test_standard_depth_is_default(self) -> None:
        request = InvestigateRequest(
            request_id="depth-default",
            symptom_description="Recurring headaches for several days",
        )
        self.assertEqual(request.investigation_depth, 3)

    def test_depth_must_be_between_one_and_five(self) -> None:
        for depth in (0, 6):
            with self.assertRaises(ValidationError):
                InvestigateRequest(
                    request_id="depth-invalid",
                    symptom_description="Recurring headaches for several days",
                    investigation_depth=depth,
                )

    def test_followup_budgets_increase_with_depth(self) -> None:
        self.assertEqual(_FOLLOWUP_BUDGETS, {1: 0, 2: 1, 3: 2, 4: 4, 5: 6})
        self.assertEqual(_FOLLOWUP_MINIMUMS, {1: 0, 2: 1, 3: 2, 4: 3, 5: 4})

    def test_thorough_depth_does_not_stop_at_standard_threshold(self) -> None:
        findings = SimpleNamespace(
            duration="3 weeks",
            severity="moderate",
            frequency="daily",
            triggers=["screen use"],
        )
        history = [{"question_text": f"Question {i}"} for i in range(2)]

        self.assertTrue(_findings_sufficient(findings, history, 3))
        self.assertFalse(_findings_sufficient(findings, history, 4))

    def test_comprehensive_depth_gets_fallback_if_model_stops_early(self) -> None:
        history = [
            {"question_text": "How long has this been happening?"},
            {"question_text": "How severe is it?"},
        ]
        question = _fallback_followup_question(history)
        self.assertIsNotNone(question)
        self.assertEqual(question.id, "fallback_frequency")

    def test_personal_memory_produces_personalised_fallback(self) -> None:
        question = _fallback_followup_question(
            [],
            {"summary": "Recent investigations: recurring headaches after poor sleep"},
        )
        self.assertIsNotNone(question)
        self.assertEqual(question.id, "fallback_personal_change")

    def test_structured_answers_can_reuse_screening(self) -> None:
        history = [{"question_type": "scale", "answer": "7"}]
        self.assertTrue(_last_answer_was_selection(history))

    def test_other_text_must_be_screened(self) -> None:
        history = [{
            "question_type": "single_choice",
            "answer": "something else",
            "answer_is_free_text": True,
        }]
        self.assertFalse(_last_answer_was_selection(history))
