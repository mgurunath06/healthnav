# Skill: Agent Builder

## When to use this skill
Load this skill whenever building, modifying, or testing any HealthNav agent.

---

## Agent file location pattern
```
backend/agents/<agent_name>_agent.py
```
Examples:
- `backend/agents/triage_agent.py`
- `backend/agents/guardrail_agent.py`
- `backend/agents/red_flag_agent.py`
- `backend/agents/deep_dive_agent.py`
- `backend/agents/lifestyle_agent.py`
- `backend/agents/assembler_agent.py`

---

## Mandatory file structure (every agent)

```python
"""
<AgentName> Agent
Spec reference: spec/healthnav_spec.md §<section>
Model: <model_string>
Runs: <when it runs — parallel/conditional/always last>
"""

from pydantic import BaseModel
from typing import Literal, Optional
from backend.agents.openrouter_client import call_openrouter
import logging

logger = logging.getLogger(__name__)


# --- Input Model ---
class <AgentName>Input(BaseModel):
    # fields exactly as defined in spec §<section>


# --- Output Model ---
class <AgentName>Output(BaseModel):
    # fields exactly as defined in spec §<section>


# --- Agent Class ---
class <AgentName>Agent:
    MODEL = "<model_string_from_spec>"
    TEMPERATURE = <temperature>
    SYSTEM_PROMPT = """<system prompt>"""

    async def run(self, input_data: <AgentName>Input) -> <AgentName>Output:
        """
        Runs the <AgentName> agent.
        Returns <AgentName>Output or raises AgentException on failure.
        """
        import time
        start = time.time()

        try:
            response = await call_openrouter(
                model=self.MODEL,
                system_prompt=self.SYSTEM_PROMPT,
                user_message=self._build_prompt(input_data),
                temperature=self.TEMPERATURE,
            )
            output = <AgentName>Output.model_validate_json(response)
            logger.info(f"<agent_name> completed in {int((time.time()-start)*1000)}ms")
            return output

        except Exception as e:
            logger.error(f"<agent_name> failed: {e}")
            raise

    def _build_prompt(self, input_data: <AgentName>Input) -> str:
        # Build the user message from input_data
        raise NotImplementedError
```

---

## Model assignments (from spec §4)
| Agent | Model | Temperature |
|---|---|---|
| Guardrail | `anthropic/claude-haiku-4-5` | 0.2 |
| Triage | `anthropic/claude-haiku-4-5` | 0.2 |
| Red Flag | `anthropic/claude-haiku-4-5` | 0.1 |
| Deep-Dive | `google/gemini-flash-2.0` | 0.5 |
| Lifestyle | `google/gemini-flash-2.0` | 0.5 |
| Assembler | `anthropic/claude-sonnet-4` | 0.4 |

---

## Pydantic rules
- Every agent has exactly ONE Input model and ONE Output model
- All fields must have types — no bare `dict` or `Any`
- Use `Literal` for enum fields (e.g., `Literal["emergency", "urgent", "routine"]`)
- Use `Optional[str]` for nullable fields — never `str | None` in Python 3.10
- Output models must match spec schemas **exactly** — field names, types, optionality

---

## OpenRouter client usage
```python
from backend.agents.openrouter_client import call_openrouter

response_str = await call_openrouter(
    model=self.MODEL,
    system_prompt=self.SYSTEM_PROMPT,
    user_message=prompt_string,
    temperature=self.TEMPERATURE,
)
```
- Always `await` — client is async
- Returns raw JSON string — validate with `OutputModel.model_validate_json(response_str)`
- Never parse manually with `json.loads` — always use Pydantic validation

---

## Error handling rules
- Wrap `call_openrouter` in try/except
- On failure, raise — the Supervisor handles per-agent failures per spec §6.3
- Log with `logger.error(f"<agent_name> failed: {e}")`
- Never swallow exceptions silently

---

## JSON output enforcement
Every agent system prompt MUST end with:
```
CRITICAL: Respond with ONLY valid JSON matching this exact schema. No preamble, no explanation, no markdown code blocks. Raw JSON only.
```

---

## Test file location
```
backend/tests/test_<agent_name>_agent.py
```

Every agent needs at minimum 3 tests:
1. Happy path — valid input, valid output
2. Edge case — boundary condition relevant to that agent
3. Bad output handling — what happens when LLM returns malformed JSON

---

## Checklist before marking agent complete
- [ ] Input model matches spec schema exactly
- [ ] Output model matches spec schema exactly
- [ ] Model string matches spec §4 table
- [ ] Temperature matches spec §4 table
- [ ] System prompt ends with JSON-only instruction
- [ ] `_build_prompt` implemented
- [ ] Error handling with logger.error
- [ ] Test file created with 3 tests
- [ ] Manually tested via pytest