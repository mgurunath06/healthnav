import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import { useInvestigation } from '../hooks/useInvestigation'
import { apiFetch } from '../lib/api'
import Header from './Header'

const QUADRANT_STYLES = {
  Q1: { bg: 'bg-quadrant-q1', border: 'border-quadrant-q1', text: 'text-quadrant-q1', label: 'Act Now' },
  Q2: { bg: 'bg-quadrant-q2', border: 'border-quadrant-q2', text: 'text-quadrant-q2', label: 'Schedule Soon' },
  Q3: { bg: 'bg-quadrant-q3', border: 'border-quadrant-q3', text: 'text-quadrant-q3', label: 'Watch & Self-Care' },
  Q4: { bg: 'bg-quadrant-q4', border: 'border-quadrant-q4', text: 'text-quadrant-q4', label: 'Monitor' },
}

const DEPTH_LABELS = {
  1: 'Quick',
  2: 'Focused',
  3: 'Standard',
  4: 'Thorough',
  5: 'Comprehensive',
}

export default function PrepCard() {
  const apiResponse = useInvestigationStore((s) => s.apiResponse)
  const requestId = useInvestigationStore((s) => s.requestId)
  const symptomDescription = useInvestigationStore((s) => s.symptomDescription)
  const investigationDepth = useInvestigationStore((s) => s.investigationDepth)
  const { reset } = useInvestigation()
  const { getToken } = useAuth()
  const { isSignedIn } = useUser()
  const cardRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const card = apiResponse?.doctor_prep_card
  if (!card) return null

  const { quadrant } = card
  const qStyle = QUADRANT_STYLES[quadrant?.quadrant_id] ?? QUADRANT_STYLES.Q4
  const cardDepth = card.investigation_depth ?? investigationDepth

  function handlePdf() {
    window.print()
  }

  async function handleShare() {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#242018',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'healthnav-prep-card.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: 'My HealthNav Doctor Prep Card',
            text: 'Here is my symptom investigation prep card from HealthNav.',
            files: [file],
          })
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'healthnav-prep-card.png'
          a.click()
          URL.revokeObjectURL(url)
        }
        setSharing(false)
      }, 'image/png')
    } catch {
      setSharing(false)
    }
  }
  async function handleSave() {
    if (!isSignedIn || saved) return
    setSaving(true)
    try {
      const token = await getToken()
      await apiFetch('/cards', {
        token,
        method: 'POST',
        body: JSON.stringify({
          request_id: requestId,
          symptom_description: symptomDescription,
          prep_card: card,
        }),
      })
      setSaved(true)
    } catch {
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <div className="flex-1 overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl mx-auto">

          {/* Card container */}
          <div ref={cardRef} className="bg-warm-surface rounded-2xl border border-warm-border shadow-matte overflow-hidden print-card">

            {/* ── Hero ── */}
            <div className="px-8 pt-8 pb-6 border-b border-warm-border flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-1">Doctor Visit Prep Card</p>
                <p className="font-mono text-xs text-warm-muted">{today}</p>
                <p className="font-mono text-xs text-warm-muted mt-1">
                  {DEPTH_LABELS[cardDepth]} investigation · Level {cardDepth}/5
                </p>
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

            {/* ── Suspected Cause ── */}
            {card.suspected_cause && (
              <>
                <Divider />
                <Section label="Our Assessment">
                  <div className="rounded-xl border border-quadrant-q2 bg-warm-elevated px-5 py-4">
                    <p className="font-sans text-sm text-warm-off-white leading-relaxed">{card.suspected_cause}</p>
                  </div>
                </Section>
              </>
            )}

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
              <div className="rounded-xl bg-accent/10 border border-accent/30 px-5 py-4 flex gap-4 items-start">
                <span className="text-accent text-lg mt-0.5">🩺</span>
                <div>
                  <p className="font-sans text-sm text-warm-off-white leading-relaxed font-medium">
                    {card.recommended_next_step}
                  </p>
                  <p className="font-sans text-xs text-warm-muted mt-2 leading-relaxed">
                    This card is designed to help you have a more informed conversation with your doctor — not to replace that visit.
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Disclaimer ── */}
            <div className="px-8 py-4 bg-warm-elevated border-t border-warm-border">
              <p className="font-sans text-xs text-warm-muted leading-relaxed">{card.disclaimer}</p>
            </div>

          </div>

          {/* ── CTAs ── */}
          <div className="mt-6 flex items-center justify-between no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePdf}
                className="px-5 py-2.5 rounded-lg border border-accent text-accent font-sans text-sm font-medium hover:bg-accent/10 transition-colors duration-250"
              >
                Save as PDF
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="px-5 py-2.5 rounded-lg border border-warm-border text-warm-muted font-sans text-sm font-medium hover:border-warm-off-white hover:text-warm-off-white transition-colors duration-250 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sharing ? 'Capturing…' : '↗ Share Card'}
              </button>
              {isSignedIn && (
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="px-5 py-2.5 rounded-lg border border-warm-border text-warm-muted font-sans text-sm font-medium hover:border-warm-off-white hover:text-warm-off-white transition-colors duration-250 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saved ? 'Saved' : saving ? 'Saving...' : 'Save Card'}
                </button>
              )}
            </div>
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
