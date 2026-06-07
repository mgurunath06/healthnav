import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChatCircleText, FileArrowUp, NotePencil } from '@phosphor-icons/react'
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
  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <Link to="/profile" className="editorial-link inline-flex items-center gap-2 text-sm text-warm-muted">
          <ArrowLeft size={16} /> Family directory
        </Link>
        <section className="mt-8 grid gap-8 border-b border-warm-border pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow">{profile.relation === 'self' ? 'Main profile' : profile.relation}</p>
            <h1 className="mt-4 font-serif text-5xl font-light tracking-tight text-warm-off-white sm:text-7xl">{profile.display_name}</h1>
            <p className="mt-4 font-sans text-base text-warm-muted">
              {[profile.age != null ? `${profile.age} years` : null, profile.sex, profile.date_of_birth].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Action to={`/investigate${query}`} icon={<NotePencil size={18} />} label="Start investigation" />
            <Action to={`/chat${query}`} icon={<ChatCircleText size={18} />} label={`Chat about ${profile.display_name}`} />
            <Action to={`/dashboard/upload${query}`} icon={<FileArrowUp size={18} />} label="Upload a document" />
          </div>
        </section>

        <section className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="eyebrow">Health memory</p>
            <div className="mt-4 rounded-[1.5rem] border border-warm-border bg-warm-surface p-6">
              <p className="whitespace-pre-wrap font-serif text-xl leading-8 text-warm-off-white">
                {memory.summary || 'HealthNav will build this summary from documents, investigations, and conversations.'}
              </p>
              {profile.notes && <p className="mt-5 border-t border-warm-border pt-5 font-sans text-sm leading-6 text-warm-muted">{profile.notes}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric value={profile.document_count} label="Documents" />
            <Metric value={profile.card_count} label="Briefs" />
            <Metric value={profile.conversation_count} label="Chats" />
          </div>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-2">
          <RecordList title="Recent documents" rows={documents.map((row) => ({ id: row.upload_id, title: row.title, meta: `${row.document_type} · ${row.date}` }))} empty="No documents filed yet." />
          <RecordList title="Doctor briefs" rows={cards.map((row) => ({ id: row.card_id, title: row.title, meta: row.date }))} empty="No completed briefs yet." />
        </section>
      </main>
    </div>
  )
}

function Action({ to, icon, label }) {
  return <Link to={to} className="flex min-w-56 items-center gap-3 rounded-full border border-warm-border bg-warm-surface px-5 py-3 font-sans text-sm text-warm-off-white hover:border-accent hover:text-accent">{icon}{label}</Link>
}

function Metric({ value, label }) {
  return <div className="rounded-2xl border border-warm-border bg-warm-surface p-4"><p className="font-mono text-2xl text-warm-off-white">{value}</p><p className="mt-1 font-sans text-xs text-warm-muted">{label}</p></div>
}

function RecordList({ title, rows, empty }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <div className="mt-4 border-t border-warm-border">
        {rows.length ? rows.map((row) => <div key={row.id} className="border-b border-warm-border py-4"><p className="font-sans text-sm text-warm-off-white">{row.title}</p><p className="mt-1 font-mono text-xs text-warm-muted">{row.meta}</p></div>) : <p className="border-b border-warm-border py-6 font-serif text-lg text-warm-muted">{empty}</p>}
      </div>
    </div>
  )
}
