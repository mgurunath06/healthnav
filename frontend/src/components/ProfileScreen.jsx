import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Note, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import Header from './Header'
import ProfileForm from './ProfileForm'
import { apiFetch } from '../lib/api'

export default function ProfileScreen() {
  const { getToken } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const token = await getToken()
    setProfiles(await apiFetch('/profiles', { token }))
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    getToken()
      .then((token) => apiFetch('/profiles', { token }))
      .then((rows) => {
        if (active) setProfiles(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [getToken])

  async function create(values) {
    const token = await getToken()
    await apiFetch('/profiles', { token, method: 'POST', body: JSON.stringify(values) })
    setCreating(false)
    await load()
  }

  async function update(values) {
    const token = await getToken()
    await apiFetch(`/profiles/${editing.id}`, { token, method: 'PATCH', body: JSON.stringify(values) })
    setEditing(null)
    await load()
  }

  async function remove(profile) {
    const recordCount = profile.document_count + profile.card_count + profile.conversation_count
    const warning = recordCount
      ? `Delete ${profile.display_name} and ${recordCount} linked health records? This cannot be undone.`
      : `Delete ${profile.display_name}?`
    if (!window.confirm(warning)) return
    const token = await getToken()
    await apiFetch(`/profiles/${profile.id}`, { token, method: 'DELETE' })
    await load()
  }

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <Link to="/dashboard" className="editorial-link inline-flex items-center gap-2 text-sm text-warm-muted">
          <ArrowLeft size={16} /> Health desk
        </Link>
        <section className="mt-8 flex flex-col gap-7 border-b border-warm-border pb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Family health directory</p>
            <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-warm-off-white sm:text-6xl">
              One family. Separate histories.
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-base leading-7 text-warm-muted">
              HealthNav keeps each person&apos;s documents and conversations independent, while using relevant family history when it changes a useful question or screening discussion.
            </p>
          </div>
          <button onClick={() => setCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-warm-off-white px-6 py-3 font-sans text-sm font-semibold text-warm-surface hover:bg-accent">
            <Plus size={17} /> Add family member
          </button>
        </section>

        {loading ? (
          <div className="mt-14 h-px w-32 bg-accent animate-agent-trace-pulse" />
        ) : (
          <section className="mt-10 space-y-10">
            {profileGroups(profiles).map((group) => (
              <div key={group.label}>
                <div className="mb-4 flex items-center gap-4">
                  <p className="eyebrow">{group.label}</p>
                  <span className="h-px flex-1 bg-warm-border" />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                {group.profiles.map((profile, index) => (
              <article key={profile.id} className="animate-fade-in-up rounded-[1.5rem] border border-warm-border bg-warm-surface p-6" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-warm-muted">{relationLabel(profile.relation)}</p>
                    <h2 className="mt-2 font-serif text-3xl text-warm-off-white">{profile.display_name}</h2>
                    <p className="mt-2 font-sans text-sm text-warm-muted">
                      {[profile.age != null ? `${profile.age} years` : null, profile.sex].filter(Boolean).join(' · ') || 'Details can be completed anytime'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(profile)} aria-label={`Edit ${profile.display_name}`} className="rounded-full border border-warm-border p-2 text-warm-muted hover:border-accent hover:text-accent">
                      <PencilSimple size={16} />
                    </button>
                    {profile.relation !== 'self' && (
                      <button onClick={() => remove(profile)} aria-label={`Delete ${profile.display_name}`} className="rounded-full border border-warm-border p-2 text-warm-muted hover:border-quadrant-q1 hover:text-quadrant-q1">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 border-t border-warm-border pt-5">
                  <Count icon={<FileText size={15} />} value={profile.document_count} label="Documents" />
                  <Count icon={<Note size={15} />} value={profile.card_count} label="Briefs" />
                  <Count value={profile.conversation_count} label="Chats" />
                </div>
                {profile.aliases?.length > 0 && (
                  <p className="mt-5 border-t border-warm-border pt-4 font-sans text-xs leading-5 text-warm-muted">
                    Records may also use: {profile.aliases.join(', ')}
                  </p>
                )}
                <Link to={`/profile/${profile.id}`} className="mt-5 inline-flex items-center gap-2 font-sans text-sm font-semibold text-accent hover:text-accent-hover">
                  Open health profile
                </Link>
              </article>
                ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {(creating || editing) && (
        <ProfileModal title={creating ? 'Add a family member' : `Edit ${editing.display_name}`} onClose={() => { setCreating(false); setEditing(null) }}>
          <ProfileForm
            key={editing?.id ?? 'new'}
            profile={editing}
            selfProfile={editing?.relation === 'self'}
            submitLabel={creating ? 'Add profile' : 'Save changes'}
            onSubmit={creating ? create : update}
            onCancel={() => { setCreating(false); setEditing(null) }}
          />
        </ProfileModal>
      )}
    </div>
  )
}

function ProfileModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-warm-off-white/30 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto max-w-xl rounded-[1.75rem] border border-warm-border bg-warm-surface p-6 shadow-matte sm:p-8">
        <div className="mb-7 flex items-center justify-between">
          <h2 className="font-serif text-3xl text-warm-off-white">{title}</h2>
          <button onClick={onClose} className="font-sans text-sm text-warm-muted">Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Count({ icon, value, label }) {
  return (
    <div>
      <p className="flex items-center gap-1 font-mono text-lg text-warm-off-white">{icon}{value}</p>
      <p className="mt-1 font-sans text-xs text-warm-muted">{label}</p>
    </div>
  )
}

function relationLabel(value) {
  return value === 'self' ? 'Main profile' : value.replace(/^\w/, (letter) => letter.toUpperCase())
}

function profileGroups(profiles) {
  const definitions = [
    ['Parents & grandparents', new Set(['mother', 'father', 'parent', 'grandmother', 'grandfather'])],
    ['You & partner', new Set(['self', 'wife', 'husband', 'spouse'])],
    ['Children & grandchildren', new Set(['son', 'daughter', 'child', 'grandchild'])],
    ['Siblings & extended family', new Set(['brother', 'sister', 'sibling', 'aunt', 'uncle', 'cousin', 'other'])],
  ]
  return definitions
    .map(([label, relations]) => ({
      label,
      profiles: profiles.filter((profile) => relations.has(profile.relation)),
    }))
    .filter((group) => group.profiles.length)
}
