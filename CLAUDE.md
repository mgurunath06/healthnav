# HealthNav — Project Context for Claude Code

## What This Is

**HealthNav** is a web-based **Symptom Investigation & Doctor Prep Assistant** built around **dynamic AI agent orchestration** — not a chatbot. It investigates a user's symptoms via specialized agents and produces a **Doctor Visit Prep Card** the user can take to their appointment.

The core differentiator: **the agent path is not fixed**. A Supervisor reads intermediate results and decides which specialist agents fire next based on what the system discovers mid-flow.

### Concrete examples of dynamic routing
- Lifestyle agent finds screen/stress triggers → Supervisor runs it, Deep-Dive findings inform Assembler
- Red Flag detector finds chest pain → emergency advisory fires immediately, bypasses normal flow
- Guardrail detects prompt injection → redirect response, no medical investigation happens
- Different symptoms = completely different agent routing paths

This is what makes it **agentic**, not a scripted form.

---

## Agent Roster (v1 — implemented)

| Agent | Role | Runs |
|---|---|---|
| Guardrail | Misuse/injection detection | Parallel, always |
| Triage | Urgency + category classifier | Parallel, always |
| Red Flag Detector | 10-flag emergency scanner | Parallel, always |
| Symptom Deep-Dive | Follow-up questions, structured findings | After parallel trio |
| Lifestyle | Sleep, screen, stress, exercise | Conditional |
| Supervisor | Deterministic Python routing | Orchestrates all |
| Assembler | Doctor Prep Card + Quadrant scores | Always last |

> Full agent contracts (input/output schemas, prompts, model assignments) are in `spec/healthnav_spec.md`. That file is the source of truth — not this one.

---

## Tech Stack

```
Frontend     → React (Vite)
Backend      → Python 3.10+ (FastAPI)
LLM (local)  → Ollama (local dev, no API key needed)
LLM (prod)   → OpenRouter (single key, multiple models)
Dev Hosting  → Local (uvicorn + vite dev server)
Prod Hosting → Vercel (frontend) + Railway (backend)
Version Ctrl → GitHub
```

### Model Strategy

| Layer | Local Dev (Ollama) | Production (OpenRouter) |
|---|---|---|
| Supervisor + Assembler | `gemma4:latest` | `anthropic/claude-sonnet-4` |
| Triage + Red Flag + Guardrail | `llama3.1:8b` | `anthropic/claude-haiku-4-5` |
| Deep-Dive + Lifestyle | `gemma4:latest` | `google/gemini-flash-2.0` |

Switch via `LLM_PROVIDER` env var in `backend/.env`: `ollama` (default) or `openrouter`.

---

## Project Structure

```
healthnav/
├── .claude/
│   ├── commands/
│   │   ├── build-agent.md       # /build-agent <name>
│   │   ├── test-routing.md      # /test-routing
│   │   └── update-spec.md       # /update-spec
│   ├── skills/
│   │   ├── agent-builder/       # Agent implementation conventions
│   │   │   └── SKILL.md
│   │   └── trace-why/           # Explain why input → output (debugging)
│   │       └── SKILL.md
│   ├── settings.json
│   └── settings.local.json
├── backend/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── openrouter_client.py  # LLM client — Ollama + OpenRouter, model mapping
│   │   ├── guardrail_agent.py
│   │   ├── triage_agent.py
│   │   ├── red_flag_detector.py
│   │   └── supervisor.py         # Orchestrator + routing + audit logging
│   ├── venv/                     # gitignored
│   ├── .env                      # gitignored
│   ├── main.py                   # FastAPI: POST /investigate, GET /health
│   ├── requirements.txt
│   └── test_api.ps1              # Manual test script
├── frontend/
│   └── src/                      # Empty — Sprint 3
├── spec/
│   └── healthnav_spec.md         # Living spec v1.3 — source of truth
├── CLAUDE.md                     # This file
└── .gitignore
```

---

## Conventions & Constraints

### Code style
- **Python:** type hints everywhere, Pydantic models for all agent I/O, async functions for LLM calls (`httpx.AsyncClient`)
- **React:** functional components + hooks, no class components, Tailwind CSS with custom Warm Slate token config (see `spec/UIDeisgn.md` §2)
- **No premature abstraction** — sprint project. Simplest thing that works.

