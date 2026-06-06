import os
import math
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from auth import verify_clerk_token
from pydantic import BaseModel, Field

from agents.supervisor import Supervisor
from db.client import close_pool, get_pool
from db.health_memory import (
    ensure_health_memory_schema,
    get_health_memory,
    merge_health_memory,
)
from db.users import ensure_user
from routers.cards import router as cards_router
from routers.chat import router as chat_router
from routers.documents import router as documents_router
from routers.profiles import router as profiles_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await get_pool()
    if pool is not None:
        async with pool.acquire() as conn:
            await ensure_health_memory_schema(conn)
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
    profile_id: str | None = None
    client_context: dict | None = None


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
async def investigate(
    req: InvestigateRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    investigation_depth = 2
    personal_context: dict | None = None
    user_id: str | None = None
    profile_id = None
    pool = None
    if authorization:
        clerk_user_id = await verify_clerk_token(authorization)
        investigation_depth = req.investigation_depth
        pool = await get_pool()
        if pool is not None:
            async with pool.acquire() as conn:
                user_id = await ensure_user(conn, clerk_user_id)
                profile_id = _parse_optional_uuid(req.profile_id)
                if profile_id is None:
                    profile_id = await conn.fetchval(
                        """
                        SELECT id
                        FROM profiles
                        WHERE user_id = $1
                        ORDER BY CASE
                          WHEN COALESCE(relation, relationship) = 'self' THEN 0
                          ELSE 1
                        END, created_at ASC
                        LIMIT 1
                        """,
                        user_id,
                    )
                if profile_id is not None:
                    owner = await conn.fetchval(
                        "SELECT 1 FROM profiles WHERE id = $1 AND user_id = $2",
                        profile_id,
                        user_id,
                    )
                    if owner is None:
                        return {"status": "error", "message": "Invalid health profile."}
                personal_context = await get_health_memory(conn, user_id, profile_id)
                user_location = await conn.fetchrow(
                    "SELECT location_city, location_country FROM users WHERE id = $1",
                    user_id,
                )
                personal_context["current_context"] = {
                    **(req.client_context or {}),
                    "location_city": user_location["location_city"] if user_location else None,
                    "location_country": user_location["location_country"] if user_location else None,
                }

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
        result = await _supervisor.run(
            request_id=req.request_id,
            symptom_description=req.symptom_description,
            investigation_depth=investigation_depth,
            follow_up_history=follow_up_history,
            screening_context=req.screening_context,
            personal_context=personal_context,
        )
        if (
            result.get("status") == "complete"
            and pool is not None
            and user_id is not None
        ):
            card = result.get("doctor_prep_card") or {}
            episode = _episode_memory(req.symptom_description, card, req.client_context, personal_context)
            async with pool.acquire() as conn:
                await merge_health_memory(
                    conn,
                    user_id,
                    profile_id,
                    recurring_concerns=[req.symptom_description],
                    recent_episodes=[episode],
                    source="investigation",
                )
        return result
    except Exception:
        return {
            "status": "error",
            "request_id": req.request_id,
            "error_code": "AGENT_FAILURE",
            "message": "An unexpected error occurred. Please try again.",
        }


def _parse_optional_uuid(value: str | None):
    if not value:
        return None
    try:
        import uuid
        return uuid.UUID(value)
    except ValueError:
        return None


def _episode_memory(
    symptom_description: str,
    card: dict,
    client_context: dict | None,
    personal_context: dict | None,
) -> str:
    context = client_context or {}
    current = (personal_context or {}).get("current_context") or {}
    date = str(context.get("local_date") or "date unknown")
    season = str(context.get("season") or "season unknown")
    weekday = _weekday(date)
    moon_phase = _moon_phase(date)
    location = ", ".join(
        part for part in (
            current.get("location_city"),
            current.get("location_country"),
        ) if part
    ) or str(context.get("timezone") or "location unknown")
    summary = card.get("summary") or symptom_description
    return (
        f"[date={date}; weekday={weekday}; season={season}; location={location}; "
        f"lunar_phase={moon_phase}] {summary}"
    )


def _weekday(value: str) -> str:
    try:
        return date.fromisoformat(value).strftime("%A")
    except ValueError:
        return "unknown"


def _moon_phase(value: str) -> str:
    """Approximate lunar phase for pattern metadata; never treated as a medical cause."""
    try:
        day = date.fromisoformat(value)
    except ValueError:
        return "unknown"
    known_new_moon = date(2000, 1, 6)
    cycle_days = 29.53058867
    age = ((day - known_new_moon).days % cycle_days) / cycle_days
    index = int(math.floor((age * 8) + 0.5)) % 8
    return (
        "new_moon",
        "waxing_crescent",
        "first_quarter",
        "waxing_gibbous",
        "full_moon",
        "waning_gibbous",
        "last_quarter",
        "waning_crescent",
    )[index]
