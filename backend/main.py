from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.supervisor import Supervisor

app = FastAPI(title="HealthNav API", version="1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single supervisor instance — stateless agents, safe for concurrent requests
_supervisor = Supervisor()


# ── Request model ─────────────────────────────────────────────────────────────

class InvestigateRequest(BaseModel):
    request_id: str
    symptom_description: str = Field(min_length=10, max_length=2000)
    follow_up_answers: dict[str, str] = {}


# ── Exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Extract request_id from body if available so the response can be traced
    try:
        body = await request.json()
        request_id = body.get("request_id", "unknown")
    except Exception:
        request_id = "unknown"

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "request_id": request_id,
            "error_code": "INVALID_INPUT",
            "message": str(exc.errors()[0]["msg"]) if exc.errors() else "Invalid request",
        },
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.1"}


@app.post("/investigate")
async def investigate(req: InvestigateRequest) -> dict:
    try:
        return await _supervisor.run(
            request_id=req.request_id,
            symptom_description=req.symptom_description,
            follow_up_answers=req.follow_up_answers,
        )
    except Exception:
        return {
            "status": "error",
            "request_id": req.request_id,
            "error_code": "AGENT_FAILURE",
            "message": "An unexpected error occurred. Please try again.",
        }
