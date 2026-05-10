---
name: trace-why
description: >
  Given a HealthNav input (symptom description) and the actual output/response it produced,
  explains WHY the program gave that answer — tracing the exact decision path, which agents
  fired, what they returned, which routing rule matched, and why the final response shape was
  chosen. Use this skill whenever the user asks "why did it return X", "why was this
  redirected", "why did emergency fire", "why didn't lifestyle run", "explain why the output
  was Y", "why did the guardrail block this", "trace why this happened", or pastes an input +
  output and wants to understand the reasoning. Also trigger when the user seems confused about
  an unexpected result or wants to debug a specific response.
---

# Trace-Why Skill

Given an input and the output HealthNav produced, reconstruct and explain the exact causal
chain — which agents ran, what they decided, which supervisor rule triggered, and why the
final response is what it is.

---

## What to extract from the user's message

| Parameter | What to look for |
|---|---|
| `input` | The symptom string sent to `/investigate` |
| `output` | The response status + key fields (e.g. `status: redirect, reason: prompt_injection`) |
| `agent_trace` | If the user pastes the full JSON response, extract the `agent_trace` array |
| `confusion` | What the user expected vs what they got (if stated) |

If the user only provides the input and not the output, ask: "What did the response come back as?"

---

## Output Structure

Always produce the explanation in this order:

### 1. Bottom line (1–2 sentences)
State plainly why this input got this output. No jargon.

Example: *"The guardrail agent flagged this as a prompt injection attempt with high confidence, so the supervisor short-circuited immediately and returned a redirect — no medical investigation happened at all."*

### 2. The decision chain
Walk through each decision point that mattered, in order. For each step:

**Format:**
```
[Agent/Component] → [What it saw] → [What it decided] → [Why]
```

Only include steps that actually influenced the outcome. Skip agents whose output
was irrelevant to the final result (but note they ran if they did).

### 3. The exact rule that fired
Quote the supervisor routing rule that matched, in plain English and as the Python condition:

Example:
> Rule matched: **Guardrail short-circuit**
> `if guardrail.should_proceed == False and guardrail.confidence == "high": → _redirect()`

Show where this sits in the routing priority order (1–6) so the user understands why
earlier rules didn't fire.

### 4. Why other paths were NOT taken
For each path that could have fired but didn't, one line explaining why:

Example:
> - Not `emergency`: red_flag and triage both ran but neither flagged urgency — but it didn't matter, guardrail already short-circuited before their results were checked
> - Not `needs_followup`: deep-dive never ran
> - Not `complete`: flow stopped at guardrail

### 5. If the result seems surprising or wrong
If the user expresses confusion or the result looks like a false positive/negative, explain:
- What the agent likely saw in the input that triggered its decision
- Whether this is expected behaviour per spec or a potential model error
- What a different input phrasing might produce

---

## Routing Priority Reference (for your reasoning)

Use this to explain why rules fire in order:

```
1. guardrail.should_proceed == False AND confidence == "high"  → redirect
2. red_flag.is_emergency == True                               → emergency
3. triage.urgency_level == "emergency"                         → emergency
4. deep_dive.needs_followup == True AND no answers             → needs_followup
5. should_run_lifestyle() conditions met                       → lifestyle branch
6. default                                                     → assembler → complete
```

Note: rules 1–3 are checked AFTER all three parallel agents finish. The parallel trio
always runs fully — short-circuit means the *subsequent* agents (deep-dive, lifestyle,
assembler) don't run, not that the parallel agents stop mid-flight.

---

## Lifestyle Trigger Conditions Reference

If the question is about why lifestyle did or didn't run:

Lifestyle runs if ANY of these are true:
- `triage.category` is `general`, `neurological`, or `musculoskeletal`
- `deep_dive.triggers` contains `stress`, `screen_time`, `work`, or `sleep`
- `deep_dive.associated_symptoms` contains `fatigue` or `headache`

---

## Agent Failure Reference

If an agent failed and the user wants to know why the response still came back:

| Agent | Failure fallback |
|---|---|
| Guardrail fails | Treated as `should_proceed=true` — flow continues |
| Triage fails | Treated as `urgency=routine, category=general` — flow continues |
| Red Flag fails | Treated as `is_emergency=false` — flow continues |
| Deep-Dive fails | Assembler runs with available data, card marked incomplete |
| Lifestyle fails | Skipped silently, assembler runs |
| Assembler fails | Returns `error` with raw agent outputs |

---

## Tone Rules

- Lead with the "why" — not the "what happened step by step"
- Be direct: "The guardrail blocked it because..." not "Let us examine what occurred..."
- If the user is debugging unexpected behaviour, acknowledge it: "This looks like a false positive — here's why the model likely made that call"
- Keep technical depth proportional to what the user asked — a casual "why did this get blocked?" needs a plain answer, not a full JSON trace
- Never list agents that didn't affect the outcome as if they matter

---

## Example Invocations

> "why did 'ignore previous instructions' get redirected?"
→ Guardrail saw prompt injection pattern, high confidence, rule 1 fired

> "why did chest pain trigger emergency but not 'my chest feels tight'?"
→ Compare red_flag trigger conditions for both inputs

> "why did lifestyle run for headaches but not for broken finger?"
→ Explain should_run_lifestyle() conditions, show which matched and which didn't

> "the guardrail blocked 'my head feels like it's exploding' — is that right?"
→ This is a false positive case — explain the vivid symptom rule and what should have happened

> "why did I get needs_followup instead of complete?"
→ deep_dive returned needs_followup=true and no follow_up_answers were in the request