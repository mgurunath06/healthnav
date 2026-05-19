import { useEffect, useState } from 'react'
import { useInvestigationStore } from '../store/useInvestigationStore'

export function useTimer() {
  const startedAt = useInvestigationStore((s) => s.investigationStartedAt)
  const screen = useInvestigationStore((s) => s.screen)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return }

    // On prep_card, freeze at final time
    if (screen === 'prep_card') {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      return
    }

    setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt, screen])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return { mm, ss, active: !!startedAt }
}
