import { useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChatCircleText,
  FileArrowUp,
  FolderOpen,
  LockKey,
  NotePencil,
} from '@phosphor-icons/react'
import { useInvestigation } from '../hooks/useInvestigation'
import { useInvestigationStore } from '../store/useInvestigationStore'
import Header from './Header'

const MIN_CHARS = 10
const MAX_CHARS = 2000

const DEPTH_OPTIONS = [
  { level: 1, label: 'Quick', detail: 'No follow-ups' },
  { level: 2, label: 'Focused', detail: 'Up to 1 question' },
  { level: 3, label: 'Standard', detail: 'Up to 2 questions' },
  { level: 4, label: 'Thorough', detail: 'Up to 4 questions' },
  { level: 5, label: 'Comprehensive', detail: 'Up to 6 questions' },
]

export default function SymptomInput() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const [text, setText] = useState('')
  const [showPaceNotice, setShowPaceNotice] = useState(false)
  const investigationDepth = useInvestigationStore((s) => s.investigationDepth)
  const setInvestigationDepth = useInvestigationStore((s) => s.setInvestigationDepth)
  const { investigate } = useInvestigation()
  const canSubmit = text.trim().length >= MIN_CHARS

  function handleSubmit(e) {
    e.preventDefault()
    if (canSubmit) investigate(text.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSubmit) investigate(text.trim())
    }
  }

  const editor = (
    <InvestigationEditor
      text={text}
      canSubmit={canSubmit}
      isSignedIn={isSignedIn}
      investigationDepth={isSignedIn ? investigationDepth : 2}
      showPaceNotice={showPaceNotice}
      onTextChange={setText}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
      onDepthChange={setInvestigationDepth}
      onShowPaceNotice={() => setShowPaceNotice(true)}
    />
  )

  return (
    <div className="app-canvas flex min-h-dvh flex-col bg-warm-charcoal">
      <Header />

      {isSignedIn ? (
        <MemberWorkspace user={user} editor={editor} />
      ) : (
        <GuestLanding editor={editor} />
      )}

      <footer className="border-t border-warm-border/60 px-5 py-5 text-center font-sans text-xs text-warm-muted">
        HealthNav organizes information for a medical conversation. It does not diagnose or replace professional care.
      </footer>
    </div>
  )
}

