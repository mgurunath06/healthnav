# Command: /update-spec

## Usage
```
/update-spec <section> <change_description>
```

## Examples
```
/update-spec 13.1 "Sprint 0 complete — Railway and Vercel deployed, health endpoint verified"
/update-spec 4.1 "Guardrail prompt updated to handle Hindi language inputs"
/update-spec 12 "Mark acceptance criterion 3 as complete"
```

## What this command does

1. Open `spec/healthnav_spec.md`
2. Navigate to the specified section number
3. Apply the described change:
   - For §13 (Implementation Notes): append sprint notes
   - For §12 (Acceptance Criteria): mark checkboxes complete
   - For any other section: show current content, propose edit, ask for confirmation before writing
4. Update the spec changelog at the top (increment patch version, e.g., v1.2 → v1.2.1)
5. Save the file

## Rules
- NEVER change §3 (Agent I/O Schemas), §4 (Supervisor Routing), or §5 (Doctor Prep Card Schema) without explicitly stating "I want to change a locked contract section"
- If asked to change a locked section, show a warning and ask for explicit confirmation
- Always show a diff of what changed before saving
- Changelog entry format: `- **v1.2.1** — [section]: [what changed]`

## Locked sections (require explicit confirmation to edit)
- §3 — Agent I/O Schemas
- §4 — Supervisor Routing Rules
- §5 — Doctor Prep Card Schema
- §6 — Agent Trace + Audit Logging schema