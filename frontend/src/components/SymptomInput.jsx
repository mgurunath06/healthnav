import { useState } from 'react'
import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

const MIN_CHARS = 10
const MAX_CHARS = 2000

const STEPS = [
  {
    icon: '✏️',
    num: '01',
    label: 'Describe',
    sub: 'Tell us your symptoms in plain English — no medical jargon needed.',
  },
  {
    icon: '🔍',
    num: '02',
    label: 'Investigate',
    sub: 'AI agents ask targeted follow-up questions to build a complete picture.',
  },
  {
    icon: '📋',
    num: '03',
    label: 'Prepare',
    sub: 'Receive a Doctor Visit Prep Card to bring to your appointment.',
  },
]

export default function SymptomInput() {
  const [text, setText] = useState('')
  const { investigate } = useInvestigation()
  const canSubmit = text.trim().length >= MIN_CHARS

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    investigate(text.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSubmit) investigate(text.trim())
    }
  }

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Animated icon */}
          <div className="flex justify-center mb-8 animate-float">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center">
              <span className="text-4xl select-none">🩺</span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="text-center mb-10 animate-fade-in-up">
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-warm-off-white tracking-tight mb-4 leading-tight">
              Prepare for your<br />doctor visit
            </h1>
            <p className="font-sans text-warm-muted text-base leading-relaxed max-w-md mx-auto">
              Describe what you've been feeling. We'll investigate your symptoms and hand you a{' '}
              <span className="text-warm-off-white font-medium">Doctor Visit Prep Card</span>{' '}
              — so your next appointment actually counts.
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-3 mb-10 animate-fade-in-up-2">
            {STEPS.map(({ icon, num, label, sub }) => (
              <div
                key={num}
                className="rounded-xl bg-warm-surface border border-warm-border px-4 py-5 text-center hover:border-accent/40 transition-colors duration-300"
              >
                <span className="text-2xl">{icon}</span>
                <p className="font-mono text-xs text-accent mt-3 mb-1">{num}</p>
                <p className="font-sans text-sm text-warm-off-white font-medium">{label}</p>
                <p className="font-sans text-xs text-warm-muted mt-1.5 leading-snug">{sub}</p>
              </div>
            ))}
          </div>

          {/* Input form */}
          <div className="animate-fade-in-up-3">
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">
              What's been bothering you?
            </p>
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. I've had a throbbing headache behind my right eye for the past 4 days. It gets worse in the morning and when I look at screens. I've also felt slightly nauseous..."
                  rows={6}
                  className="
                    w-full resize-none rounded
                    bg-warm-surface border border-warm-border
                    text-warm-off-white placeholder-warm-muted
                    font-sans text-base leading-relaxed
                    px-5 py-4
                    outline-none ring-0 focus:ring-0
                    transition-colors duration-300
                    focus:border-accent
                  "
                />
                <span className="absolute bottom-3 right-4 font-mono text-xs text-warm-muted select-none">
                  {text.length}/{MAX_CHARS}
                </span>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="
                  mt-4 w-full py-3.5 rounded-xl
                  font-sans font-medium text-base
                  transition-all duration-250
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
                  disabled:opacity-35 disabled:cursor-not-allowed
                  bg-accent text-warm-off-white
                  hover:enabled:bg-accent-hover hover:enabled:scale-[1.01]
                  active:enabled:scale-[0.99]
                "
              >
                Start Investigation →
              </button>

              {!canSubmit && text.length > 0 && (
                <p className="font-sans text-xs text-warm-muted text-center mt-2">
                  Add a bit more detail to continue ({MIN_CHARS - text.trim().length} more characters)
                </p>
              )}
            </form>
          </div>

        </div>
      </main>

      <footer className="px-4 py-5 border-t border-warm-border text-center">
        <p className="font-sans text-xs text-warm-muted">
          Your data stays private.&nbsp;&nbsp;·&nbsp;&nbsp;Not a diagnosis tool. Always consult a licensed medical professional.
        </p>
      </footer>
    </div>
  )
}
