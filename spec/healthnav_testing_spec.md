# HealthNav Automated Testing Specification

> **Status:** Active contract
> **Source:** Derived from `spec/healthnav_spec.md` and `spec/UIDeisgn.md`
> **Purpose:** Define repeatable, unattended checks for every release-critical user journey.

## 1. Test Strategy

HealthNav uses three test layers:

| Layer | Tool | Purpose | External services |
|---|---|---|---|
| Backend contract/unit | Python `unittest` | Agent routing, profile resolution, model configuration, depth rules | None |
| Frontend unit/integration | Vitest + Testing Library | Browser-storage rules, profile completeness, safe autofill | None |
| Browser E2E | Playwright | Real routes, screens, state transitions, auth/session UX | Mock API and test-only auth adapter |

Production Clerk, Railway Postgres, OpenRouter, Ollama, Google OAuth, and Vercel
are not required for the default suite. Their contracts are represented by
deterministic fixtures. Optional live smoke tests may be added separately and
must never replace deterministic CI.

## 2. Release Gate

A change is releasable only when these commands pass:

```text
Frontend lint
Frontend unit tests
Frontend production build
Backend unit/contract tests
Playwright Chromium journeys
```

`npm run test:all` runs the complete frontend gate. GitHub Actions runs both
frontend and backend gates for every push and pull request.

## 3. Authentication And Landing Scenarios

| ID | Scenario | Expected result |
|---|---|---|
| AUTH-01 | Signed-out user opens `/` | Public anonymous investigation page |
| AUTH-02 | User opens `/login` | `Remain logged in` is unchecked by default |
| AUTH-03 | User signs in | Redirect to `/dashboard` |
| AUTH-04 | Remembered session opens `/` | Redirect to `/dashboard` |
| AUTH-05 | Session-only login starts a new browser session | Retained auth is cleared; public `/` is shown |
| AUTH-06 | Signed-out user opens protected route | Redirect to `/login` |
| AUTH-07 | User logs out | Public `/` is shown |

The E2E suite uses `VITE_TEST_AUTH_MODE` through Vite mode `test-auth`. This
aliases Clerk to a local deterministic adapter. Normal development and production
builds continue importing the real `@clerk/clerk-react` package.

## 4. Progressive Profile Scenarios

| ID | Scenario | Expected result |
|---|---|---|
| PROF-01 | Incomplete profile opens dashboard | Dashboard renders; reminder is visible |
| PROF-02 | First signed-in investigation | Inline profile form is visible and skippable |
| PROF-03 | Profile form skipped | Investigation editor remains usable |
| PROF-04 | Later investigation with incomplete profile | Quiet reminder, no blocking form |
| PROF-05 | Complete profile | No completion reminder |
| PROF-06 | Explicit missing DOB answer | Missing DOB is patched |
| PROF-07 | Explicit missing sex answer | Missing sex is patched |
| PROF-08 | Existing demographic value | Never overwritten |
| PROF-09 | Demographic text inside symptom prose | Never inferred or persisted |

## 5. Investigation Response Scenarios

| ID | API status | Expected screen |
|---|---|---|
| INV-01 | `complete` | Doctor Prep Card with summary and disclaimer |
| INV-02 | `needs_followup` | Question wizard; answer resubmits same investigation |
| INV-03 | `emergency` | Emergency takeover with immediate-care advisory |
| INV-04 | `redirect` | Guardrail redirect with restart action |
| INV-05 | `error` | Error screen with retry action |

Additional backend tests retain coverage for deterministic depth budgets, model
routing, profile resolution, chat boundaries, and family-risk context.

## 6. Companion Record-Summary Scenarios

| ID | Scenario | Expected result |
|---|---|---|
| CHAT-01 | User asks for `all conditions` | Immediate structured summary; no clarification loop |
| CHAT-02 | User asks for `summary of all` | Conditions/findings, important results, recurring concerns |
| CHAT-03 | User answers `yes` after a summary offer | Prior summary intent is inherited and completed |
| CHAT-04 | Model asks `which condition?` after all-summary intent | Reply is rejected and retried |
| CHAT-05 | Companion model fails during all-summary intent | Deterministic record summary is returned |
| CHAT-06 | Record contains findings without explicit diagnosis | Findings remain labelled as findings, not diagnoses |

`backend/test_sprint2.py` is a manual live-server smoke script and is deliberately
excluded from unattended unit discovery because it requires a running API and LLM
provider. Deterministic CI runs the named backend unit modules instead.

## 7. Fixture Rules

- Fixtures must use synthetic identities and health statements.
- No production tokens, emails, documents, or medical records are permitted.
- API fixtures must match the current schemas in the main specification.
- Emergency and guardrail checks use the locked acceptance examples where possible.
- Tests may assert that disclaimers exist; they must not weaken or bypass them.

## 8. CI Environment

GitHub Actions uses Ubuntu, Node LTS, Python 3.12, and Playwright Chromium.
No secrets are required for the deterministic suite. A future Clerk-native smoke
job may use development-only `pk_test_*` and `sk_test_*` secrets.

## 9. Failure Artifacts

Playwright retains a trace and screenshot on failure. CI uploads the Playwright
report so a failed route can be replayed without reproducing it manually.

## 10. Maintenance Rule

When `healthnav_spec.md` changes a route, response shape, acceptance criterion, or
clinical boundary:

1. Update this testing specification in the same change.
2. Add or modify an automated test covering the new contract.
3. Do not mark the acceptance criterion complete until the test passes in CI.
