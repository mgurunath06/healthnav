import { useState, useEffect } from 'react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import Header from './Header'

const STAGES = [
  'Checking your symptoms for urgent indicators…',
  'Classifying symptom category and urgency…',
  'Running deep clinical analysis…',
  'Building your Doctor Prep Card…',
]

export default function LoadingScreen() {
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const [stageIndex, setStageIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const isFollowUp = followUpHistory.length > 0

  // Cycle through stage messages
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setStageIndex((i) => (i + 1) % STAGES.length)
        setVisible(true)
      }, 300)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="font-serif text-3xl font-light text-warm-off-white mb-3">
            {isFollowUp ? 'Analysing your answers…' : 'Investigating your symptoms…'}
          </h1>
          <p
            className="font-sans text-sm text-warm-muted transition-opacity duration-300"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {STAGES[stageIndex]}
          </p>
        </div>

        {/* Skeleton blocks — slow opacity pulse, no spinner */}
        <div className="space-y-3">
          <SkeletonBlock width="100%" delay="0ms" />
          <SkeletonBlock width="85%"  delay="400ms" />
          <SkeletonBlock width="92%"  delay="800ms" />
          <div className="pt-2" />
          <SkeletonBlock width="70%"  delay="200ms" />
          <SkeletonBlock width="88%"  delay="600ms" />
        </div>

        {/* Agent pulse dots */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-accent"
              style={{
                animation: 'pulse-dot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
        @keyframes skeleton-breathe {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.75; }
        }
      `}</style>
    </div>
    </div>
  )
}

function SkeletonBlock({ width, delay }) {
  return (
    <div
      className="h-3 rounded-full bg-warm-elevated"
      style={{
        width,
        animation: 'skeleton-breathe 2.4s ease-in-out infinite',
        animationDelay: delay,
      }}
    />
  )
}
