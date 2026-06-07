# HealthNav Enterprise Scale Review Response

> **Review disposition:** Accepted with corrections
> **Date:** 2026-06-07
> **Authority:** `healthnav_spec.md` remains the product contract.

## Executive Decision

The review correctly identifies companion token growth and perceived AI latency as
the most important scale risks. It also identifies useful future work in hybrid
retrieval, configurable reminder policy, upload preflight hashing, and broader
authentication.

Several claims do not match the current implementation, and two recommendations
would weaken HealthNav's clinical boundary if implemented literally.

## Finding Disposition

| Review finding | Decision | Current reality / action |
|---|---|---|
| Payment deferred | Accept | Monetization remains deferred pending incorporation. Add usage budgets before paid launch. |
| No response streaming | Modify | Add progress-event streaming first. Keep final clinical payload atomic and schema-validated. |
| Predictive diagnostics | Accept for closed pilot | Predictive diagnosis and proactive deterioration claims are authorized for authenticated users within the closed group pilot. |
| PDF export missing | Corrected | Print-to-PDF and shareable card capture are already implemented in `PrepCard.jsx`; the old spec text was stale. |
| Google-only authentication | Accept as roadmap | Add passkeys/email or Apple only after account recovery, identity-linking, and support flows are designed. |
| Companion context stuffing | Accept | Immediate bounded, query-relevant context selection implemented. Tool-based retrieval is the next architecture stage. |
| Client-side duplicate hash | Modify | Add preflight hash to save bandwidth, but retain server-side SHA-256 as the authoritative security check. |
| OCR before multimodal LLM | Modify | Benchmark document classes. OCR can reduce cost for clean text reports, while native vision remains useful for tables, scans, and layout. Any external OCR vendor requires PHI/privacy review. |
| Hardcoded test intervals | Accept concept, correct implementation status | The intervals are specified but no production reminder engine currently exists. Future rules must be configurable, evidence-versioned, and clinician-reviewed. |
| Basic vector search | Accept concept, correct implementation status | pgvector embedding retrieval is specified but not present in current backend runtime. Build hybrid structured filters + lexical + vector retrieval when implemented. |
| Redis investigation state | Defer | Current follow-up payloads are small and stateless replay aids resilience. Add encrypted short-lived server state only after measured payload/latency thresholds justify it. |

## Priority Sequence

### P0: Cost And Reliability

1. Enforce per-role token and cost budgets.
2. Record companion prompt-size telemetry without logging health content.
3. Use bounded query-relevant context.
4. Add deterministic fallbacks for record summaries and model failures.
5. Set account-level beta usage limits and abuse protection.

### P1: Retrieval Architecture

1. Introduce an internal context-retrieval interface.
2. Add structured filters for profile, date, abnormality, test name, and document type.
3. Add PostgreSQL full-text search for lexical and negation-sensitive retrieval.
4. Add vector retrieval only as one ranking signal.
5. Expose narrowly scoped read-only tools to the companion:
   - `get_health_values(names, date_range, abnormal_only)`
   - `search_document_findings(query, date_range)`
   - `get_past_briefs(symptom, date_range)`
   - `get_family_history(relative_ids)`
6. Log tool names, latency, and row counts, never raw health content.

### P1: Perceived Latency

1. Stream deterministic orchestration progress through SSE.
2. Preserve emergency and guardrail short-circuits.
3. Return the final clinical response as one validated JSON object.
4. Consider token streaming for companion prose only after moderation and storage
   semantics are defined.

### P1: Upload Efficiency

1. Compute SHA-256 in the browser using Web Crypto.
2. Call `POST /documents/check-hash` before multipart upload.
3. Retain authoritative server hashing after upload.
4. Benchmark native vision against OCR-plus-LLM by document subtype, cost,
   extraction accuracy, and latency.

### P2: Product Expansion

1. Payment and cost controls.
2. Additional authentication methods.
3. Configurable clinician-reviewed reminder rules.
4. PDF layout refinement beyond browser print.
5. Symptom trend visualization using recorded facts and non-causal language.

## Explicit Non-Goals

- No autonomous diagnosis.
- No predictive deterioration alert presented as a medical conclusion.
- No relative's condition promoted into the subject's diagnosis.
- No client hash trusted as proof of file identity.
- No retrieval system allowed to alter deterministic urgency/quadrant scoring.
