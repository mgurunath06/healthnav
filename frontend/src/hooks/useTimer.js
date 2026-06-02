import { useEffect, useState } from 'react'
import { useInvestigationStore } from '../store/useInvestigationStore'

function wallClock() {
  const now = new Date()
  return {
    hh: String(now.getHours()).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
  }
}

export function useTimer() {
  const startedAt = useInvestigationStore((s) => s.investigationStartedAt)
  const screen = useInvestigationStore((s) => s.screen)

  const [elapsed, setElapsed] = useState(0)
  const [clock, setClock] = useState(wallClock())

  // Cycle timer — ticks every second, freezes on prep_card
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!startedAt) { setElapsed(0); return }
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

  // Wall clock — ticks every 10 seconds (minute precision is enough)
  useEffect(() => {
    const id = setInterval(() => setClock(wallClock()), 10_000)
    return () => clearInterval(id)
  }, [])

  const cycleMin = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const cycleSec = String(elapsed % 60).padStart(2, '0')

  return {
    clock,                        // { hh, mm } — current time
    cycle: { mm: cycleMin, ss: cycleSec },  // investigation elapsed
    active: !!startedAt,
  }
}
