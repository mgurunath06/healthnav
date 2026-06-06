import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
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

  const groups = profileGroups(profiles)

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <Link to="/dashboard" className="editorial-link inline-flex items-center gap-2 text-sm text-warm-muted">
          <ArrowLeft size={16} /> Health desk
        </Link>

        {/* Dossier header */}
        <section className="mt-8 flex flex-col gap-7 border-b-2 border-warm-off-white pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">
              <span>Family file</span>
              <span className="h-px w-8 bg-warm-border" />
              <span>{profiles.length} records</span>
            </div>
            <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-warm-off-white sm:text-6xl">
              Family health directory
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-base leading-7 text-warm-muted">
              Each person&apos;s documents and conversations stay independent, while relevant family history informs questions and screening discussions.
            </p>
          </div>
          <button onClick={() => setCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-warm-off-white px-6 py-3 font-sans text-sm font-semibold text-warm-surface transition-colors hover:bg-accent">
            <Plus size={17} /> Add family member
          </button>
        </section>

        {loading ? (
          <div className="mt-14 h-px w-32 bg-accent animate-agent-trace-pulse" />
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
            {/* Index rail */}
            <aside className="hidden lg:block">
              <div className="sticky top-10">
                <p className="eyebrow">Index</p>
                <nav className="mt-4 border-t border-warm-border">
                  {groups.map((group, i) => (
                    <a
                      key={group.label}
                      href={`#group-${i}`}
                      className="group flex items-baseline justify-between gap-2 border-b border-warm-border py-3 font-sans text-sm text-warm-muted transition-colors hover:text-accent"
                    >
                      <span className="leading-snug">{group.label}</span>
                      <span className="font-mono text-[11px]">{String(group.profiles.length).padStart(2, '0')}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Ledger */}
            <section className="min-w-0 space-y-12">
              {groups.map((group, gi) => (
                <div key={group.label} id={`group-${gi}`} className="scroll-mt-10">
                  <div className="mb-1 flex items-center gap-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{group.label}</p>
                    <span className="h-px flex-1 bg-warm-border" />
                  </div>
                  {/* Ledger column heads */}
                  <div className="hidden grid-cols-[110px_1fr_auto] gap-4 border-b border-warm-off-white py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-muted sm:grid">
                    <span>Record</span>
                    <span>Member</span>
                    <span className="text-right">Holdings</span>
                  </div>
                  <div className="border-t border-warm-off-white sm:border-t-0">
                    {group.profiles.map((profile, index) => (
                      <LedgerRow
                        key={profile.id}
                        profile={profile}
                        index={index}
                        onEdit={() => setEditing(profile)}
                        onRemove={() => remove(profile)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
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

function LedgerRow({ profile, index, onEdit, onRemove }) {
  const recordId = `${profile.relation === 'self' ? 'SELF' : 'MBR'}-${String(profile.id).padStart(4, '0').slice(-4)}`
  const detail = [profile.age != null ? `${profile.age} yrs` : null, profile.sex].filter(Boolean).join(' · ')
  return (
    <article
      className="animate-fade-in-up grid grid-cols-1 gap-4 border-b border-warm-border py-5 transition-colors hover:bg-warm-surface/60 sm:grid-cols-[110px_1fr_auto] sm:items-center"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Record id */}
      <div className="flex items-center justify-between sm:block">
        <p className="font-mono text-xs tracking-wider text-warm-muted">{recordId}</p>
        <RelationChip relation={profile.relation} />
      </div>

      {/* Member */}
      <div className="min-w-0">
        <Link to={`/profile/${profile.id}`} className="group inline-flex items-center gap-2">
          <h2 className="truncate font-serif text-2xl text-warm-off-white transition-colors group-hover:text-accent">{profile.display_name}</h2>
          <ArrowRight size={15} className="shrink-0 text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
        </Link>
        <p className="mt-1 font-sans text-sm text-warm-muted">
          {detail || 'Details can be completed anytime'}
        </p>
        {profile.aliases?.length > 0 && (
          <p className="mt-1 font-mono text-[11px] text-warm-muted">also: {profile.aliases.join(', ')}</p>
        )}
      </div>

      {/* Holdings + actions */}
      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <dl className="flex items-center gap-4 font-mono text-warm-off-white">
          <Holding value={profile.document_count} label="Docs" />
          <span className="h-6 w-px bg-warm-border" />
          <Holding value={profile.card_count} label="Briefs" />
          <span className="h-6 w-px bg-warm-border" />
          <Holding value={profile.conversation_count} label="Chats" />
        </dl>
        <div className="flex gap-2">
          <button onClick={onEdit} aria-label={`Edit ${profile.display_name}`} className="rounded-full border border-warm-border p-2 text-warm-muted transition-colors hover:border-accent hover:text-accent">
            <PencilSimple size={15} />
          </button>
          {profile.relation !== 'self' && (
            <button onClick={onRemove} aria-label={`Delete ${profile.display_name}`} className="rounded-full border border-warm-border p-2 text-warm-muted transition-colors hover:border-quadrant-q1 hover:text-quadrant-q1">
              <Trash size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function Holding({ value, label }) {
  return (
    <div className="text-center">
      <dd className="text-lg leading-none">{value}</dd>
      <dt className="mt-1 font-sans text-[10px] uppercase tracking-wider text-warm-muted">{label}</dt>
    </div>
  )
}

function RelationChip({ relation }) {
  const isSelf = relation === 'self'
  return (
    <span className={`mt-0 inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:mt-2 ${isSelf ? 'border-accent text-accent' : 'border-warm-border text-warm-muted'}`}>
      {relationLabel(relation)}
    </span>
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
