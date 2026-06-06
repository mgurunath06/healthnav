# UI/UX Design Specification: HealthNav Frontend

**Document Version:** 1.4.0
**Project:** HealthNav — Symptom Investigation & Doctor Prep Assistant
**Stack:** React (Vite), Tailwind CSS, Zustand, Custom Hooks (FastAPI Backend)

---

## 1. Design Philosophy & Aesthetic
HealthNav is a structured AI agent orchestration tool, **not a chatbot**. 

The design language must reflect a **Fortune 10 Level UI**. The aesthetic is "premium healthcare meets editorial design." Reference points include Linear, Stripe, Apple Health, Mayo Clinic's premium tier, WSJ Magazine, and the Calm app.

**Strict Anti-Patterns:**
* ❌ NO "AI product" aesthetics (no chat bubbles, typing indicators, glowing borders, or sparkle icons).
* ❌ NO digital/futuristic colors (teal, cyan, neon purple, gradient blues).
* ❌ NO bouncy or playful animations.
* ❌ NO glassmorphism.

**Core Principles:**
* **Clinical Confidence:** Trustworthy, structured, and authoritative.
* **Progressive Disclosure:** Show only what is strictly necessary at each step.
* **Analogue Warmth:** Layered matte surfaces, warm shadows, and editorial typography.
* **Accessibility:** WCAG AA minimum contrast, keyboard navigable, mobile-first.
* **Distinctive editorial rhythm:** Prefer asymmetrical magazine-like compositions,
  ruled sections, large type, and purposeful color fields over repeated card grids.
* **No generic AI signifiers:** No medical emoji, sparkle language, glowing model
  states, floating mascots, or bubble-heavy assistant layouts.

### 1.1 Refined visual identity

The product identity uses a geometric crossing-path mark with a central point:
HealthNav helps separate signals meet in one useful brief. The same mark must be
used in the header, favicon, and install surfaces.

Accent usage expands carefully beyond Burnt Sienna:

| Accent | Hex | Use |
|---|---|---|
| Coral | `#EE704B` | Primary action and brand field |
| Marigold | `#E7AE49` | Progress, highlights, secondary action |
| Plum | `#8D657E` | Companion and reflective contexts |
| Sage | `#809A78` | Stable health history and positive state |

These colors appear as flat matte fields, never neon gradients or glows.

---

## 2. Color System: "Warm Slate"

All UI elements must utilize this specific token system. Blue-tinted blacks and cool greys are strictly prohibited.

### 2.1 Light Mode (Default): "Warm Paper"
| Role | Color Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | Warm Mineral | `#F2EDE4` | App background, primary wrapper |
| **Surface** | Soft Parchment | `#FFFAF2` | Cards, inputs, main containers |
| **Elevated** | Warm Putty | `#E9E1D5` | Hover states, secondary rows, skeletons |
| **Border** | Warm Linen | `#D0C5B7` | Dividers, quiet borders (1px) |
| **Text Primary** | Editorial Ink | `#29241F` | Headings, primary body copy |
| **Text Muted** | Warm Graphite | `#756D64` | Helper text, secondary labels, disabled text |
| **Accent Primary** | Burnt Sienna | `#B95538` | Primary CTAs, active states, focus rings |
| **Accent Hover** | Deep Sienna | `#98442D` | Hover state for primary CTAs |

Dark charcoal is reserved for high-contrast anchors and emergency CTAs. It must
not dominate ordinary signed-in screens. Accent colors should usually appear as
rules, icons, progress, or small fields rather than full-card backgrounds.

### 2.2 Semantic / Triage Quadrants
*Text contrast for quadrants must strictly follow the rules below to pass WCAG AA.*

| Role | Color Name | Hex Code | Text Contrast Pair |
| :--- | :--- | :--- | :--- |
| **Q1 (Emergency)**| Deep Terracotta | `#B84C3A` | explicit warm cream `#FFF8EF` |
| **Q2 (Warning)** | Warm Amber | `#C49A3C` | `text-warm-charcoal` |
| **Q3 (Success)** | Sage Green | `#6B8F71` | explicit warm cream `#FFF8EF` |
| **Q4 (Neutral)** | Warm Stone | `#7A7060` | explicit warm cream `#FFF8EF` |

---

## 3. Typography

The typographic hierarchy mimics a premium printed publication.

