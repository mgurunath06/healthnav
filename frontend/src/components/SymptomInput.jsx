import { useState } from 'react'
import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

const MIN_CHARS = 10
const MAX_CHARS = 2000

export default function SymptomInput() {
  const [text, setText] = useState('')
  const { investigate } = useInvestigation()

  const canSubmit = text.trim().length >= MIN_CHARS

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    investigate(text.trim())
  }

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="font-serif text-4xl font-light text-warm-off-white tracking-tight mb-3">
              What's going on?
            </h1>
            <p className="font-sans text-warm-muted text-base">
              Describe your symptoms in your own words. Be as specific as you can.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="e.g. I've had a dull headache behind my eyes every afternoon for the past week, gets worse when I look at screens..."
                rows={7}
                className="
                  w-full resize-none rounded-lg
                  bg-warm-surface border border-warm-border
                  text-warm-off-white placeholder-warm-muted
                  font-sans text-base leading-relaxed
                  px-5 py-4
                  outline-none ring-0
                  transition-colors duration-300
                  focus:border-accent
                  shadow-matte
                "
              />
              {/* Character count */}
              <span className="absolute bottom-3 right-4 font-mono text-xs text-warm-muted select-none">
                {text.length}/{MAX_CHARS}
              </span>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="
                mt-4 w-full py-3.5 rounded-lg
                font-sans font-medium text-base
                transition-colors duration-250
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
                disabled:opacity-40 disabled:cursor-not-allowed
                bg-accent text-warm-off-white
                hover:enabled:bg-accent-hover
              "
            >
              Investigate
            </button>
          </form>
        </div>
      </main>

      {/* Footer disclaimer — always visible, never hidden */}
      <footer className="px-4 py-5 border-t border-warm-border text-center">
        <p className="font-sans text-xs text-warm-muted">
          Your data stays private.&nbsp;&nbsp;·&nbsp;&nbsp;Not a diagnosis tool. Always consult a licensed medical professional.
        </p>
      </footer>
    </div>
  )
}
