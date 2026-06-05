from types import SimpleNamespace
from unittest import TestCase

from pydantic import ValidationError

from agents.supervisor import _FOLLOWUP_BUDGETS, _findings_sufficient
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
        self.assertEqual(_FOLLOWUP_BUDGETS, {1: 0, 2: 2, 3: 4, 4: 6, 5: 8})

    def test_thorough_depth_does_not_stop_at_standard_threshold(self) -> None:
        findings = SimpleNamespace(
            duration="3 weeks",
            severity="moderate",
            frequency="daily",
            triggers=["screen use"],
        )
        history = [{"question_text": f"Question {i}"} for i in range(4)]

        self.assertTrue(_findings_sufficient(findings, history, 3))
        self.assertFalse(_findings_sufficient(findings, history, 4))
