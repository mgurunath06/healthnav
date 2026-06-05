# UI/UX Design Specification: HealthNav Frontend

**Document Version:** 1.2.0
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

### 2.1 Dark Mode (Default)
| Role | Color Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | Warm Charcoal | `#1A1814` | App background, primary wrapper |
| **Surface** | Warm Dark Stone | `#242018` | Cards, inputs, main containers |
| **Elevated** | Warm Medium Stone | `#2E2A24` | Hover states, secondary cards, skeletons |
| **Border** | Warm Grey | `#3D3830` | Dividers, quiet borders (1px) |
| **Text Primary** | Warm Off-White | `#F0EBE3` | Headings, primary body copy |
| **Text Muted** | Warm Muted | `#9A9080` | Helper text, secondary labels, disabled text |
| **Accent Primary** | Burnt Sienna | `#C4622D` | Primary CTAs, active states, focus rings |
| **Accent Hover** | Deeper Sienna | `#A8501F` | Hover state for primary CTAs |

### 2.2 Semantic / Triage Quadrants
*Text contrast for quadrants must strictly follow the rules below to pass WCAG AA.*

| Role | Color Name | Hex Code | Text Contrast Pair |
| :--- | :--- | :--- | :--- |
| **Q1 (Emergency)**| Deep Terracotta | `#B84C3A` | `text-warm-off-white` |
| **Q2 (Warning)** | Warm Amber | `#C49A3C` | `text-warm-charcoal` |
| **Q3 (Success)** | Sage Green | `#6B8F71` | `text-warm-off-white` |
| **Q4 (Neutral)** | Warm Stone | `#7A7060` | `text-warm-off-white` |

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

---

## 5. Screen Specifications

### Screen 1: Symptom Input (`<SymptomInput />`)
* **Layout:** Centered, focused view.
* **Input:** Single large, breathing `textarea` on a `bg-warm-surface`.
* **Interaction:** Focus state shifts border to Burnt Sienna over 300ms. Disable default browser focus rings (`focus:ring-0`).
* **Validation:** Minimum 10 characters to enable the "Investigate" CTA.
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

---

## 6. Architecture & State Management

* **State Machine:** Managed globally via `Zustand`. The app operates on a strictly linear state machine: `input` -> `wizard` -> `prep_card` | `emergency` | `redirect` | `error` | `loading`.
* **Data Fetching:** A custom React hook (`useInvestigation()`) handles the `POST /investigate` calls to the FastAPI backend and dispatches state updates to Zustand based on the response payload.
* **Decoupling:** UI components must remain "dumb." They receive props (questions, choices) and emit events (`onNext`, `onBack`), while Zustand + the Hook handle the business logic and orchestration.
