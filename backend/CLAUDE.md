# HealthNav — Project Context for Claude Code

## What This Is

**HealthNav** is a web-based **Symptom Investigation & Doctor Prep Assistant** built around **dynamic AI agent orchestration** — not a chatbot. It investigates a user's symptoms via specialized agents and produces a **Doctor Visit Prep Card** the user can take to their appointment.

The core differentiator: **the agent path is not fixed**. A Supervisor agent reads intermediate results and decides which specialist agents fire next based on what the system discovers mid-flow.

### Concrete examples of dynamic routing
- Lifestyle agent finds 4hrs sleep → Supervisor triggers Eye/Posture agent
- Red Flag detector finds chest pain → emergency advisory fires immediately, bypasses normal flow
- Different symptoms = completely different agent routing paths

This is what makes it **agentic**, not a scripted form.

---

## Agent Roster

| Agent | Role | Notes |
|---|---|---|
| Supervisor | Orchestrates everything, decides routing | Reads outputs, picks next agent |
| Triage | Urgency classification | Always runs first |
| Symptom Deep-Dive | Targeted follow-up questions | Symptom-specific |
| Lifestyle | Sleep, diet, screen time, exercise | Conditional |
| Stress/Mental | Anxiety, mood, stress patterns | Conditional |
| Medication/Allergy | Current meds, supplements | Conditional |
| Eye/Posture | Screen + desk work specialist | Conditional |
| Red Flag Detector | Emergency symptom watcher | Runs in parallel always |
| Assembler | Final Doctor Prep Card generator | Runs last |

> **Note:** Detailed agent contracts (input schemas, output schemas, prompts, model assignments) are TBD — will be added to this doc as we build them. See `spec/healthnav_spec.md`.

---

## Tech Stack

```
Frontend     → React (Vite)
Backend      → Python 3.10+ (FastAPI)
LLM API      → OpenRouter (single key, multiple models)
PDF Export   → jsPDF (frontend, client-side)
Dev Hosting  → Local (uvicorn + vite dev server)
Prod Hosting → Vercel (frontend) + Railway (backend)
Version Ctrl → GitHub
```

### Model Strategy (via OpenRouter)
| Layer | Model | Why |
|---|---|---|
| Supervisor + Assembler | `anthropic/claude-sonnet-4` | Reasoning + routing decisions |
| Triage + Red Flag | `anthropic/claude-haiku-4-5` | Fast, cheap, runs often |
| Specialist Agents | `google/gemini-flash-2.0` | Cheap, good for structured Q&A |

---

## Project Structure

```
healthnav/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── agents/              # One file per agent
│   ├── venv/                # Python virtual env (gitignored)
│   ├── .env                 # OPENROUTER_API_KEY (gitignored)
│   └── requirements.txt
├── frontend/
│   └── src/                 # Vite + React app
├── spec/
│   └── healthnav_spec.md    # Living spec — update as built
├── .gitignore
└── CLAUDE.md                # This file
```

---

## Conventions & Constraints

### Code style
- **Python:** type hints everywhere, Pydantic models for all agent inputs/outputs, async functions for OpenRouter calls (`httpx.AsyncClient`)
- **React:** functional components + hooks, no class components, Tailwind not required (plain CSS modules fine)
- **No premature abstraction** — this is a sprint project. Build the simplest thing that works, refactor only when duplication hurts.

### Agent implementation pattern
Every agent should:
1. Be a Python class in `backend/agents/<agent_name>_agent.py`
2. Define a Pydantic input model and output model
3. Have an async `run()` method that calls OpenRouter
4. Return structured JSON — never free-form text the Supervisor has to parse with regex

### OpenRouter calls
- All calls go through a shared `backend/agents/openrouter_client.py` helper
- Never hardcode model names in agent files — pass them as constructor args or read from a config dict
- Always set `temperature` low (0.2–0.4) for routing/triage agents; medium (0.5–0.7) for conversational ones

### State management
- Backend is **stateless** for now — each request carries the full conversation/symptom context
- Frontend holds session state in React state (no Redux, no backend session store yet)
- If we add persistence later, it goes in a separate sprint

### Security & secrets
- `OPENROUTER_API_KEY` lives in `backend/.env` — never commit it
- No user PII storage in v1 — symptom data lives in browser memory only
- CORS on backend allows only `http://localhost:5173` in dev; update for Vercel domain in prod

---

## How to Work With Claude Code on This Project

1. **One agent at a time.** Don't ask Claude Code to "build the whole system." Feed it one agent spec, let it implement, test it, then move on.
2. **Reference this file.** When prompting, say "per CLAUDE.md conventions" — it'll respect the patterns above.
3. **Update this file as we build.** When an agent's contract is finalized, add its schema here so future sessions have the context.
4. **The spec file (`spec/healthnav_spec.md`) is the source of truth** for agent contracts and routing logic. CLAUDE.md gives the philosophy; the spec gives the details.

### Example good prompt
> "Per CLAUDE.md conventions, implement the Triage Agent in `backend/agents/triage_agent.py`. Use Pydantic for input/output, async OpenRouter call via the shared client, model = `anthropic/claude-haiku-4-5`. Input: `symptom_description: str`. Output: `urgency_level: Literal['emergency','urgent','routine']`, `reasoning: str`, `red_flags_detected: list[str]`."

### Example bad prompt
> "Build the HealthNav backend."

---

## Project Tooling

This project uses Claude Code custom skills and commands:
- Skills: `.claude/skills/agent-builder/`
- Commands: `.claude/commands/`

When building agents, prefer `/build-agent <name>` which loads the agent-builder skill

---

## Current Status

- [x] Folder structure created
- [x] GitHub repo: `https://github.com/mgurunath06/healthnav`
- [x] Python venv created, FastAPI deps installed
- [x] OpenRouter API key obtained
- [x] CLAUDE.md drafted (this file)
- [ ] Vite React app scaffolded in `frontend/`
- [ ] OpenRouter verification test
- [ ] Full spec written to `spec/healthnav_spec.md`
- [ ] Sprint hour-by-hour plan
- [ ] Agent implementations
- [ ] Frontend UI
- [ ] PDF export
- [ ] Vercel + Railway deployment

---

## Out of Scope (v1)

- User accounts / auth
- Backend persistence (DB)
- Multi-language support
- Mobile-native app
- Medical record integration (FHIR, etc.)
- Real medical advice — **this is a prep tool, not a diagnostic tool.** Every output must include a disclaimer that the user should consult a licensed physician.