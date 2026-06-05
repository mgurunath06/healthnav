import os
from unittest import TestCase
from unittest.mock import patch

from agents.model_config import get_max_tokens, get_model_chain


class ModelRoutingTests(TestCase):
    def test_economy_roles_start_with_stable_flash(self) -> None:
        for role in ("screening", "deep_dive", "assembler", "companion", "doc_extraction"):
            with self.subTest(role=role):
                self.assertEqual(
                    get_model_chain(role, use_ollama=False)[0],
                    "google/gemini-2.5-flash",
                )

    def test_premium_roles_reserve_stronger_models_for_high_depth(self) -> None:
        self.assertEqual(
            get_model_chain("deep_dive_premium", use_ollama=False)[0],
            "google/gemini-2.5-pro",
        )
        self.assertEqual(
            get_model_chain("assembler_premium", use_ollama=False)[0],
            "anthropic/claude-sonnet-4-5",
        )

    def test_role_override_is_supported(self) -> None:
        with patch.dict(
            os.environ,
            {"HEALTHNAV_SCREENING_MODELS": "example/cheap, example/fallback"},
        ):
            self.assertEqual(
                get_model_chain("screening", use_ollama=False),
                ["example/cheap", "example/fallback"],
            )

    def test_all_production_roles_have_output_limits(self) -> None:
        for role in (
            "screening",
            "deep_dive",
            "deep_dive_premium",
            "assembler",
            "assembler_premium",
            "companion",
            "doc_extraction",
        ):
            with self.subTest(role=role):
                self.assertGreater(get_max_tokens(role), 0)
                self.assertLessEqual(get_max_tokens(role), 1800)
