import { useInvestigationStore } from '../store/useInvestigationStore'
import { useInvestigation } from '../hooks/useInvestigation'
import Header from './Header'

const QUADRANT_STYLES = {
  Q1: { bg: 'bg-quadrant-q1', border: 'border-quadrant-q1', text: 'text-quadrant-q1', label: 'Act Now' },
  Q2: { bg: 'bg-quadrant-q2', border: 'border-quadrant-q2', text: 'text-quadrant-q2', label: 'Schedule Soon' },
  Q3: { bg: 'bg-quadrant-q3', border: 'border-quadrant-q3', text: 'text-quadrant-q3', label: 'Watch & Self-Care' },
  Q4: { bg: 'bg-quadrant-q4', border: 'border-quadrant-q4', text: 'text-quadrant-q4', label: 'Monitor' },
}

export default function PrepCard() {
  const apiResponse = useInvestigationStore((s) => s.apiResponse)
  const { reset } = useInvestigation()

  const card = apiResponse?.doctor_prep_card
  if (!card) return null

  const { quadrant } = card
  const qStyle = QUADRANT_STYLES[quadrant?.quadrant_id] ?? QUADRANT_STYLES.Q4
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <div className="flex-1 overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl mx-auto">

          {/* Card container */}
          <div className="bg-warm-surface rounded-2xl border border-warm-border shadow-matte overflow-hidden">

            {/* ── Hero ── */}
            <div className="px-8 pt-8 pb-6 border-b border-warm-border flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-1">Doctor Visit Prep Card</p>
                <p className="font-mono text-xs text-warm-muted">{today}</p>
              </div>
              {/* Quadrant badge */}
              <div className={`flex flex-col items-end gap-1`}>
                <span className={`font-mono text-xs tracking-widest uppercase ${qStyle.text}`}>
                  {quadrant?.quadrant_id}
                </span>
                <span className={`inline-block px-3 py-1 rounded-full border text-xs font-sans font-medium ${qStyle.border} ${qStyle.text}`}>
                  {quadrant?.quadrant_label ?? qStyle.label}
                </span>
                <span className="font-sans text-xs text-warm-muted text-right max-w-48 leading-snug">
                  {quadrant?.recommended_action}
                </span>
              </div>
            </div>

            {/* ── Summary ── */}
            <Section label="Summary">
              <p className="font-sans text-sm text-warm-muted leading-relaxed">{card.summary}</p>

              {/* Symptom timeline chips */}
              {card.symptom_timeline && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.symptom_timeline.primary_symptom && (
                    <Chip label="Symptom" value={card.symptom_timeline.primary_symptom} />
                  )}
                  {card.symptom_timeline.duration && (
                    <Chip label="Duration" value={card.symptom_timeline.duration} />
                  )}
                  {card.symptom_timeline.severity && (
                    <Chip label="Severity" value={card.symptom_timeline.severity} />
                  )}
                  {card.symptom_timeline.frequency && (
                    <Chip label="Frequency" value={card.symptom_timeline.frequency} />
                  )}
                </div>
              )}
            </Section>

            <Divider />

            {/* ── Key Findings ── */}
            {card.key_findings?.length > 0 && (
              <>
                <Section label="Key Findings">
                  <ul className="space-y-2">
                    {card.key_findings.map((finding, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                        <span className="font-sans text-sm text-warm-muted leading-snug">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
                <Divider />
              </>
            )}

            {/* ── Lifestyle Context ── */}
            {card.lifestyle_context && (
              <>
                <Section label="Lifestyle Factors">
                  <p className="font-sans text-sm text-warm-muted leading-relaxed">{card.lifestyle_context}</p>
                </Section>
                <Divider />
              </>
            )}

            {/* ── Questions for Doctor ── */}
            {card.questions_to_ask_doctor?.length > 0 && (
              <>
                <Section label="Questions to Ask Your Doctor">
                  <div className="space-y-2">
                    {card.questions_to_ask_doctor.map((q, i) => (
                      <div key={i} className="border-l-2 border-quadrant-q2 bg-warm-elevated rounded-r-lg px-4 py-3">
                        <span className="font-sans text-sm text-warm-off-white leading-snug">{q}</span>
                      </div>
                    ))}
                  </div>
                </Section>
                <Divider />
              </>
            )}

            {/* ── Specialties ── */}
            {card.potentially_relevant_specialties?.length > 0 && (
              <>
                <Section label="Potentially Relevant Specialties">
                  <div className="flex flex-wrap gap-2">
                    {card.potentially_relevant_specialties.map((s, i) => (
                      <span key={i} className="font-mono text-xs px-3 py-1.5 rounded-full bg-warm-elevated border border-warm-border text-warm-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                </Section>
                <Divider />
              </>
            )}

            {/* ── Recommended Next Step ── */}
            <Section label="Recommended Next Step">
              <p className="font-sans text-sm text-warm-off-white leading-relaxed font-medium">
                {card.recommended_next_step}
              </p>
            </Section>

            {/* ── Disclaimer ── */}
            <div className="px-8 py-4 bg-warm-elevated border-t border-warm-border">
              <p className="font-sans text-xs text-warm-muted leading-relaxed">{card.disclaimer}</p>
            </div>

          </div>

          {/* ── CTAs ── */}
          <div className="mt-6 flex items-center justify-between">
            <button
              disabled
              className="px-5 py-2.5 rounded-lg border border-accent text-accent font-sans text-sm font-medium opacity-40 cursor-not-allowed"
            >
              Save as PDF
            </button>
            <button
              onClick={reset}
              className="font-sans text-sm text-warm-muted hover:text-warm-off-white transition-colors duration-250"
            >
              Start Over
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="px-8 py-6">
      <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-4">{label}</p>
      {children}
    </div>
  )
}

function Divider() {
  return <hr className="border-0 border-t border-warm-border mx-8" />
}

function Chip({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-elevated border border-warm-border">
      <span className="font-mono text-xs text-warm-muted">{label}:</span>
      <span className="font-sans text-xs text-warm-off-white capitalize">{value}</span>
    </div>
  )
}