* **Display / Headings (Serif):** `Fraunces` or `Playfair Display`. Used for editorial authority.
* **Body / UI (Sans-Serif):** `Inter` or `DM Sans`. Clean, neutral, highly legible.
* **Data / Scores (Monospace):** `JetBrains Mono`. Used for timestamps, character counts, and severity badges.

**Scale & Spacing:**
* 12px / 14px / 16px / 20px / 24px / 32px / 48px.
* Tight line heights on headings; generous line heights on body text.
* Generous letter-spacing on uppercase monospace labels (e.g., `tracking-widest`).

---

## 4. UI Elements & Micro-Interactions

### 4.1 Depth & Texture
* **Shadows:** `shadow-matte` (`0 4px 20px -2px rgba(26, 24, 20, 0.4)`). Shadows must use warm, dark umber tones, never pure black or blue-black.
* **Borders:** 1px, low contrast (`border-warm-border`).
* **Icons:** Phosphor Icons (or custom geometric). No clip-art, no stethoscopes.

### 4.2 Motion ("Motion with Purpose")
* **Easing Curve:** `cubic-bezier(0.4, 0.0, 0.2, 1)` ("ease-editorial").
* **Page Transitions:** Smooth 400-600ms crossfade combined with a subtle upward
  reveal. Progress may use line wipes or restrained horizontal runners.
* **State Changes:** 250ms crossfade for background/border colors. A maximum
  4px lift may be used on large dashboard action fields; no popping or bounce.
* **Loading States:** Static blocks colored `bg-warm-elevated` with a slow, subtle opacity shift (opacity 0.6 to 0.8) over 2-3 seconds. **No spinners.**
* **Ambient motion:** The app canvas may contain one extremely slow matte color
  field drift (15-20 seconds). It must remain low contrast and stop under
  `prefers-reduced-motion`.
* **Section choreography:** Major dashboard/workspace sections reveal in a
  100-150ms stagger using opacity, a maximum 24px vertical movement, and a subtle
  `0.985 -> 1` scale settle.
* **Editorial rules:** Accent lines may draw from left to right on entry.
* **Hover behavior:** Premium action surfaces may lift up to 4px while their
  colored side rule expands slightly. No bounce, spring, glow, or parallax.

---

## 5. Screen Specifications

### Screen 1: Symptom Input (`<SymptomInput />`)
* **Authentication-aware layout:** The root route must wait for Clerk session
  restoration before choosing a layout. Never flash the anonymous screen to a
  returning signed-in user.
* **Anonymous layout:** Centered editorial landing composition with product
  explanation beside the symptom editor.
* **Signed-in layout:** A clearly different three-zone health workspace:
    * Left rail: greeting, active profile selector, Health Desk, document upload,
      and HealthNav companion navigation.
    * Center: the new investigation editor as the primary task.
    * Right rail: available personal context and a direct document-upload action.
* **Profile context:** Every signed-in investigation is attached to one explicit
  profile. Family profiles must never be visually or contextually mixed.
* **Input:** Single large, breathing `textarea` on a `bg-warm-surface`.
* **Interaction:** Focus state shifts border to Burnt Sienna over 300ms. Disable default browser focus rings (`focus:ring-0`).
* **Validation:** Minimum 10 characters to enable the "Investigate" CTA.
* **Anonymous investigation depth:** Fixed at level 2 ("Focused", up to one
  clarifying question). Do not render a selectable five-level control. A compact
  locked row may show the current depth. Selecting "Change pace" reveals inline
  copy explaining that adjustable depth requires sign-in/subscription.
* **Signed-in investigation depth:** Render a restrained clinical-depth dial,
  not five generic equal buttons. The control uses:
    * A matte semicircular gauge with a Marigold needle and Coral progress arc.
    * A native `range` input for keyboard and assistive-technology support.
    * Labels from Quick through Comprehensive.
    * A clear question budget and statement that safety screening is unchanged.
* **Footer:** Muted trust signals ("Your data stays private", "Not a diagnosis tool").

### Screen 2: Follow-up Question Wizard (`<QuestionWizard />`)
* **Layout:** One question at a time. No cards-within-cards.
* **Progress:** Thin Warm Amber (`Q2`) line at the top of the viewport. Step count in monospace below.
* **Question Types:**
    * `yes_no`: Two large rectangular/pill buttons. Selected state fills with Burnt Sienna.
    * `single_choice`: Selectable list rows. Warm border highlight on selected.
    * `multi_choice`: List rows. Selected state turns `bg-warm-elevated` with a Sienna checkmark.
    * `scale`: 1-10 custom slider. Sienna thumb, warm track. Large serif number display.
