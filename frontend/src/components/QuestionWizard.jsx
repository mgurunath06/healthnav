import { useState, useEffect } from 'react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

export default function QuestionWizard() {
  const screen        = useInvestigationStore((s) => s.screen)
  const apiResponse   = useInvestigationStore((s) => s.apiResponse)
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const topicOverview = useInvestigationStore((s) => s.topicOverview)
  const { submitAnswer } = useInvestigation()

  const isLoading   = screen === 'loading'
  const question    = apiResponse?.questions?.[0]
  const [answer,     setAnswer]     = useState(null)
  const [otherText,  setOtherText]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswer(null)
      setOtherText('')
      setSubmitting(false)
    }
  }, [question?.id, isLoading])

  const allowOther = !isLoading && question && question.allow_other_text && question.type !== 'scale'

  function canSubmit() {
    if (!question) return false
    if (submitting) return false
    if (question.type === 'multi_choice') {
      const vals = answer ?? []
      if (vals.includes('other')) return otherText.trim().length > 0
      return vals.length > 0
    }
    if (answer === 'other') return otherText.trim().length > 0
    return answer !== null && answer !== undefined && answer !== ''
  }

  function handleSubmit() {
    if (!canSubmit()) return
    setSubmitting(true)
    let finalAnswer = answer
    if (answer === 'other') {
      finalAnswer = otherText.trim()
    } else if (Array.isArray(answer) && answer.includes('other')) {
      finalAnswer = [...answer.filter((v) => v !== 'other'), otherText.trim()]
    }
    const answerIsFreeText =
      answer === 'other' || (Array.isArray(answer) && answer.includes('other'))
    submitAnswer(question, finalAnswer, answerIsFreeText)
  }

  function toggleMulti(val) {
    setAnswer((prev) => {
      const current = prev ?? []
      return current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    })
  }

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: History ── */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-warm-border flex-col overflow-y-auto">
          <div className="px-5 pt-6 pb-4 border-b border-warm-border">
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase">Your answers</p>
          </div>

          {followUpHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-5">
              <p className="font-sans text-xs text-warm-muted text-center leading-relaxed">
                Your answered questions will appear here as you go.
              </p>
            </div>
          ) : (
            <ol className="flex-1 px-5 py-4 space-y-5">
              {followUpHistory.map((qa, i) => (
                <li key={qa.question_id} className="space-y-1.5">
                  <p className="font-mono text-xs text-warm-muted">Q{i + 1}</p>
                  <p className="font-sans text-xs text-warm-muted leading-snug">{qa.question_text}</p>
                  <p className="font-sans text-sm text-warm-off-white leading-snug">{qa.answer}</p>
                </li>
              ))}
            </ol>
          )}

          {/* Progress arc */}
          <div className="px-5 py-5 border-t border-warm-border flex flex-col items-center gap-3">
            <ProgressArc completed={followUpHistory.length} />
            <p className="font-mono text-xs text-warm-muted text-center">
              {followUpHistory.length === 0
                ? 'Investigation starting…'
                : followUpHistory.length === 1
                  ? '1 question answered'
                  : `${followUpHistory.length} questions answered`}
            </p>
          </div>
        </aside>

        {/* ── Centre: Current question or loading state ── */}
        <main className="flex-1 flex flex-col items-center justify-center px-5 py-8 md:px-10 md:py-10 overflow-y-auto">
          {isLoading ? (
            <CenterLoading />
          ) : question ? (
            <div className="w-full max-w-xl animate-fade-in-up">
              <p className="eyebrow mb-4">One useful detail</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-warm-off-white mb-8 leading-tight tracking-[-0.03em]">
                {question.question}
              </h2>

              <div className="space-y-3">
                {question.type === 'yes_no' && (
                  <YesNo value={answer} onChange={setAnswer} />
                )}
                {question.type === 'single_choice' && (
                  <SingleChoice
                    choices={question.choices ?? []} value={answer} onChange={setAnswer}
                    allowOther={allowOther} otherText={otherText} onOtherText={setOtherText}
                  />
                )}
                {question.type === 'multi_choice' && (
                  <MultiChoice
                    choices={question.choices ?? []} values={answer ?? []} onToggle={toggleMulti}
                    allowOther={allowOther} otherText={otherText} onOtherText={setOtherText}
                  />
                )}
                {question.type === 'scale' && (
                  <Scale
                    value={answer} onChange={setAnswer}
                    min={question.scale_min ?? 1} max={question.scale_max ?? 10}
                    minLabel={question.scale_min_label ?? 'Mild'} maxLabel={question.scale_max_label ?? 'Severe'}
                  />
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                className="
                  mt-10 w-full py-3.5 rounded-full font-sans font-semibold text-sm
                  bg-accent text-warm-charcoal
                  hover:enabled:bg-marigold
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors duration-250
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
                "
              >
                {submitting ? 'Analysing…' : 'Continue'}
              </button>
            </div>
          ) : null}
        </main>

        {/* ── Right: Topic context ── */}
        <aside className="hidden md:flex w-80 shrink-0 border-l border-warm-border flex-col overflow-y-auto">
          <div className="px-5 pt-6 pb-4 border-b border-warm-border">
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase">General context</p>
          </div>

          {topicOverview ? (
            <div className="px-5 py-5 space-y-6">
              <div>
                <h3 className="font-serif text-base font-semibold text-warm-off-white mb-2">
                  {topicOverview.title}
                </h3>
                <p className="font-sans text-sm text-warm-muted leading-relaxed">
                  {topicOverview.summary}
                </p>
              </div>

              {topicOverview.common_causes?.length > 0 && (
                <div>
                  <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">
                    Common causes
                  </p>
                  <ul className="space-y-2">
                    {topicOverview.common_causes.map((cause, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                        <span className="font-sans text-sm text-warm-muted leading-snug">{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topicOverview.when_to_see_doctor && (
                <div className="border border-warm-border rounded-lg p-4">
                  <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-2">
                    When to seek care
                  </p>
                  <p className="font-sans text-sm text-warm-muted leading-relaxed">
                    {topicOverview.when_to_see_doctor}
                  </p>
                </div>
              )}

              <p className="font-sans text-xs text-warm-muted leading-relaxed border-t border-warm-border pt-4">
                This is general information only — not specific to your case. Always consult a licensed medical professional.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 px-5 py-5">
              {/* Skeleton while loading */}
              {[100, 80, 90, 65, 75].map((w, i) => (
                <div key={i} className="h-2.5 rounded-full bg-warm-elevated" style={{ width: `${w}%`, opacity: 0.5 }} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-3">
      {[['yes', 'Yes'], ['no', 'No']].map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)}
          className={`flex-1 py-4 rounded-lg font-sans font-medium text-base border transition-colors duration-250
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
            ${value === val ? 'bg-accent border-accent text-warm-off-white' : 'bg-warm-surface border-warm-border text-warm-off-white hover:border-accent'}`}
        >{label}</button>
      ))}
    </div>
  )
}

function SingleChoice({ choices, value, onChange, allowOther, otherText, onOtherText }) {
  const all = allowOther ? [...choices, { value: 'other', label: 'Other' }] : choices
  return (
    <div className="space-y-2">
      {all.map((opt) => {
        const selected = value === opt.value
        return (
          <div key={opt.value}>
            <button onClick={() => onChange(opt.value)}
              className={`w-full text-left px-4 py-3.5 rounded-lg border font-sans text-base transition-colors duration-250
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
                ${selected ? 'border-accent bg-warm-surface text-warm-off-white' : 'border-warm-border bg-warm-surface text-warm-off-white hover:border-warm-muted'}`}
            >{opt.label}</button>
            {selected && opt.value === 'other' && (
              <input type="text" value={otherText} onChange={(e) => onOtherText(e.target.value)}
                placeholder="Describe in your own words…" autoFocus
                className="mt-2 w-full px-4 py-3 rounded-lg bg-warm-elevated border border-warm-border text-warm-off-white placeholder-warm-muted font-sans text-sm outline-none focus:border-accent transition-colors duration-300"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function MultiChoice({ choices, values, onToggle, allowOther, otherText, onOtherText }) {
  const all = allowOther ? [...choices, { value: 'other', label: 'Other' }] : choices
  return (
    <div className="space-y-2">
      {all.map((opt) => {
        const selected = values.includes(opt.value)
        return (
          <div key={opt.value}>
            <button onClick={() => onToggle(opt.value)}
              className={`w-full text-left px-4 py-3.5 rounded-lg border font-sans text-base flex items-center justify-between transition-colors duration-250
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-charcoal
                ${selected ? 'border-warm-border bg-warm-elevated text-warm-off-white' : 'border-warm-border bg-warm-surface text-warm-off-white hover:border-warm-muted'}`}
            >
              <span>{opt.label}</span>
              {selected && <span className="text-accent text-sm ml-3">✓</span>}
            </button>
            {selected && opt.value === 'other' && (
              <input type="text" value={otherText} onChange={(e) => onOtherText(e.target.value)}
                placeholder="Describe in your own words…" autoFocus
                className="mt-2 w-full px-4 py-3 rounded-lg bg-warm-elevated border border-warm-border text-warm-off-white placeholder-warm-muted font-sans text-sm outline-none focus:border-accent transition-colors duration-300"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CenterLoading() {
  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-8">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full bg-accent"
            style={{
              animation: 'pulse-dot 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        <style>{`
          @keyframes pulse-dot {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40%            { opacity: 1;   transform: scale(1); }
          }
          @keyframes skeleton-breathe {
            0%, 100% { opacity: 0.35; }
            50%       { opacity: 0.65; }
          }
        `}</style>
      </div>
      <p className="font-sans text-sm text-warm-muted">Analysing your answer…</p>
      <div className="w-full space-y-3">
        {[100, 80, 92, 70].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-warm-elevated"
            style={{
              width: `${w}%`,
              animation: 'skeleton-breathe 2.2s ease-in-out infinite',
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ProgressArc({ completed }) {
  const SIZE = 88
  const STROKE = 6
  const R = (SIZE - STROKE) / 2
  const CIRCUMFERENCE = 2 * Math.PI * R
  const ARC_DEGREES = 240
  const ARC_FRAC = ARC_DEGREES / 360
  const arcLen = CIRCUMFERENCE * ARC_FRAC
  const gapLen = CIRCUMFERENCE - arcLen

  // Logarithmic fill: grows quickly at first, slows down — never implies a fixed total
  const progress = completed === 0 ? 0 : Math.log(completed + 1) / Math.log(completed + 4)
  const filled = arcLen * progress

  const rotation = 150 - 90

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
      <circle
        cx={SIZE / 2} cy={SIZE / 2} r={R}
        fill="none"
        stroke="var(--color-warm-elevated)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${gapLen}`}
        strokeDashoffset={0}
        transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
      />
      <circle
        cx={SIZE / 2} cy={SIZE / 2} r={R}
        fill="none"
        stroke="var(--color-quadrant-q2)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
        strokeDashoffset={0}
        transform={`rotate(${rotation} ${SIZE / 2} ${SIZE / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text
        x={SIZE / 2} y={SIZE / 2}
        textAnchor="middle" dominantBaseline="middle"
        fill="var(--color-warm-off-white)"
        fontFamily="var(--font-serif)" fontSize="22" fontWeight="300"
      >
        {completed}
      </text>
    </svg>
  )
}

function Scale({ value, onChange, min, max, minLabel, maxLabel }) {
  const current = value ?? min
  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="font-serif text-7xl font-light text-warm-off-white tabular-nums">{current}</span>
      </div>
      <input type="range" min={min} max={max} value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent bg-warm-border"
      />
      <div className="flex justify-between">
        <span className="font-mono text-xs text-warm-muted">{minLabel}</span>
        <span className="font-mono text-xs text-warm-muted">{maxLabel}</span>
      </div>
    </div>
  )
}
