import { useInvestigationStore } from '../store/useInvestigationStore'
import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

export default function EmergencyScreen() {
  const apiResponse = useInvestigationStore((s) => s.apiResponse)
  const { reset } = useInvestigation()

  const advisory   = apiResponse?.advisory ?? 'Seek immediate medical attention.'
  const redFlags   = apiResponse?.red_flags ?? []

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* Icon + label */}
          <div className="flex items-center gap-3 mb-6">
            <span className="w-3 h-3 rounded-full bg-quadrant-q1 shrink-0" />
            <p className="font-mono text-xs text-quadrant-q1 tracking-widest uppercase">Emergency Advisory</p>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-3xl font-light text-warm-off-white leading-snug mb-4">
            Your symptoms may require immediate attention.
          </h1>

          {/* Advisory */}
          <p className="font-sans text-base text-warm-muted leading-relaxed mb-8">
            {advisory}
          </p>

          {/* Red flags detected */}
          {redFlags.length > 0 && (
            <div className="mb-8 border border-quadrant-q1 rounded-lg p-5">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">Indicators detected</p>
              <ul className="space-y-2">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-quadrant-q1 shrink-0" />
                    <span className="font-sans text-sm text-warm-muted leading-snug">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary CTA */}
          <a
            href="tel:112"
            className="
              block w-full text-center py-4 rounded-lg
              bg-quadrant-q1 text-warm-off-white
              font-sans font-semibold text-base
              hover:opacity-90 transition-opacity duration-250
              focus:outline-none focus-visible:ring-2 focus-visible:ring-quadrant-q1 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
            "
          >
            Call Emergency Services
          </a>

          {/* Disclaimer */}
          <p className="mt-6 font-sans text-xs text-warm-muted text-center leading-relaxed">
            This tool is not a substitute for professional emergency care. If you are unsure, call emergency services immediately.
          </p>

          {/* Secondary — start over */}
          <div className="mt-8 text-center">
            <button
              onClick={reset}
              className="font-sans text-sm text-warm-muted hover:text-warm-off-white transition-colors duration-250"
            >
              Start a new investigation
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
