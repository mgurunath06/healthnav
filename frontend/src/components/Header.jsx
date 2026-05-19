import { useInvestigationStore } from '../store/useInvestigationStore'
import { useTimer } from '../hooks/useTimer'

export default function Header({ showReset = false }) {
  const reset = useInvestigationStore((s) => s.reset)
  const screen = useInvestigationStore((s) => s.screen)
  const { clock, cycle, active } = useTimer()

  const canReset = screen !== 'input'
  const showTimer = active && screen !== 'input'

  return (
    <header className="w-full border-b border-warm-border bg-warm-charcoal px-6 py-4 flex items-center justify-between shrink-0">
      {/* Logo */}
      <img src="/logo.png" alt="HealthNav" className="h-9 w-auto object-contain" />

      {/* Centre — dual timers */}
      {showTimer && (
        <div className="flex items-center gap-5">
          {/* Wall clock */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <DigitPair value={clock.hh} />
              <span className="font-mono text-warm-muted text-base leading-none select-none">:</span>
              <DigitPair value={clock.mm} />
            </div>
            <span className="font-mono text-[10px] text-warm-muted tracking-widest uppercase">Now</span>
          </div>

          <span className="text-warm-border select-none">|</span>

          {/* Cycle timer */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <DigitPair value={cycle.mm} />
              <span className="font-mono text-warm-muted text-base leading-none select-none">:</span>
              <DigitPair value={cycle.ss} />
            </div>
            <span className="font-mono text-[10px] text-warm-muted tracking-widest uppercase">Session</span>
          </div>
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
