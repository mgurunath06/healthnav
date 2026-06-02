import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { apiFetch } from '../lib/api'

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function PremiumDashboard() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [cards, setCards] = useState([])
  const [docs, setDocs] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const token = await getToken()
        const [cardRows, docRows] = await Promise.all([
          apiFetch('/cards', { token }),
          apiFetch('/documents', { token }),
        ])
        if (!active) return
        setCards(cardRows ?? [])
        setDocs(docRows?.uploads ?? [])
      } catch {
        if (active) {
          setCards([])
          setDocs([])
        }
      }
    }
    load()
    return () => { active = false }
  }, [getToken])

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <main className="flex-1 overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl mx-auto space-y-8">

          {/* Greeting */}
          <div>
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-2">
              Premium
            </p>
            <h1 className="font-serif text-3xl font-light text-warm-off-white">
              Good {timeOfDay()}{user?.firstName ? `, ${user.firstName}` : ''}
            </h1>
          </div>

          {/* Start new investigation CTA */}
          <Link
            to="/"
            className="block rounded-2xl bg-accent/10 border border-accent/30 px-6 py-5
                       hover:bg-accent/15 transition-colors duration-250 group"
          >
            <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
              Symptom Investigation
            </p>
            <p className="font-sans text-base font-medium text-warm-off-white
                          group-hover:text-white transition-colors duration-250">
              Start a new investigation →
            </p>
            <p className="font-sans text-sm text-warm-muted mt-1">
              Describe your symptoms and get a Doctor Prep Card.
            </p>
          </Link>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              to="/chat"
              className="block border border-warm-border bg-warm-surface rounded px-5 py-4 hover:border-accent/50 transition-colors duration-250"
            >
              <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
                Ask HealthNav
              </p>
              <p className="font-sans text-sm text-warm-muted">
                General wellness guidance informed by your records.
              </p>
            </Link>
            <Link
              to="/profile"
              className="block border border-warm-border bg-warm-surface rounded px-5 py-4 hover:border-accent/50 transition-colors duration-250"
            >
              <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
                Profile
              </p>
              <p className="font-sans text-sm text-warm-muted">
                Review uploaded documents and extracted values.
              </p>
            </Link>
          </div>

          {/* Saved prep cards */}
          <section>
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-4">
              Saved Prep Cards
            </p>
            {cards.length === 0 ? (
              <EmptyState message="No saved cards yet" />
            ) : (
              <div className="space-y-2">
                {cards.slice(0, 3).map((card) => (
                  <div key={card.card_id} className="border border-warm-border bg-warm-surface rounded px-4 py-3">
                    <p className="font-sans text-sm text-warm-off-white line-clamp-1">
                      {card.summary ?? card.symptom_description ?? 'Doctor Prep Card'}
                    </p>
                    <p className="font-mono text-xs text-warm-muted mt-1">
                      {card.quadrant?.quadrant_label ?? 'Saved'} · {formatDate(card.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Health values */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase">
                Health Values
              </p>
              <Link
                to="/dashboard/upload"
                className="font-sans text-xs text-accent hover:text-accent/80 transition-colors duration-250"
              >
                Upload a document →
              </Link>
            </div>
            {docs.length === 0 ? (
              <EmptyState message="No documents uploaded yet" />
            ) : (
              <div className="space-y-2">
                {docs.slice(0, 3).map((doc) => (
                  <div key={doc.upload_id} className="border border-warm-border bg-warm-surface rounded px-4 py-3">
                    <p className="font-sans text-sm text-warm-off-white truncate">{doc.original_filename}</p>
                    <p className="font-mono text-xs text-warm-muted mt-1">
                      {doc.values_extracted} values · {doc.findings_extracted} findings
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upload tile — utility action, dashed border, no fill */}
          <Link
            to="/dashboard/upload"
            className="flex items-center gap-4 border border-dashed border-warm-border
                       rounded-xl px-6 py-5 hover:border-warm-muted transition-colors duration-250 group"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-0.5">
                Upload a document
              </p>
              <p className="font-sans text-xs text-warm-muted">
                Blood tests · Prescriptions · Imaging reports
              </p>
            </div>
            <span className="font-mono text-xs text-warm-muted group-hover:text-warm-off-white transition-colors duration-250 shrink-0">
              →
            </span>
          </Link>

        </div>
      </main>
    </div>
  )
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-warm-border px-6 py-8 text-center">
      <p className="font-sans text-sm text-warm-muted">{message}</p>
    </div>
  )
}