* **Navigation:** "Continue" primary button. "Back" is always a muted text link, never a button.
* **Personalized question copy:** For signed-in users, questions should naturally
  reference relevant known context when it changes what should be asked:
  "Your previous headache episodes followed poor sleep. How was your sleep before
  this began?" Avoid repeatedly announcing that the system has memory.
* **No generic repetition:** Do not ask for a fact already present in the active
  profile memory unless checking whether it has changed.

### Screen 3: Doctor Prep Card (`<PrepCard />`)
* **Layout:** Designed to look like a printable medical brief. White/Parchment background (if light mode) or elevated surface container.
* **Hero:** Contains the date (monospace) and the Triage Quadrant Badge (colored strictly per Section 2.2 rules).
* **Sections:** Summary, Key Findings, Questions for Doctor, Recommended Next Step. Separated by `border-warm-border` `<hr />` tags.
* **Highlighting:** Items like "Questions for Doctor" use a left border accent (`border-l-2 border-quadrant-q2`) on a `bg-warm-elevated` row.
* **CTAs:** "Save as PDF" (outlined Sienna) and "Start Over" (text link).

### Screen 4: Emergency Screen (`<EmergencyScreen />`)
* **Layout:** Full-screen takeover. Total stillness—no animations, no icons.
* **Color:** Entire background is `bg-quadrant-q1` (Deep Terracotta).
* **Typography:** Single large serif headline, calm but direct.
* **Primary Action:** "Call Emergency Services". Dynamically links to local dispatch (e.g., `tel:112` for India). Uses a heavy `bg-warm-charcoal` button to anchor the page.
* **Secondary Action:** "I'm Safe — Go Back" (low opacity text link).

### Screen 5: Redirect / Halt Screen (`<RedirectScreen />`)
* **Layout:** Centered modal-style card on `bg-warm-surface`.
* **Content:** Non-accusatory copy explaining why the AI halted the investigation.
* **Action:** Single primary button to "Restart Investigation".

### Screen 6: First-Login Profile Setup (`<ProfileOnboardingGate />`)
* **Trigger:** The first authenticated entry into any product surface, including the
  investigation route, dashboard, chat, upload, or family directory.
* **Required core fields:** Full name, date of birth, and sex recorded at birth.
  Relationship is fixed to `self`.
* **Optional identity fields:** Alternate names used on records and stable health
  context. These are available for every family profile as well.
* **Layout:** Calm editorial setup page, not a wizard. One form, visible purpose,
  no progress theatre.
* **Behavior:** Authenticated product screens remain behind the setup surface until
  the main profile has the required core fields.

### Screen 7: Family Health Directory (`<ProfileScreen />`)
* **Purpose:** Add, edit, maintain, and delete independent health profiles for the
  account holder and relatives.
* **Relationships:** Self, mother, father, wife, husband, spouse/partner, son,
  daughter, child, brother, sister, sibling, grandmother, grandfather, and other.
* **Profile fields:** Name, relationship to the account holder, date of birth, sex
  recorded at birth, alternate record names, and stable health context.
* **Directory rows:** Show age and counts for documents, doctor briefs, and chats.
* **Hierarchy:** Group profiles as parents/grandparents, account holder/partner,
  children, and siblings/extended family. Every person opens a dedicated viewer.
* **Deletion:** The self profile cannot be deleted. Deleting another profile requires
  a destructive confirmation showing the number of linked records and deletes that
  profile's health artifacts transactionally.
* **Zero-touch creation:** Natural references such as "my father" may create a
  missing relationship profile automatically. Extracted patient names may name a
  generic profile or create a new profile.

### Screen 8: Profile Viewer (`<ProfileDetailScreen />`)
* Shows identity, age, sex, stable notes, compact health memory, record counts,
  recent documents, and doctor briefs for one person.
* Primary actions are "Start investigation", "Chat about [name]", and "Upload a
  document". Each destination receives the profile ID and opens preselected.
* The viewer never mixes records from another profile. Family history remains
  available to agents through the cross-profile reasoning rules.

### 5.8 Profile-Aware Document Assignment
* Every uploaded document has exactly one subject profile.
* Patient names are matched against profile names and aliases.
* A high-confidence match overrides an incorrect manually selected profile before
  values, findings, and memory are persisted.
