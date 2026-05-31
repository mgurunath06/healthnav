import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.supervisor import Supervisor
from db.client import close_pool
from routers.documents import router as documents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_pool()


app = FastAPI(title="HealthNav API", version="1.2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/documents")

_supervisor = Supervisor()


# ── Request model ─────────────────────────────────────────────────────────────

class FollowUpHistoryItem(BaseModel):
    question_id:   str
    question_text: str
    question_type: str | None = None   # 'yes_no' | 'single_choice' | 'multi_choice' | 'scale'
    answer:        str


class InvestigateRequest(BaseModel):
    request_id: str
    symptom_description: str = Field(min_length=10, max_length=2000)
    follow_up_history: list[FollowUpHistoryItem] = []


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
    return {"status": "ok", "version": "1.2"}


@app.post("/investigate")
async def investigate(req: InvestigateRequest) -> dict:
    try:
        return await _supervisor.run(
            request_id=req.request_id,
            symptom_description=req.symptom_description,
            follow_up_history=[item.model_dump() for item in req.follow_up_history],
        )
    except Exception:
        return {
            "status": "error",
            "request_id": req.request_id,
            "error_code": "AGENT_FAILURE",
            "message": "An unexpected error occurred. Please try again.",
        }
