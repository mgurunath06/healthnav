import { useState } from 'react'
import { ArrowRight, Check, LockKey, NotePencil } from '@phosphor-icons/react'
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
  const [text, setText] = useState('')
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

  return (
    <div className="app-canvas flex min-h-dvh flex-col bg-warm-charcoal">
      <Header />

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

        <section className="animate-fade-in-up-2">
          <form onSubmit={handleSubmit} className="editorial-panel relative overflow-hidden rounded-[2rem]">
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
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                placeholder="Write it as you would tell someone you trust: when it started, what it feels like, what makes it better or worse..."
                rows={8}
                className="w-full resize-none border-0 bg-transparent font-serif text-xl font-light leading-8 text-warm-off-white outline-none placeholder:text-warm-muted/55 sm:text-2xl"
              />
              <div className="mt-4 flex items-center justify-between border-t border-warm-border/60 pt-4">
                <p className="font-sans text-xs text-warm-muted">Press Shift + Enter for a new line</p>
                <span className="font-mono text-xs tabular-nums text-warm-muted">{text.length}/{MAX_CHARS}</span>
              </div>

              <fieldset className="mt-8">
                <div className="flex items-end justify-between gap-4">
                  <legend className="eyebrow">Choose the pace</legend>
                  <span className="font-sans text-xs text-warm-muted">Level {investigationDepth} of 5</span>
                </div>
                <div className="mt-4 grid grid-cols-5 overflow-hidden rounded-xl border border-warm-border">
                  {DEPTH_OPTIONS.map((option) => {
                    const selected = investigationDepth === option.level
                    return (
                      <button
                        key={option.level}
                        type="button"
                        title={`${option.label}: ${option.detail}`}
                        aria-label={`${option.label}: ${option.detail}`}
                        aria-pressed={selected}
                        onClick={() => setInvestigationDepth(option.level)}
                        className={`relative min-h-20 border-r border-warm-border px-2 py-3 text-center transition-colors last:border-r-0 ${
                          selected ? 'bg-accent text-warm-charcoal' : 'bg-warm-charcoal/30 text-warm-muted hover:bg-warm-elevated'
                        }`}
                      >
                        <span className="block font-mono text-sm">{option.level}</span>
                        <span className={`mt-2 hidden font-sans text-[10px] sm:block ${selected ? 'text-warm-charcoal/75' : ''}`}>
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 font-sans text-xs text-warm-muted">
                  {DEPTH_OPTIONS[investigationDepth - 1].label}: {DEPTH_OPTIONS[investigationDepth - 1].detail}.
                  Safety checks stay the same at every level.
                </p>
              </fieldset>

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
        </section>
      </main>

      <footer className="border-t border-warm-border/60 px-5 py-5 text-center font-sans text-xs text-warm-muted">
        HealthNav organizes information for a medical conversation. It does not diagnose or replace professional care.
      </footer>
    </div>
  )
}
