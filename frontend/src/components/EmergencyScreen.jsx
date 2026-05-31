import { useInvestigationStore } from '../store/useInvestigationStore'
import { useInvestigation } from '../hooks/useInvestigation'

export default function EmergencyScreen() {
  const apiResponse = useInvestigationStore((s) => s.apiResponse)
  const { reset }   = useInvestigation()

  const advisory = apiResponse?.advisory ?? 'Seek immediate medical attention.'
  const redFlags  = apiResponse?.red_flags ?? []

  return (
    <div className="min-h-dvh bg-quadrant-q1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">

        {/* Overline */}
        <p className="font-mono text-xs text-warm-off-white/60 tracking-widest uppercase mb-6">
          Emergency Advisory
        </p>

        {/* Headline */}
        <h1 className="font-serif text-3xl font-light text-warm-off-white leading-snug mb-4">
          Your symptoms may require immediate attention.
        </h1>

        {/* Advisory */}
        <p className="font-sans text-base text-warm-off-white/80 leading-relaxed mb-8">
          {advisory}
        </p>

        {/* Red flags */}
        {redFlags.length > 0 && (
          <div className="mb-8 border border-warm-off-white/20 rounded-lg p-5">
            <p className="font-mono text-xs text-warm-off-white/50 tracking-widest uppercase mb-3">
              Indicators detected
            </p>
            <ul className="space-y-2">
              {redFlags.map((flag, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-warm-off-white/50 shrink-0" />
                  <span className="font-sans text-sm text-warm-off-white/80 leading-snug">{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary CTA — dark button anchors the page per spec */}
        <a
          href="tel:112"
          className="block w-full text-center py-4 rounded-lg
                     bg-warm-charcoal text-warm-off-white
                     font-sans font-semibold text-base
                     hover:opacity-90 transition-opacity duration-250
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-off-white focus-visible:ring-offset-2 focus-visible:ring-offset-quadrant-q1"
        >
          Call Emergency Services
        </a>

        {/* Disclaimer */}
        <p className="mt-6 font-sans text-xs text-warm-off-white/50 text-center leading-relaxed">
          This tool is not a substitute for professional emergency care. If you are unsure, call emergency services immediately.
        </p>

        {/* Secondary */}
        <div className="mt-8 text-center">
          <button
            onClick={reset}
            className="font-sans text-sm text-warm-off-white/50 hover:text-warm-off-white transition-colors duration-250"
          >
            I&apos;m safe — start a new investigation
          </button>
        </div>

      </div>
    </div>
  )
}
