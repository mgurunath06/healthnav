import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.supervisor import Supervisor
from db.client import close_pool
from routers.cards import router as cards_router
from routers.chat import router as chat_router
from routers.documents import router as documents_router
from routers.profiles import router as profiles_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_pool()


app = FastAPI(title="HealthNav API", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/documents")
app.include_router(profiles_router, prefix="/profiles")
app.include_router(cards_router, prefix="/cards")
app.include_router(chat_router, prefix="/chat")

_supervisor = Supervisor()


# ── Request model ─────────────────────────────────────────────────────────────

class FollowUpHistoryItem(BaseModel):
    question_id:   str
    question_text: str
    question_type: str | None = None   # 'yes_no' | 'single_choice' | 'multi_choice' | 'scale'
    answer_is_free_text: bool = False
    answer:        str


class InvestigateRequest(BaseModel):
    request_id: str
    symptom_description: str = Field(min_length=10, max_length=2000)
    investigation_depth: int = Field(default=3, ge=1, le=5)
    follow_up_history: list[FollowUpHistoryItem] = []
    follow_up_answers: dict[str, str] | None = None
    screening_context: dict | None = None
    auth_token: str | None = None


# ── Exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
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
    return {"status": "ok", "version": "2.0", "tier_support": ["free", "premium"]}


@app.post("/investigate")
async def investigate(req: InvestigateRequest) -> dict:
    try:
        follow_up_history = [item.model_dump() for item in req.follow_up_history]
        if req.follow_up_answers and not follow_up_history:
            follow_up_history = [
                {
                    "question_id": key,
                    "question_text": key,
                    "question_type": None,
                    "answer": str(value),
                }
                for key, value in req.follow_up_answers.items()
            ]
        return await _supervisor.run(
            request_id=req.request_id,
            symptom_description=req.symptom_description,
            investigation_depth=req.investigation_depth,
            follow_up_history=follow_up_history,
            screening_context=req.screening_context,
        )
    except Exception:
        return {
            "status": "error",
            "request_id": req.request_id,
            "error_code": "AGENT_FAILURE",
            "message": "An unexpected error occurred. Please try again.",
        }