function GuestLanding({ editor }) {
  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 py-12 lg:grid-cols-[0.84fr_1.16fr] lg:px-8 lg:py-16">
      <section className="max-w-xl animate-fade-in-up">
        <p className="eyebrow mb-6">Before the appointment</p>
        <h1 className="text-balance font-serif text-5xl font-light leading-[0.98] tracking-[-0.045em] text-warm-off-white sm:text-6xl lg:text-7xl">
          Arrive with the
          <span className="block italic text-accent">right story.</span>
        </h1>
        <p className="mt-7 max-w-lg font-sans text-base leading-7 text-warm-muted sm:text-lg">
          Turn scattered symptoms into a calm, useful brief for your doctor.
          No diagnosis. No medical theatre. Just a clearer conversation.
        </p>

        <div className="mt-10 grid grid-cols-3 border-y border-warm-border/80 py-5">
          {[
            ['01', 'Describe naturally'],
            ['02', 'Clarify what matters'],
            ['03', 'Take the brief'],
          ].map(([number, label]) => (
            <div key={number} className="border-r border-warm-border/60 pr-4 last:border-r-0 last:pl-4">
              <span className="font-mono text-xs text-marigold">{number}</span>
              <p className="mt-2 font-sans text-xs leading-5 text-warm-muted sm:text-sm">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-warm-muted">
          <span className="inline-flex items-center gap-2"><LockKey size={16} /> Private by design</span>
          <span className="inline-flex items-center gap-2"><Check size={16} /> Clinician-ready format</span>
        </div>
      </section>

      <section className="animate-fade-in-up-2">{editor}</section>
    </main>
  )
}

function MemberWorkspace({ user, editor }) {
  const name = user?.firstName || 'there'

  return (
    <main className="mx-auto grid w-full max-w-[90rem] flex-1 gap-0 px-5 py-8 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)_18rem] lg:py-10">
      <aside className="animate-fade-in-up border-b border-warm-border/70 pb-7 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-7">
        <p className="eyebrow">Personal workspace</p>
        <h1 className="mt-4 font-serif text-3xl font-light leading-tight text-warm-off-white">
          Good to see you, {name}.
        </h1>
        <p className="mt-3 text-sm leading-6 text-warm-muted">
          Your records and past briefs can now inform a more useful conversation.
        </p>

        <nav className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Health workspace">
          <WorkspaceLink to="/dashboard" icon={<FolderOpen size={18} />} label="Health desk" />
          <WorkspaceLink to="/dashboard/upload" icon={<FileArrowUp size={18} />} label="Add document" />
          <WorkspaceLink to="/chat" icon={<ChatCircleText size={18} />} label="Ask HealthNav" />
        </nav>
      </aside>

      <section className="animate-fade-in-up-2 py-8 lg:px-10 lg:py-0">
        <div className="mb-7 flex flex-col justify-between gap-4 border-b border-warm-border/70 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">New investigation</p>
            <h2 className="mt-3 font-serif text-4xl font-light tracking-[-0.04em] text-warm-off-white sm:text-5xl">
              What should we prepare for?
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-warm-muted">
            Start with what changed. HealthNav will structure the details.
          </p>
        </div>
        {editor}
      </section>

      <aside className="animate-fade-in-up-3 border-t border-warm-border/70 pt-7 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <p className="eyebrow">Available to this brief</p>
        <div className="mt-5 space-y-6">
          <ContextRow index="01" title="Saved history" body="Past doctor briefs stay available in your health desk." />
          <ContextRow index="02" title="Health documents" body="Upload reports and results to keep useful context together." />
          <ContextRow index="03" title="Adjustable depth" body="Choose how thorough this investigation should be." />
        </div>

        <Link
          to="/dashboard/upload"
          className="mt-8 flex items-center justify-between border-y border-warm-border py-4 text-sm text-warm-off-white transition-colors hover:text-marigold"
        >
          Add context from a report
          <ArrowRight size={17} />
        </Link>
      </aside>
    </main>
  )
}

function InvestigationEditor({
  text,
  canSubmit,
  isSignedIn,
  investigationDepth,
  showPaceNotice,
  onTextChange,
  onKeyDown,
  onSubmit,
  onDepthChange,
  onShowPaceNotice,
}) {
  const selectedOption = DEPTH_OPTIONS[investigationDepth - 1]

  return (
    <form onSubmit={onSubmit} className="editorial-panel relative overflow-hidden rounded-[2rem]">
      <div className="absolute left-0 top-0 h-1 w-2/5 bg-accent" />
      <div className="border-b border-warm-border/70 px-6 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Your health note</p>
            <p className="mt-1 font-serif text-2xl text-warm-off-white">What has changed?</p>
          </div>
          <NotePencil size={25} weight="light" className="text-marigold" />
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={onKeyDown}
          placeholder="Write it as you would tell someone you trust: when it started, what it feels like, what makes it better or worse..."
          rows={isSignedIn ? 7 : 8}
          className="w-full resize-none border-0 bg-transparent font-serif text-xl font-light leading-8 text-warm-off-white outline-none placeholder:text-warm-muted/55 sm:text-2xl"
        />
        <div className="mt-4 flex items-center justify-between border-t border-warm-border/60 pt-4">
          <p className="font-sans text-xs text-warm-muted">Press Shift + Enter for a new line</p>
          <span className="font-mono text-xs tabular-nums text-warm-muted">{text.length}/{MAX_CHARS}</span>
        </div>

        {isSignedIn ? (
          <PaceDial
            value={investigationDepth}
            selectedOption={selectedOption}
            onChange={onDepthChange}
          />
        ) : (
          <div className="mt-7 border-y border-warm-border/70 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-warm-elevated text-accent">
                  <LockKey size={15} />
                </span>
                <div>
                  <p className="font-sans text-sm text-warm-off-white">Focused pace</p>
                  <p className="font-sans text-xs text-warm-muted">Level 2 · up to one clarifying question</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onShowPaceNotice}
                className="editorial-link font-sans text-xs text-warm-muted hover:text-accent"
              >
                Change pace
              </button>
            </div>
            {showPaceNotice && (
              <p role="status" className="mt-4 border-l-2 border-marigold pl-3 text-xs leading-5 text-warm-muted">
                Adjustable investigation depth is for signed-in subscribers.{' '}
                <Link to="/login" className="text-warm-off-white underline decoration-accent">
                  Sign in to continue
                </Link>
                .
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-7 flex w-full items-center justify-between rounded-full bg-accent px-6 py-4 font-sans text-sm font-semibold text-warm-charcoal transition-colors hover:enabled:bg-marigold disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span>Prepare my doctor brief</span>
          <ArrowRight size={19} />
        </button>
      </div>
    </form>
  )
}

function PaceDial({ value, selectedOption, onChange }) {
  const angle = -70 + ((value - 1) / 4) * 140
  const progress = ((value - 1) / 4) * 100
  const tickAngles = [-70, -35, 0, 35, 70]

  function pointAt(angleInDegrees, radius) {
    const radians = (angleInDegrees - 90) * (Math.PI / 180)
    return {
      x: 120 + radius * Math.cos(radians),
      y: 120 + radius * Math.sin(radians),
    }
  }

  return (
    <fieldset className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <legend className="eyebrow">Investigation depth</legend>
        <span className="font-mono text-[11px] text-warm-muted">LEVEL {value} / 5</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-warm-border bg-warm-charcoal/35">
        <div className="grid items-center gap-2 px-5 pt-5 sm:grid-cols-[minmax(15rem,0.9fr)_1fr] sm:px-7">
          <div className="relative mx-auto w-full max-w-[17rem]" aria-hidden="true">
            <svg viewBox="0 0 240 145" className="w-full overflow-visible">
              <path
                d="M 30 120 A 90 90 0 0 1 210 120"
                pathLength="100"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                className="text-warm-border"
              />
              <path
                d="M 30 120 A 90 90 0 0 1 210 120"
                pathLength="100"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${progress} 100`}
                className="text-accent transition-all duration-500"
              />
              {tickAngles.map((tickAngle, index) => {
                const start = pointAt(tickAngle, 77)
                const end = pointAt(tickAngle, 86)
                return (
                  <line
                    key={tickAngle}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="currentColor"
                    strokeWidth="2"
                    className={index + 1 <= value ? 'text-warm-charcoal' : 'text-warm-muted'}
                  />
                )
              })}
              <g
                transform={`rotate(${angle} 120 120)`}
                className="transition-transform duration-500"
                style={{ transformOrigin: '120px 120px' }}
              >
                <line x1="120" y1="120" x2="120" y2="49" stroke="currentColor" strokeWidth="3" className="text-marigold" />
                <circle cx="120" cy="49" r="4" fill="currentColor" className="text-marigold" />
              </g>
              <circle cx="120" cy="120" r="13" fill="currentColor" className="text-warm-elevated" />
              <circle cx="120" cy="120" r="5" fill="currentColor" className="text-marigold" />
            </svg>
            <span className="absolute bottom-2 left-1 font-mono text-[9px] tracking-widest text-warm-muted">QUICK</span>
            <span className="absolute bottom-2 right-0 font-mono text-[9px] tracking-widest text-warm-muted">DEEP</span>
          </div>

          <div className="border-t border-warm-border/70 py-5 sm:border-l sm:border-t-0 sm:py-3 sm:pl-7">
            <p className="font-serif text-3xl font-light text-warm-off-white">{selectedOption.label}</p>
            <p className="mt-2 text-sm leading-6 text-warm-muted">{selectedOption.detail}</p>
            <p className="mt-4 text-xs leading-5 text-warm-muted">
              Safety screening remains equally thorough at every depth.
            </p>
          </div>
        </div>

        <div className="border-t border-warm-border/70 px-5 py-4 sm:px-7">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label="Investigation depth"
            aria-valuetext={`${selectedOption.label}: ${selectedOption.detail}`}
            className="pace-range w-full"
          />
          <div className="mt-3 grid grid-cols-5">
            {DEPTH_OPTIONS.map((option) => (
              <button
                key={option.level}
                type="button"
                onClick={() => onChange(option.level)}
                aria-pressed={value === option.level}
                className={`font-sans text-[10px] transition-colors sm:text-xs ${
                  value === option.level ? 'text-warm-off-white' : 'text-warm-muted hover:text-marigold'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  )
}

function WorkspaceLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-warm-muted transition-colors hover:bg-warm-elevated hover:text-warm-off-white"
    >
      <span className="text-marigold">{icon}</span>
      {label}
    </Link>
  )
}

function ContextRow({ index, title, body }) {
  return (
    <div className="border-t border-warm-border/70 pt-4">
      <span className="font-mono text-[10px] text-marigold">{index}</span>
      <h3 className="mt-2 font-serif text-lg text-warm-off-white">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-warm-muted">{body}</p>
    </div>
  )
}
