import { useInvestigationStore } from '../store/useInvestigationStore'
import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

export default function ErrorScreen() {
  const error     = useInvestigationStore((s) => s.error)
  const { reset } = useInvestigation()

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {/* Card with 4px q1 top border per spec §5 Screen 7 */}
        <div className="w-full max-w-md bg-warm-surface border border-warm-border rounded-xl overflow-hidden shadow-matte">
          <div className="h-1 w-full bg-quadrant-q1" />

          <div className="px-8 py-8 text-center">
            <p className="font-mono text-xs text-quadrant-q1 tracking-widest uppercase mb-5">
              System Error
            </p>

            <h1 className="font-serif text-2xl font-light text-warm-off-white leading-snug mb-4">
              We couldn&apos;t complete your investigation.
            </h1>

            {error && (
              <p className="font-mono text-xs text-warm-muted bg-warm-elevated border border-warm-border rounded px-4 py-3 mb-6 break-all text-left">
                {error}
              </p>
            )}

            <p className="font-sans text-sm text-warm-muted leading-relaxed mb-8">
              This is usually a temporary issue. Please try again — your symptom description has not been saved.
            </p>

            <button
              onClick={reset}
              className="w-full px-8 py-3 rounded-lg
                         bg-warm-elevated border border-warm-border text-warm-off-white
                         font-sans font-medium text-base
                         hover:border-warm-muted transition-colors duration-250
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface"
            >
              Retry Connection
            </button>

            <button
              onClick={reset}
              className="mt-4 font-sans text-sm text-warm-muted underline underline-offset-4 hover:text-warm-off-white transition-colors duration-250"
            >
              Return to start
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