### Agent implementation pattern
Every agent must:
1. Be a Python class in `backend/agents/<agent_name>_agent.py`
2. Define a Pydantic input model and output model
3. Have an async `run()` method that calls the shared LLM client
4. Return strict JSON — never free-form text the Supervisor has to parse

### LLM calls
- All calls go through `backend/agents/openrouter_client.py`
- Never hardcode model names in agent files — the client handles model mapping per environment
- `temperature` 0.2–0.4 for routing/triage agents; 0.5–0.7 for generative agents
- Ollama does not support `response_format: json_object` — use prompt-level JSON enforcement only
- Always call `_strip_think_tags()` on Ollama responses before parsing

### Supervisor routing (deterministic Python — not LLM)
Priority order:
1. `guardrail.should_proceed == False AND confidence == "high"` → redirect
2. `red_flag.is_emergency == True` → emergency
3. `triage.urgency_level == "emergency"` → emergency
4. `deep_dive.needs_followup == True AND no answers` → needs_followup
5. `should_run_lifestyle()` conditions → lifestyle branch
6. default → assembler → complete

### State management
- Backend is **stateless** — each `/investigate` call carries full context
- Frontend holds session state in Zustand (`useInvestigationStore`) — no Redux, no backend session. UI components are dumb (props in, events out).
- `request_id` (UUID v4) generated by frontend, echoed in every response

### Security & secrets
- `OPENROUTER_API_KEY` and `LLM_PROVIDER` live in `backend/.env` — never commit
- No user PII storage in v1 — symptom data lives in browser memory only
- Audit logs hash symptom text (SHA-256), never log raw input
- CORS: `http://localhost:5173` in dev; Vercel domain in prod

---

## Skills Available

### `trace-why`
**When to use:** When you need to understand why a specific input produced a specific output.
Trigger with: *"why did X get redirected?"*, *"why didn't lifestyle run?"*, *"why did this trigger emergency?"*
The skill traces the exact decision path — which agents fired, what they returned, which routing rule matched.

### `agent-builder`
**When to use:** When implementing a new agent.
Trigger with: `/build-agent <name>`
Loads agent conventions, Pydantic patterns, prompt structure, and retry logic.

---

## How to Work With Claude Code on This Project

1. **One agent at a time.** Don't ask Claude Code to "build the whole system."
2. **Reference this file.** When prompting, say "per CLAUDE.md conventions."
3. **The spec is the source of truth.** `spec/healthnav_spec.md` has all contracts. CLAUDE.md has the philosophy.
4. **Update spec first.** If a decision changes, update `healthnav_spec.md` before changing code.

### Example good prompt
> "Per CLAUDE.md conventions, implement the Deep-Dive Agent in `backend/agents/deep_dive_agent.py`. Use Pydantic for I/O, async LLM call via the shared client, local model = `gemma4:latest`. Input/output schema per spec §5.4."

### Example bad prompt
> "Build the HealthNav backend."

---

## Current Status

### Done
- [x] Folder structure + GitHub repo
- [x] Python venv + FastAPI deps
- [x] Ollama local setup (gemma4, llama3.1:8b)
- [x] `openrouter_client.py` — Ollama + OpenRouter, model mapping, retry, strip think tags
- [x] `guardrail_agent.py`, `triage_agent.py`, `red_flag_detector.py`
- [x] `supervisor.py` — parallel trio, routing rules, audit logging
- [x] `main.py` — POST /investigate, GET /health, Pydantic validation
- [x] `test_api.ps1` — Sprint 1 tests passing
- [x] `spec/healthnav_spec.md` v1.3
- [x] `.claude/skills/trace-why/` installed
- [x] CLAUDE.md updated (this file)

### Up next — Sprint 2
- [ ] `deep_dive_agent.py`
- [ ] `lifestyle_agent.py`
- [ ] `assembler_agent.py` + quadrant scoring
- [ ] Supervisor routing — full 9 paths
- [ ] Sprint 2 test pass

### Pending
- [ ] Frontend (Sprint 3)
- [ ] Final deploy (Sprint 4)

---

## Out of Scope (v1)

- User accounts / auth
- Backend persistence (DB)
- Streaming responses
- PDF export
- Gamification
- Symptom history / correlation
- Multi-language support
- Real medical advice — **this is a prep tool, not a diagnostic tool.** Every output must include a disclaimer to consult a licensed physician.