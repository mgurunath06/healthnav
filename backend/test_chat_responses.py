from unittest import TestCase

from routers.chat import _fallback_reply, _strip_standard_disclaimer


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
