import { useInvestigationStore } from '../store/useInvestigationStore'
import Header from './Header'

const STAGES = [
  ['Screening', 'Checking urgency and safety', ['screening', 'guardrail', 'triage', 'red_flag_detector']],
  ['Listening', 'Finding the details that matter', ['deep_dive']],
  ['Structuring', 'Organising the clinical picture', ['lifestyle']],
  ['Preparing', 'Writing your doctor brief', ['assembler']],
]

export default function LoadingScreen() {
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const agentTrace = useInvestigationStore((s) => s.agentTrace)
  const currentAgent = useInvestigationStore((s) => s.currentAgent)
  const isFollowUp = followUpHistory.length > 0
  const currentStage = stageIndexFor(currentAgent, agentTrace)

  return (
    <div className="app-canvas flex min-h-dvh flex-col bg-warm-charcoal">
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <p className="eyebrow">In progress</p>
          <h1 className="mt-5 text-balance font-serif text-5xl font-light leading-[1.02] tracking-[-0.04em] text-warm-off-white">
            {isFollowUp ? 'Adding the new detail.' : 'Turning notes into clarity.'}
          </h1>
          <p className="mt-6 max-w-md font-sans text-base leading-7 text-warm-muted">
            HealthNav is working through your information in a fixed, careful sequence.
          </p>
        </section>

        <section className="editorial-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="font-serif text-2xl text-warm-off-white">{STAGES[currentStage][0]}</p>
            <span className="font-mono text-xs text-marigold">0{currentStage + 1} / 04</span>
          </div>
          <div>
            {STAGES.map(([label, detail, agents], i) => {
              const matching = agentTrace.filter((item) => agents.includes(item.agent))
              const done = matching.length > 0 && matching.every((item) => item.status !== 'pending')
              const current = i === currentStage
              return (
                <div key={label} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <div className="relative flex justify-center">
                    <span className={`relative z-10 mt-1.5 h-3 w-3 rounded-full border ${
                      done || current ? 'border-accent bg-accent' : 'border-warm-border bg-warm-surface'
                    }`} />
                    {i < STAGES.length - 1 && <span className="absolute left-1/2 top-4 h-[calc(100%-0.25rem)] w-px bg-warm-border" />}
                  </div>
                  <div className="border-b border-warm-border/60 pb-7 last:border-0">
                    <p className={`font-sans text-sm ${current ? 'text-warm-off-white' : done ? 'text-accent' : 'text-warm-muted/50'}`}>
                      {label}
                    </p>
                    <p className="mt-1 font-sans text-xs text-warm-muted">{detail}</p>
                    {current && (
                      <div className="relative mt-4 h-px overflow-hidden bg-warm-border">
                        <span className="trace-runner" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function stageIndexFor(currentAgent, trace) {
  const active = currentAgent || [...trace].reverse().find((item) => item.status === 'pending')?.agent
  const activeIndex = STAGES.findIndex(([, , agents]) => agents.includes(active))
  if (activeIndex >= 0) return activeIndex

  const latest = [...trace].reverse().find((item) => item.agent)?.agent
  const latestIndex = STAGES.findIndex(([, , agents]) => agents.includes(latest))
  return latestIndex >= 0 ? latestIndex : 0
}
