import unittest
from unittest.mock import AsyncMock, patch

from test_support import (
    install_asyncpg_stub_if_native_import_is_blocked,
    install_orjson_stub_if_native_import_is_blocked,
)

install_orjson_stub_if_native_import_is_blocked()
install_asyncpg_stub_if_native_import_is_blocked()

from agents.supervisor import Supervisor, progress_callback_var
from fastapi.testclient import TestClient
from main import app, _supervisor


class InvestigationStreamTests(unittest.TestCase):
    def test_supervisor_callback_receives_sanitized_progress_event(self):
        events = []
        supervisor = Supervisor()
        token = progress_callback_var.set(events.append)

        try:
            supervisor._log(
                "request-1",
                "agent_completed",
                agent="deep_dive",
                duration_ms=125,
                metadata={"private_detail": "must not be streamed"},
            )
        finally:
            progress_callback_var.reset(token)

        self.assertEqual(events, [{
            "event": "agent_completed",
            "agent": "deep_dive",
            "duration_ms": 125,
            "status": "ok",
        }])

    def test_route_negotiates_stream_and_json_responses(self):
        result = {
            "status": "needs_followup",
            "request_id": "request-1",
            "questions": [],
            "agent_trace": [],
        }
        payload = {
            "request_id": "request-1",
            "symptom_description": "Headache for two days",
        }
        client = TestClient(app)

        with patch.object(_supervisor, "run", new=AsyncMock(return_value=result)):
            json_response = client.post("/investigate", json=payload)
            self.assertEqual(json_response.status_code, 200)
            self.assertEqual(json_response.json(), result)

            stream_response = client.post(
                "/investigate",
                json=payload,
                headers={"Accept": "text/event-stream, application/json"},
            )
            self.assertEqual(stream_response.status_code, 200)
            self.assertTrue(stream_response.headers["content-type"].startswith("text/event-stream"))
            self.assertIn('"event":"final_result"', stream_response.text)
            self.assertIn('"status":"needs_followup"', stream_response.text)


if __name__ == "__main__":
    unittest.main()
