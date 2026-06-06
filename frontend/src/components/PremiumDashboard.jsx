import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChatCircleText, FileArrowUp, FolderOpen, NotePencil, UsersThree } from '@phosphor-icons/react'
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
        if (active) {
          setCards(cardRows ?? [])
          setDocs(docRows?.uploads ?? [])
        }
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
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <section className="animate-fade-in-up grid items-end gap-8 border-b border-warm-border/70 pb-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow">Your health desk</p>
            <h1 className="mt-4 font-serif text-4xl font-light tracking-[-0.04em] text-warm-off-white sm:text-6xl">
              Good {timeOfDay()}{user?.firstName ? `, ${user.firstName}` : ''}.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-warm-muted">
              Keep your records, questions, and doctor briefs in one calm place.
            </p>
          </div>
          <Link
            to="/"
            className="group flex min-w-72 items-center justify-between rounded-full bg-warm-off-white px-6 py-4 font-sans text-sm font-semibold text-warm-surface transition-all duration-500 hover:-translate-y-1 hover:bg-accent"
          >
            Start an investigation
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </section>

        <section className="animate-fade-in-up-2 mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <ActionTile
            to="/"
            icon={<NotePencil size={25} weight="light" />}
            index="01"
            title="Prepare a doctor brief"
            body="Make sense of a new or changing symptom."
            tone="accent"
          />
          <ActionTile
            to="/chat"
            icon={<ChatCircleText size={25} weight="light" />}
            index="02"
            title="Ask HealthNav"
            body="Explore your records and prepare useful questions."
            tone="plum"
          />
          <ActionTile
            to="/dashboard/upload"
            icon={<FileArrowUp size={25} weight="light" />}
            index="03"
            title="Add a health document"
            body="Bring test results and reports into your history."
            tone="marigold"
          />
          <ActionTile
            to="/profile"
            icon={<UsersThree size={25} weight="light" />}
            index="04"
            title="Family profiles"
            body="Maintain separate histories with shared family context."
            tone="sage"
          />
        </section>

        <section className="animate-fade-in-up-3 mt-12 grid gap-10 lg:grid-cols-2">
          <Collection
            label="Recent doctor briefs"
            empty="Your completed briefs will collect here."
            rows={cards.slice(0, 4).map((card) => ({
              id: card.card_id,
              title: card.summary ?? card.symptom_description ?? 'Doctor Prep Card',
              meta: `${card.quadrant?.quadrant_label ?? 'Saved'} · ${formatDate(card.created_at)}`,
            }))}
          />
          <Collection
            label="Health documents"
            empty="Uploaded tests and reports will appear here."
            rows={docs.slice(0, 4).map((doc) => ({
              id: doc.upload_id,
              title: doc.original_filename,
              meta: `${doc.values_extracted} values · ${doc.findings_extracted} findings`,
            }))}
          />
        </section>
      </main>
    </div>
  )
}

function ActionTile({ to, icon, index, title, body, tone }) {
  const tones = {
    accent: { accent: '#b95538', icon: 'text-accent' },
    plum: { accent: '#76556c', icon: 'text-plum' },
    marigold: { accent: '#b47a1d', icon: 'text-marigold' },
    sage: { accent: '#667f60', icon: 'text-sage' },
  }
  const palette = tones[tone]
  return (
    <Link
      to={to}
      style={{ '--tile-accent': palette.accent }}
      className="premium-action group min-h-60 rounded-[1.75rem] p-6 text-warm-off-white"
    >
      <div className="flex items-start justify-between">
        <span className={palette.icon}>{icon}</span>
        <span className="font-mono text-xs text-warm-muted">{index}</span>
      </div>
      <div className="mt-16">
        <h2 className="font-serif text-2xl leading-tight">{title}</h2>
        <p className="mt-3 max-w-xs font-sans text-sm leading-6 text-warm-muted">{body}</p>
      </div>
    </Link>
  )
}

function Collection({ label, rows, empty }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <FolderOpen size={18} className="text-warm-muted" />
      </div>
      <div className="border-t border-warm-border">
        {rows.length === 0 ? (
          <p className="border-b border-warm-border py-8 font-serif text-xl text-warm-muted">{empty}</p>
        ) : rows.map((row) => (
          <div key={row.id} className="group flex items-center justify-between gap-4 border-b border-warm-border py-5">
            <div className="min-w-0">
              <p className="truncate font-sans text-sm text-warm-off-white">{row.title}</p>
              <p className="mt-1 font-mono text-[11px] text-warm-muted">{row.meta}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
