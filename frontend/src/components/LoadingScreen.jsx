import { useState, useEffect } from 'react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import Header from './Header'

const STAGES = [
  'Checking for urgent clinical indicators',
  'Classifying symptom category and urgency',
  'Running deep clinical analysis',
  'Building your Doctor Prep Card',
]

export default function LoadingScreen() {
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const [currentStage, setCurrentStage] = useState(0)
  const isFollowUp = followUpHistory.length > 0

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentStage((i) => Math.min(i + 1, STAGES.length - 1))
    }, 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {/* Serif heading — slow opacity pulse, 3s */}
          <h1 className="font-serif text-2xl font-light text-warm-off-white text-center mb-2 animate-slow-pulse">
            {isFollowUp ? 'Analysing your answers…' : 'Analysing clinical findings…'}
          </h1>

          {/* Monospace step counter */}
          <p className="font-mono text-xs text-warm-muted tracking-widest uppercase text-center mb-10">
            Agent Step {currentStage + 1} of {STAGES.length}
          </p>

          {/* Agent Trace — vertical stack of horizontal lines */}
          <div className="space-y-5">
            {STAGES.map((label, i) => {
              const done    = i < currentStage
              const current = i === currentStage
              return (
                <div key={i} className="space-y-2">
                  {/* Trace line */}
                  <div
                    className={[
                      'h-[4px] w-full rounded-full transition-colors duration-1000',
                      done    ? 'bg-accent' :
                      current ? 'bg-warm-elevated animate-agent-trace-pulse' :
                                'bg-warm-surface',
                    ].join(' ')}
                  />
                  {/* Stage label */}
                  <p
                    className={[
                      'font-mono text-xs tracking-wide transition-colors duration-1000',
                      done    ? 'text-accent' :
                      current ? 'text-warm-off-white' :
                                'text-warm-muted opacity-40',
                    ].join(' ')}
                  >
                    {label}
                  </p>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