* Generic profiles such as "Me" or "Mother" may be renamed from a matched report.
* An unmatched patient name creates an independent profile automatically.
* The upload result states where the document was filed and exposes a correction
  selector. Reassignment moves values, findings, and document-derived memory.

### 5.9 Cross-Profile Interaction Rules
* A conversation or investigation has one primary subject profile.
* Explicit references to another profile load that person's detailed memory.
* All other family profiles contribute compact family-history summaries only.
* A fact stated about one unambiguously resolved person updates only that person's
  memory. Ambiguous multi-person statements are not written to any profile.
* Relatives' symptoms, tests, medicines, and diagnoses must never be merged into
  the primary subject's history.
* Family history may produce age- and context-aware questions or screening
  considerations, always naming the relative that supplies the evidence.

### Screen 6: Loading Screen (`<LoadingScreen />`)
* **Layout:** Centered, focused view with ample vertical whitespace.
* **Typography:** Slow-pulsing (3s duration) Serif heading ("Analyzing clinical findings..."). Monospace step counter below ("AGENT STEP 2 OF 4 COMPLETE").
* **Animation (The "Agent Trace"):** Strictly adheres to the no-spinner rule from §4.2. Uses a vertical stack of 1px or 4px lines. 
    * Completed steps turn `bg-sienna`.
    * The current step is `bg-warm-elevated` and pulses slowly.
    * Pending steps are flat `bg-warm-surface`.
* **Transitions:** Opacity and color shifts must take 1000ms using the `ease-editorial` curve to feel deliberate and methodical.

### Screen 7: Error Screen (`<ErrorScreen />`)
* **Layout:** Centered modal-style card on `bg-warm-surface`. 
* **Accent:** Card features a 4px top border of `border-quadrant-q1` (Deep Terracotta) to indicate a system fault without overwhelming the user with red.
* **Content:** Uses a monospace `text-quadrant-q1` overline ("SYSTEM ERROR"). Non-alarmist body copy explaining the interruption.
* **CTAs:** * **Primary:** "Retry Connection" (uses `bg-warm-elevated` to distinguish from a standard continuation action).
    * **Secondary:** "Return to Start" (text link with muted underline).

### Screen 8: Signed-in Health Workspace
* **Purpose:** Make the authenticated product feel like a persistent personal
  health desk, not the anonymous landing page with extra buttons.
* **Information hierarchy:** New investigation remains central. Records, chat,
  profile context, and uploads are visible as supporting tools rather than cards
  competing for equal attention.
* **Memory language:** Use calm phrases such as "Based on your history", "I
  notice", or "This may be a pattern worth discussing." Never use diagnostic or
  deterministic claims such as "Delhi does not suit your body."
* **Pattern evidence:** When showing an observation, include the evidence count
  and relevant dates, seasons, or places. Unusual correlations must explicitly
  acknowledge that coincidence is possible.

### Screen 9: Health Companion (`<ChatScreen />`)
* **Layout:** Editorial conversation view with ruled text blocks; no bubble-heavy
  messenger aesthetic.
* **Persistent profile:** A conversation is permanently scoped to one profile.
  Changing the global profile must not silently reassign an existing thread.
* **Personalized responses:** Relevant longitudinal memory, recent records, and
  the current conversation inform every answer.
* **Disclaimer:** Every assistant response ends with a muted medical-care
  disclaimer. The disclaimer must not overpower the useful response.
* **Memory controls:** Profile/settings surfaces must provide a readable summary
  of what HealthNav remembers and a clear destructive action to reset it.

---

## 6. Architecture & State Management

* **State Machine:** Managed globally via `Zustand`. The app operates on a strictly linear state machine: `input` -> `wizard` -> `prep_card` | `emergency` | `redirect` | `error` | `loading`.
* **Data Fetching:** A custom React hook (`useInvestigation()`) handles the `POST /investigate` calls to the FastAPI backend and dispatches state updates to Zustand based on the response payload.
* **Decoupling:** UI components must remain "dumb." They receive props (questions, choices) and emit events (`onNext`, `onBack`), while Zustand + the Hook handle the business logic and orchestration.
* **Authenticated state:** Zustand also holds the active `selectedProfileId` and
  investigation depth. Authenticated requests send the Clerk bearer token,
  profile ID, local date, season, and timezone.
* **Longitudinal memory:** The frontend never assembles medical memory itself.
  It selects the profile; the backend retrieves and updates the compact,
  profile-specific health memory.
