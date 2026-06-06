import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChatCircleText, FileArrowUp, NotePencil, UsersThree } from '@phosphor-icons/react'
import Header from './Header'
import { apiFetch } from '../lib/api'

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const EDITION = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

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
        {/* Masthead */}
        <section className="animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warm-off-white pb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">
            <span>The Health Desk</span>
            <span className="hidden sm:inline">{EDITION}</span>
            <span>No. {String(cards.length + docs.length).padStart(3, '0')}</span>
          </div>

          <div className="grid items-end gap-8 border-b-2 border-warm-off-white py-7 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Daily edition · Personal health record</p>
              <h1 className="mt-4 font-serif text-5xl font-light leading-[0.95] tracking-[-0.04em] text-warm-off-white sm:text-7xl">
                Good {timeOfDay()}{user?.firstName ? `, ${user.firstName}` : ''}.
              </h1>
              <p className="mt-5 max-w-xl border-l-2 border-accent pl-4 font-serif text-lg italic leading-7 text-warm-muted">
                Your records, questions, and doctor briefs &mdash; gathered in one calm, considered place.
              </p>
            </div>
            <Link
              to="/"
              className="group flex min-w-72 items-center justify-between rounded-full bg-warm-off-white px-6 py-4 font-sans text-sm font-semibold text-warm-surface transition-all duration-500 hover:-translate-y-1 hover:bg-accent"
            >
              Start an investigation
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* Section header */}
        <div className="animate-fade-in-up-2 mt-9 flex items-baseline justify-between border-b border-warm-border pb-2">
          <p className="eyebrow">Today&apos;s desk</p>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">Four columns</span>
        </div>

        {/* Column rail of actions */}
        <section className="animate-fade-in-up-2 mt-6 grid divide-warm-border border-warm-border md:grid-cols-2 md:divide-x lg:grid-cols-4">
          <ActionColumn
            to="/"
            icon={<NotePencil size={22} weight="light" />}
            index="01"
            title="Prepare a doctor brief"
            body="Make sense of a new or changing symptom."
            tone="accent"
          />
          <ActionColumn
            to="/chat"
            icon={<ChatCircleText size={22} weight="light" />}
            index="02"
            title="Ask HealthNav"
            body="Explore your records and prepare useful questions."
            tone="plum"
          />
          <ActionColumn
            to="/dashboard/upload"
            icon={<FileArrowUp size={22} weight="light" />}
            index="03"
            title="Add a health document"
            body="Bring test results and reports into your history."
            tone="marigold"
          />
          <ActionColumn
            to="/profile"
            icon={<UsersThree size={22} weight="light" />}
            index="04"
            title="Family profiles"
            body="Maintain separate histories with shared family context."
            tone="sage"
          />
        </section>

        {/* Reading columns */}
        <section className="animate-fade-in-up-3 mt-12 grid gap-x-12 gap-y-10 border-t-2 border-warm-off-white pt-8 lg:grid-cols-2 lg:divide-x lg:divide-warm-border">
          <Column
            kicker="Filed recently"
            label="Recent doctor briefs"
            empty="Your completed briefs will collect here."
            rows={cards.slice(0, 4).map((card) => ({
              id: card.card_id,
              title: card.summary ?? card.symptom_description ?? 'Doctor Prep Card',
              meta: `${card.quadrant?.quadrant_label ?? 'Saved'} · ${formatDate(card.created_at)}`,
            }))}
          />
          <Column
            className="lg:pl-12"
            kicker="On record"
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

function ActionColumn({ to, icon, index, title, body, tone }) {
  const tones = {
    accent: { accent: '#667f60', icon: 'text-accent' },
    plum: { accent: '#76556c', icon: 'text-plum' },
    marigold: { accent: '#b47a1d', icon: 'text-marigold' },
    sage: { accent: '#667f60', icon: 'text-sage' },
  }
  const palette = tones[tone]
  return (
    <Link
      to={to}
      style={{ '--tile-accent': palette.accent }}
      className="group flex min-h-52 flex-col justify-between px-0 py-6 transition-colors duration-300 md:px-6"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-warm-muted">{index}</span>
        <span className={`${palette.icon} transition-transform duration-300 group-hover:-translate-y-0.5`}>{icon}</span>
      </div>
      <div className="mt-10">
        <h2 className="font-serif text-2xl leading-tight text-warm-off-white">{title}</h2>
        <p className="mt-3 font-sans text-sm leading-6 text-warm-muted">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-muted transition-colors group-hover:text-accent">
          Read more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}

function Column({ kicker, label, rows, empty, className = '' }) {
  return (
    <div className={className}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{kicker}</p>
      <h3 className="mt-2 font-serif text-3xl font-light tracking-tight text-warm-off-white">{label}</h3>
      <div className="mt-5 border-t border-warm-off-white">
        {rows.length === 0 ? (
          <p className="border-b border-warm-border py-8 font-serif text-xl italic text-warm-muted">{empty}</p>
        ) : rows.map((row, i) => (
          <Link
            key={row.id}
            to="#"
            className="group flex items-baseline gap-4 border-b border-warm-border py-5"
          >
            <span className="mt-0.5 font-mono text-xs text-warm-muted">{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-snug text-warm-off-white transition-colors group-hover:text-accent">{row.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-warm-muted">{row.meta}</p>
            </div>
            <ArrowRight size={16} className="mt-1 shrink-0 text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
