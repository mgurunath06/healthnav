from unittest import TestCase

from test_support import (
    install_asyncpg_stub_if_native_import_is_blocked,
    install_orjson_stub_if_native_import_is_blocked,
)

install_orjson_stub_if_native_import_is_blocked()
install_asyncpg_stub_if_native_import_is_blocked()

from routers.chat import (
    _fallback_reply,
    _is_diagnostic_question,
    _is_record_summary_request,
    _is_unhelpful_summary_reply,
    _is_unhelpful_refusal,
    _select_context_for_message,
    _strip_standard_disclaimer,
)


class ChatResponseTests(TestCase):
    def test_diagnosis_question_gets_evidence_based_guidance(self):
        context = {
            "health_memory": {"summary": "Recurring headaches documented during summer."},
            "past_prep_cards": [
                {
                    "symptom_description": "Headache with light sensitivity",
                    "date": "2026-05-14",
                }
            ],
            "extracted_health_values": [],
            "document_findings": [],
        }

        reply = _fallback_reply("Based on my information, what do I have?", context)

        self.assertIn("relevant evidence", reply)
        self.assertIn("Recurring headaches", reply)
        self.assertIn("does not establish a diagnosis", reply)
        self.assertNotIn("general wellness information", reply.lower())

    def test_diagnosis_question_without_context_requests_clinical_details(self):
        reply = _fallback_reply(
            "What is wrong with me?",
            {
                "health_memory": {},
                "past_prep_cards": [],
                "extracted_health_values": [],
                "document_findings": [],
            },
        )

        self.assertIn("not enough specific symptom", reply)
        self.assertIn("non-diagnostic differential", reply)

    def test_standard_disclaimer_is_removed_from_generated_reply(self):
        reply = _strip_standard_disclaimer(
            "Here is the useful answer.\n\n"
            "This is general wellness information - not medical advice. Please discuss with your doctor."
        )

        self.assertEqual("Here is the useful answer.", reply)

    def test_detects_ailment_question_and_generic_refusal(self):
        self.assertTrue(
            _is_diagnostic_question(
                "Basis the information you have, what ailments do I have?"
            )
        )
        self.assertTrue(
            _is_unhelpful_refusal(
                "I cannot provide a diagnosis or tell you what ailments you have. "
                "Please consult with a doctor or other qualified healthcare provider.",
            )
        )

    def test_rejects_false_claim_that_health_context_is_unavailable(self):
        context = {
            "health_memory": {"summary": "Recurring headaches during summer."},
            "recent_user_health_statements": [],
        }

        self.assertTrue(
            _is_unhelpful_refusal(
                "I understand you're looking for a differential. However, I do not "
                "have access to any of your health records or information at this time.",
                context,
            )
        )

    def test_useful_differential_is_not_treated_as_refusal(self):
        self.assertFalse(
            _is_unhelpful_refusal(
                "I cannot diagnose, but the evidence could be consistent with migraine "
                "or tension headache. Migraine is one possibility because of light sensitivity."
            )
        )

    def test_report_summary_with_clinical_possibilities_is_useful(self):
        self.assertFalse(
            _is_unhelpful_refusal(
                "Documented in your records: the February 24, 2026 echocardiogram "
                "describes mild concentric LV hypertrophy and Grade I diastolic "
                "dysfunction. These findings may be consistent with effects of "
                "long-standing blood pressure, but the available evidence does not "
                "establish the cause."
            )
        )

    def test_all_conditions_request_gets_deterministic_record_summary(self):
        context = {
            "health_memory": {
                "summary": "Longitudinal record summary.",
                "durable_facts": ["Hypertension documented in a clinical record."],
                "notable_results": ["HbA1c was above the recorded reference range."],
                "recurring_concerns": ["Recurring knee pain."],
            },
            "document_findings": [
                {
                    "finding": "Mild concentric left ventricular hypertrophy.",
                    "recorded_date": "2026-02-24",
                }
            ],
            "extracted_health_values": [
                {
                    "value_name": "HbA1c",
                    "value_raw": "7.2",
                    "unit": "%",
                    "recorded_date": "2026-02-24",
                    "is_abnormal": True,
                }
            ],
            "past_prep_cards": [],
        }

        reply = _fallback_reply("Summary of all", context)

        self.assertIn("Documented conditions and findings", reply)
        self.assertIn("Hypertension documented", reply)
        self.assertIn("HbA1c 7.2 %", reply)
        self.assertNotIn("could not complete", reply.lower())
        self.assertNotIn("please confirm", reply.lower())

    def test_confirmation_inherits_prior_summary_request(self):
        history = [
            {
                "role": "assistant",
                "content": "Would you like a summary of all conditions? Please confirm.",
            }
        ]

        self.assertTrue(_is_record_summary_request("yes", history))

    def test_clarification_loop_is_rejected_for_summary_requests(self):
        self.assertTrue(
            _is_unhelpful_summary_reply(
                "Please specify which illness, or would you like a summary of all conditions?"
            )
        )

    def test_companion_context_is_bounded_and_query_relevant(self):
        values = [
            {"value_name": f"Test {index}", "value_raw": str(index), "is_abnormal": False}
            for index in range(20)
        ]
        values[17] = {
            "value_name": "HbA1c",
            "value_raw": "7.2",
            "unit": "%",
            "is_abnormal": True,
        }
        context = {
            "health_memory": {"summary": "Diabetes monitoring history."},
            "extracted_health_values": values,
            "document_findings": [],
            "past_prep_cards": [],
            "recent_user_health_statements": [],
            "family_profiles": [],
            "referenced_profile_ids": [],
        }

        selected = _select_context_for_message("Explain the HbA1c result", context)

        self.assertLessEqual(len(selected["extracted_health_values"]), 10)
        self.assertEqual("HbA1c", selected["extracted_health_values"][0]["value_name"])

    def test_full_summary_keeps_a_larger_but_bounded_context(self):
        context = {
            "health_memory": {},
            "extracted_health_values": [
                {"value_name": f"Test {index}", "value_raw": str(index)}
                for index in range(30)
            ],
            "document_findings": [],
            "past_prep_cards": [],
            "recent_user_health_statements": [],
            "family_profiles": [],
            "referenced_profile_ids": [],
        }

        selected = _select_context_for_message(
            "Summary of all",
            context,
            summary_request=True,
        )

        self.assertEqual(20, len(selected["extracted_health_values"]))
