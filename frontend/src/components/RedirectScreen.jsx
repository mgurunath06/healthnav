import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

export default function RedirectScreen() {
  const { reset } = useInvestigation()

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">

          <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-6">Unable to proceed</p>

          <h1 className="font-serif text-2xl font-light text-warm-off-white leading-snug mb-4">
            This doesn't look like a symptom description.
          </h1>

          <p className="font-sans text-sm text-warm-muted leading-relaxed mb-10">
            HealthNav is designed to help you prepare for a doctor visit based on physical symptoms. Please describe what you're experiencing and we'll do our best to help.
          </p>

          <button
            onClick={reset}
            className="
              px-8 py-3 rounded-lg
              bg-accent text-warm-off-white
              font-sans font-medium text-base
              hover:bg-accent-hover transition-colors duration-250
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
            "
          >
            Try Again
          </button>

        </div>
      </div>
    </div>
  )
}
