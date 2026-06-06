import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChatCircleText, FileArrowUp, NotePencil } from '@phosphor-icons/react'
import Header from './Header'
import { apiFetch } from '../lib/api'

export default function ProfileDetailScreen() {
  const { profileId } = useParams()
  const { getToken } = useAuth()
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getToken()
      .then((token) => apiFetch(`/profiles/${profileId}/overview`, { token }))
      .then((data) => { if (active) setOverview(data) })
      .catch(() => { if (active) setError('This profile could not be opened.') })
    return () => { active = false }
  }, [getToken, profileId])

  if (error) return <div className="min-h-dvh bg-warm-charcoal p-8 font-sans text-warm-off-white">{error}</div>
  if (!overview) return <div className="min-h-dvh bg-warm-charcoal grid place-items-center"><div className="h-px w-28 bg-accent animate-agent-trace-pulse" /></div>

  const { profile, memory, documents, cards } = overview
  const query = `?profile=${profile.id}`
  const meta = [profile.age != null ? `${profile.age} years` : null, profile.sex, profile.date_of_birth].filter(Boolean)

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-20">
        <Link to="/profile" className="editorial-link inline-flex items-center gap-2 text-sm text-warm-muted">
          <ArrowLeft size={16} /> Family directory
        </Link>

        {/* Name plate */}
        <section className="mt-16 text-center">
          <p className="eyebrow">{profile.relation === 'self' ? 'Main profile' : relationLabel(profile.relation)}</p>
          <h1 className="mx-auto mt-6 max-w-2xl text-balance font-serif text-6xl font-light leading-[0.95] tracking-[-0.04em] text-warm-off-white sm:text-8xl">
            {profile.display_name}
          </h1>
          {meta.length > 0 && (
            <p className="mt-7 font-mono text-xs uppercase tracking-[0.25em] text-warm-muted">
              {meta.join('  ·  ')}
            </p>
          )}
          <div className="mx-auto mt-10 h-px w-16 bg-warm-border" />
        </section>

        {/* Health memory — the centrepiece */}
        <section className="mt-16">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Health memory</p>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-center font-serif text-2xl font-light leading-[1.55] text-warm-off-white sm:text-3xl">
            {memory.summary || 'HealthNav will build this summary from documents, investigations, and conversations.'}
          </p>
          {profile.notes && (
            <p className="mx-auto mt-10 max-w-xl border-t border-warm-border pt-8 text-center font-sans text-sm leading-7 text-warm-muted">
              {profile.notes}
            </p>
          )}
        </section>

        {/* Holdings */}
        <section className="mt-20 flex items-center justify-center gap-12 border-y border-warm-border py-10">
          <Metric value={profile.document_count} label="Documents" />
          <span className="h-12 w-px bg-warm-border" />
          <Metric value={profile.card_count} label="Briefs" />
          <span className="h-12 w-px bg-warm-border" />
          <Metric value={profile.conversation_count} label="Chats" />
        </section>

        {/* Actions */}
        <section className="mt-16">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-warm-muted">Continue</p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            <Action to={`/${query}`} icon={<NotePencil size={18} />} label="Start an investigation" />
            <Action to={`/chat${query}`} icon={<ChatCircleText size={18} />} label={`Chat about ${profile.display_name}`} />
            <Action to={`/dashboard/upload${query}`} icon={<FileArrowUp size={18} />} label="Upload a document" />
          </div>
        </section>

        {/* Records */}
        <section className="mt-20 grid gap-14 sm:grid-cols-2">
          <RecordList
            title="Recent documents"
            rows={documents.map((row) => ({ id: row.upload_id, title: row.title, meta: `${row.document_type} · ${row.date}` }))}
            empty="No documents filed yet."
          />
          <RecordList
            title="Doctor briefs"
            rows={cards.map((row) => ({ id: row.card_id, title: row.title, meta: row.date }))}
            empty="No completed briefs yet."
          />
        </section>
      </main>
    </div>
  )
}

function Action({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 border-b border-warm-border py-4 font-sans text-base text-warm-off-white transition-colors hover:text-accent"
    >
      <span className="flex items-center gap-3">{icon}{label}</span>
      <ArrowRight size={16} className="text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
    </Link>
  )
}

function Metric({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-serif text-5xl font-light text-warm-off-white">{value}</p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">{label}</p>
    </div>
  )
}

function RecordList({ title, rows, empty }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{title}</p>
      <div className="mt-5 border-t border-warm-border">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="border-b border-warm-border py-4">
            <p className="font-serif text-lg leading-snug text-warm-off-white">{row.title}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-warm-muted">{row.meta}</p>
          </div>
        )) : (
          <p className="border-b border-warm-border py-6 font-serif text-lg italic text-warm-muted">{empty}</p>
        )}
      </div>
    </div>
  )
}

function relationLabel(value) {
  return value === 'self' ? 'Main profile' : value.replace(/^\w/, (letter) => letter.toUpperCase())
}
