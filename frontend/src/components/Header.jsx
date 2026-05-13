import { useInvestigationStore } from '../store/useInvestigationStore'

export default function Header({ showReset = false }) {
  const reset = useInvestigationStore((s) => s.reset)
  const screen = useInvestigationStore((s) => s.screen)

  const canReset = screen !== 'input'

  return (
    <header className="w-full border-b border-warm-border bg-warm-charcoal px-6 py-4 flex items-center justify-between shrink-0">
      {/* Wordmark */}
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif text-xl font-semibold text-warm-off-white tracking-tight">
          HealthNav
        </span>
        <span className="font-mono text-xs text-warm-muted tracking-widest uppercase">
          Symptom Investigation
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-6">
        <span className="font-sans text-xs text-warm-muted">
          Free · Anonymous · Not a diagnosis
        </span>
        {(canReset || showReset) && (
          <button
            onClick={reset}
            className="font-sans text-sm text-warm-muted hover:text-warm-off-white transition-colors duration-250 border border-warm-border rounded-md px-3 py-1.5"
          >
            New Investigation
          </button>
        )}
      </nav>
    </header>
  )
}
