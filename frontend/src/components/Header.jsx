import { useInvestigationStore } from '../store/useInvestigationStore'
import { useTimer } from '../hooks/useTimer'

export default function Header({ showReset = false }) {
  const reset = useInvestigationStore((s) => s.reset)
  const screen = useInvestigationStore((s) => s.screen)
  const { mm, ss, active } = useTimer()

  const canReset = screen !== 'input'
  const showTimer = active && screen !== 'input'

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

      {/* Centre — timer */}
      {showTimer && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-warm-muted tracking-widest uppercase mr-1">
            Time
          </span>
          <DigitPair value={mm} />
          <span className="font-mono text-warm-muted text-base leading-none select-none">:</span>
          <DigitPair value={ss} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center gap-6">
        <span className="font-sans text-xs text-warm-muted hidden sm:block">
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

function DigitPair({ value }) {
  return (
    <div className="flex gap-1">
      <DigitCard digit={value[0]} />
      <DigitCard digit={value[1]} />
    </div>
  )
}

function DigitCard({ digit }) {
  return (
    <span
      key={digit}
      className="animate-digit inline-flex items-center justify-center w-7 h-9 bg-warm-elevated border border-warm-border rounded-md font-mono text-base font-semibold text-warm-off-white tabular-nums leading-none select-none"
    >
      {digit}
    </span>
  )
}
