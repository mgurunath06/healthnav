import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChatCircleText,
  Check,
  FileArrowUp,
  FolderOpen,
  LockKey,
  NotePencil,
  PencilSimple,
  Plus,
  Trash,
  UsersThree,
} from '@phosphor-icons/react'
import PreviewHeader from './PreviewHeader'
import PreviewProfileSelector from './PreviewProfileSelector'
import {
  previewCards,
  previewConversations,
  previewDocuments,
  previewMessages,
  previewPrepCard,
  previewProfileOverview,
  previewProfiles,
  previewUploadResult,
  previewUser,
} from './fixtures'

// Inert link: looks like a link but does not navigate (preview is self-contained).
function FauxLink({ className = '', children, ...rest }) {
  return (
    <span role="link" className={`cursor-default ${className}`} {...rest}>
      {children}
    </span>
  )
}

const QUADRANT_STYLES = {
  Q1: { border: 'border-quadrant-q1', text: 'text-quadrant-q1', label: 'Act Now' },
  Q2: { border: 'border-quadrant-q2', text: 'text-quadrant-q2', label: 'Schedule Soon' },
  Q3: { border: 'border-quadrant-q3', text: 'text-quadrant-q3', label: 'Watch & Self-Care' },
  Q4: { border: 'border-quadrant-q4', text: 'text-quadrant-q4', label: 'Monitor' },
}

const DEPTH_LABELS = { 1: 'Quick', 2: 'Focused', 3: 'Standard', 4: 'Thorough', 5: 'Comprehensive' }

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function relationLabel(value) {
  return value === 'self' ? 'Main profile' : value.replace(/^\w/, (l) => l.toUpperCase())
}

/* ───────────────────────── Dashboard ───────────────────────── */

export function DashboardPreview() {
  const cards = previewCards
  const docs = previewDocuments
  const edition = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <section className="animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warm-off-white pb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">
            <span>The Health Desk</span>
            <span className="hidden sm:inline">{edition}</span>
            <span>No. {String(cards.length + docs.length).padStart(3, '0')}</span>
          </div>
          <div className="grid items-end gap-8 border-b-2 border-warm-off-white py-7 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Daily edition · Personal health record</p>
              <h1 className="mt-4 font-serif text-5xl font-light leading-[0.95] tracking-[-0.04em] text-warm-off-white sm:text-7xl">
                Good morning, {previewUser.firstName}.
              </h1>
              <p className="mt-5 max-w-xl border-l-2 border-accent pl-4 font-serif text-lg italic leading-7 text-warm-muted">
                Your records, questions, and doctor briefs &mdash; gathered in one calm, considered place.
              </p>
            </div>
            <FauxLink className="group flex min-w-72 items-center justify-between rounded-full bg-warm-off-white px-6 py-4 font-sans text-sm font-semibold text-warm-surface transition-all duration-500 hover:-translate-y-1 hover:bg-accent">
              Start an investigation
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </FauxLink>
          </div>
        </section>

        <div className="animate-fade-in-up-2 mt-9 flex items-baseline justify-between border-b border-warm-border pb-2">
          <p className="eyebrow">Today&apos;s desk</p>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">Four columns</span>
        </div>

        <section className="animate-fade-in-up-2 mt-6 grid divide-warm-border border-warm-border md:grid-cols-2 md:divide-x lg:grid-cols-4">
          <ActionColumn icon={<NotePencil size={22} weight="light" />} index="01" title="Prepare a doctor brief" body="Make sense of a new or changing symptom." iconClass="text-accent" accent="#667f60" />
          <ActionColumn icon={<ChatCircleText size={22} weight="light" />} index="02" title="Ask HealthNav" body="Explore your records and prepare useful questions." iconClass="text-plum" accent="#76556c" />
          <ActionColumn icon={<FileArrowUp size={22} weight="light" />} index="03" title="Add a health document" body="Bring test results and reports into your history." iconClass="text-marigold" accent="#b47a1d" />
          <ActionColumn icon={<UsersThree size={22} weight="light" />} index="04" title="Family profiles" body="Maintain separate histories with shared family context." iconClass="text-sage" accent="#667f60" />
        </section>

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

function ActionColumn({ icon, index, title, body, iconClass, accent }) {
  return (
    <FauxLink
      style={{ '--tile-accent': accent }}
      className="group flex min-h-52 flex-col justify-between px-0 py-6 transition-colors duration-300 md:px-6"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-warm-muted">{index}</span>
        <span className={`${iconClass} transition-transform duration-300 group-hover:-translate-y-0.5`}>{icon}</span>
      </div>
      <div className="mt-10">
        <h2 className="font-serif text-2xl leading-tight text-warm-off-white">{title}</h2>
        <p className="mt-3 font-sans text-sm leading-6 text-warm-muted">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-muted transition-colors group-hover:text-accent">
          Read more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </FauxLink>
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
        ) : (
          rows.map((row, i) => (
            <FauxLink key={row.id} className="group flex items-baseline gap-4 border-b border-warm-border py-5">
              <span className="mt-0.5 font-mono text-xs text-warm-muted">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg leading-snug text-warm-off-white transition-colors group-hover:text-accent">{row.title}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-warm-muted">{row.meta}</p>
              </div>
              <ArrowRight size={16} className="mt-1 shrink-0 text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
            </FauxLink>
          ))
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── Family directory ───────────────────────── */

function profileGroups(profiles) {
  const definitions = [
    ['Parents & grandparents', new Set(['mother', 'father', 'parent', 'grandmother', 'grandfather'])],
    ['You & partner', new Set(['self', 'wife', 'husband', 'spouse'])],
    ['Children & grandchildren', new Set(['son', 'daughter', 'child', 'grandchild'])],
    ['Siblings & extended family', new Set(['brother', 'sister', 'sibling', 'aunt', 'uncle', 'cousin', 'other'])],
  ]
  return definitions
    .map(([label, relations]) => ({ label, profiles: profiles.filter((p) => relations.has(p.relation)) }))
    .filter((g) => g.profiles.length)
}

export function FamilyDirectoryPreview() {
  const profiles = previewProfiles
  const groups = profileGroups(profiles)

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <FauxLink className="editorial-link inline-flex items-center gap-2 text-sm text-warm-muted">
          <ArrowLeft size={16} /> Health desk
        </FauxLink>

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
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-warm-off-white px-6 py-3 font-sans text-sm font-semibold text-warm-surface transition-colors hover:bg-accent">
            <Plus size={17} /> Add family member
          </button>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-10">
              <p className="eyebrow">Index</p>
              <nav className="mt-4 border-t border-warm-border">
                {groups.map((group) => (
                  <span
                    key={group.label}
                    className="group flex items-baseline justify-between gap-2 border-b border-warm-border py-3 font-sans text-sm text-warm-muted transition-colors hover:text-accent"
                  >
                    <span className="leading-snug">{group.label}</span>
                    <span className="font-mono text-[11px]">{String(group.profiles.length).padStart(2, '0')}</span>
                  </span>
                ))}
              </nav>
            </div>
          </aside>

          <section className="min-w-0 space-y-12">
            {groups.map((group) => (
              <div key={group.label} className="scroll-mt-10">
                <div className="mb-1 flex items-center gap-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{group.label}</p>
                  <span className="h-px flex-1 bg-warm-border" />
                </div>
                <div className="hidden grid-cols-[110px_1fr_auto] gap-4 border-b border-warm-off-white py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-muted sm:grid">
                  <span>Record</span>
                  <span>Member</span>
                  <span className="text-right">Holdings</span>
                </div>
                <div className="border-t border-warm-off-white sm:border-t-0">
                  {group.profiles.map((profile, index) => (
                    <LedgerRow key={profile.id} profile={profile} index={index} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}

function LedgerRow({ profile, index }) {
  const recordId = `${profile.relation === 'self' ? 'SELF' : 'MBR'}-${String(profile.id).padStart(4, '0').slice(-4)}`
  const detail = [profile.age != null ? `${profile.age} yrs` : null, profile.sex].filter(Boolean).join(' · ')
  return (
    <article
      className="animate-fade-in-up grid grid-cols-1 gap-4 border-b border-warm-border py-5 transition-colors hover:bg-warm-surface/60 sm:grid-cols-[110px_1fr_auto] sm:items-center"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between sm:block">
        <p className="font-mono text-xs tracking-wider text-warm-muted">{recordId}</p>
        <RelationChip relation={profile.relation} />
      </div>
      <div className="min-w-0">
        <FauxLink className="group inline-flex items-center gap-2">
          <h2 className="truncate font-serif text-2xl text-warm-off-white transition-colors group-hover:text-accent">{profile.display_name}</h2>
          <ArrowRight size={15} className="shrink-0 text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
        </FauxLink>
        <p className="mt-1 font-sans text-sm text-warm-muted">{detail || 'Details can be completed anytime'}</p>
        {profile.aliases?.length > 0 && (
          <p className="mt-1 font-mono text-[11px] text-warm-muted">also: {profile.aliases.join(', ')}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <dl className="flex items-center gap-4 font-mono text-warm-off-white">
          <Holding value={profile.document_count} label="Docs" />
          <span className="h-6 w-px bg-warm-border" />
          <Holding value={profile.card_count} label="Briefs" />
          <span className="h-6 w-px bg-warm-border" />
          <Holding value={profile.conversation_count} label="Chats" />
        </dl>
        <div className="flex gap-2">
          <button aria-label={`Edit ${profile.display_name}`} className="rounded-full border border-warm-border p-2 text-warm-muted transition-colors hover:border-accent hover:text-accent">
            <PencilSimple size={15} />
          </button>
          {profile.relation !== 'self' && (
            <button aria-label={`Delete ${profile.display_name}`} className="rounded-full border border-warm-border p-2 text-warm-muted transition-colors hover:border-quadrant-q1 hover:text-quadrant-q1">
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

/* ───────────────────────── Profile viewer ───────────────────────── */

export function ProfileViewerPreview() {
  const { profile, memory, documents, cards } = previewProfileOverview
  const meta = [profile.age != null ? `${profile.age} years` : null, profile.sex, profile.date_of_birth].filter(Boolean)

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-20">
        <FauxLink className="editorial-link inline-flex items-center gap-2 text-sm text-warm-muted">
          <ArrowLeft size={16} /> Family directory
        </FauxLink>

        <section className="mt-16 text-center">
          <p className="eyebrow">{profile.relation === 'self' ? 'Main profile' : relationLabel(profile.relation)}</p>
          <h1 className="mx-auto mt-6 max-w-2xl text-balance font-serif text-6xl font-light leading-[0.95] tracking-[-0.04em] text-warm-off-white sm:text-8xl">
            {profile.display_name}
          </h1>
          {meta.length > 0 && (
            <p className="mt-7 font-mono text-xs uppercase tracking-[0.25em] text-warm-muted">{meta.join('  ·  ')}</p>
          )}
          <div className="mx-auto mt-10 h-px w-16 bg-warm-border" />
        </section>

        <section className="mt-16">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Health memory</p>
          <p className="mx-auto mt-8 max-w-2xl text-pretty text-center font-serif text-2xl font-light leading-[1.55] text-warm-off-white sm:text-3xl">
            {memory.summary}
          </p>
          {profile.notes && (
            <p className="mx-auto mt-10 max-w-xl border-t border-warm-border pt-8 text-center font-sans text-sm leading-7 text-warm-muted">
              {profile.notes}
            </p>
          )}
        </section>

        <section className="mt-20 flex items-center justify-center gap-12 border-y border-warm-border py-10">
          <Metric value={profile.document_count} label="Documents" />
          <span className="h-12 w-px bg-warm-border" />
          <Metric value={profile.card_count} label="Briefs" />
          <span className="h-12 w-px bg-warm-border" />
          <Metric value={profile.conversation_count} label="Chats" />
        </section>

        <section className="mt-16">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-warm-muted">Continue</p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            <ProfileAction icon={<NotePencil size={18} />} label="Start an investigation" />
            <ProfileAction icon={<ChatCircleText size={18} />} label={`Chat about ${profile.display_name}`} />
            <ProfileAction icon={<FileArrowUp size={18} />} label="Upload a document" />
          </div>
        </section>

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

function ProfileAction({ icon, label }) {
  return (
    <FauxLink className="group flex items-center justify-between gap-3 border-b border-warm-border py-4 font-sans text-base text-warm-off-white transition-colors hover:text-accent">
      <span className="flex items-center gap-3">{icon}{label}</span>
      <ArrowRight size={16} className="text-warm-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
    </FauxLink>
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
        {rows.length ? (
          rows.map((row) => (
            <div key={row.id} className="border-b border-warm-border py-4">
              <p className="font-serif text-lg leading-snug text-warm-off-white">{row.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-warm-muted">{row.meta}</p>
            </div>
          ))
        ) : (
          <p className="border-b border-warm-border py-6 font-serif text-lg italic text-warm-muted">{empty}</p>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── Investigation ───────────────────────── */

const DEPTH_OPTIONS = [
  { level: 1, label: 'Quick', detail: 'No follow-ups' },
  { level: 2, label: 'Focused', detail: 'Up to 1 question' },
  { level: 3, label: 'Standard', detail: 'Up to 2 questions' },
  { level: 4, label: 'Thorough', detail: 'Up to 4 questions' },
  { level: 5, label: 'Comprehensive', detail: 'Up to 6 questions' },
]
const MAX_CHARS = 2000

export function InvestigationPreview() {
  const [text, setText] = useState(
    'For the last three weeks I keep getting a dull headache in the evenings, usually behind my eyes. Bright light makes it slightly worse. It eases after I rest and drink water.',
  )
  const [depth, setDepth] = useState(4)
  const [profileId, setProfileId] = useState('')
  const canSubmit = text.trim().length >= 10

  return (
    <div className="app-canvas flex min-h-dvh flex-col bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <main className="mx-auto grid w-full max-w-[90rem] flex-1 gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)_18rem] lg:py-10">
        <aside className="animate-fade-in-up rounded-[1.75rem] border border-warm-border/70 bg-warm-surface p-6 shadow-matte">
          <p className="eyebrow">Personal workspace</p>
          <h1 className="mt-4 font-serif text-3xl font-light leading-tight text-warm-off-white">
            Good to see you, {previewUser.firstName}.
          </h1>
          <p className="mt-3 text-sm leading-6 text-warm-muted">
            Your records and past briefs can now inform a more useful conversation.
          </p>
          <div className="mt-7">
            <PreviewProfileSelector value={profileId} onChange={setProfileId} />
          </div>
          <nav className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Health workspace">
            <WorkspaceLink icon={<FolderOpen size={18} />} label="Health desk" />
            <WorkspaceLink icon={<FileArrowUp size={18} />} label="Add document" />
            <WorkspaceLink icon={<ChatCircleText size={18} />} label="Ask HealthNav" />
          </nav>
        </aside>

        <section className="animate-fade-in-up-2 py-3 lg:px-3 lg:py-0">
          <div className="mb-7 flex flex-col justify-between gap-4 border-b border-warm-border/70 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">New investigation</p>
              <h2 className="mt-3 font-serif text-4xl font-light tracking-[-0.04em] text-warm-off-white sm:text-5xl">
                What should we prepare for?
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-warm-muted">
              Start with what changed. HealthNav will structure the details.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="editorial-panel relative overflow-hidden rounded-[2rem]">
            <div className="editorial-rule-in absolute left-0 top-0 h-[3px] w-2/5 bg-accent" />
            <div className="border-b border-warm-border/70 px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Your health note</p>
                  <p className="mt-1 font-serif text-2xl text-warm-off-white">What has changed?</p>
                </div>
                <NotePencil size={25} weight="light" className="text-marigold" />
              </div>
            </div>
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                rows={7}
                className="w-full resize-none border-0 bg-transparent font-serif text-xl font-light leading-8 text-warm-off-white outline-none placeholder:text-warm-muted/55 sm:text-2xl"
              />
              <div className="mt-4 flex items-center justify-between border-t border-warm-border/60 pt-4">
                <p className="font-sans text-xs text-warm-muted">Press Shift + Enter for a new line</p>
                <span className="font-mono text-xs tabular-nums text-warm-muted">{text.length}/{MAX_CHARS}</span>
              </div>

              <PaceDial value={depth} selectedOption={DEPTH_OPTIONS[depth - 1]} onChange={setDepth} />

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-7 flex w-full items-center justify-between rounded-full bg-accent px-6 py-4 font-sans text-sm font-semibold text-warm-charcoal transition-colors hover:enabled:bg-marigold disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span>Prepare my doctor brief</span>
                <ArrowRight size={19} />
              </button>
            </div>
          </form>
        </section>

        <aside className="animate-fade-in-up-3 rounded-[1.75rem] border border-warm-border/70 bg-warm-surface p-6 shadow-matte">
          <p className="eyebrow">Available to this brief</p>
          <div className="mt-5 space-y-6">
            <ContextRow index="01" title="Saved history" body="Past doctor briefs stay available in your health desk." />
            <ContextRow index="02" title="Health documents" body="Upload reports and results to keep useful context together." />
            <ContextRow index="03" title="Adjustable depth" body="Choose how thorough this investigation should be." />
          </div>
          <span className="mt-8 flex items-center justify-between border-y border-warm-border py-4 text-sm text-warm-off-white transition-colors hover:text-marigold">
            Add context from a report
            <ArrowRight size={17} />
          </span>
        </aside>
      </main>

      <footer className="border-t border-warm-border/60 px-5 py-5 text-center font-sans text-xs text-warm-muted">
        HealthNav organizes information for a medical conversation. It does not diagnose or replace professional care.
      </footer>
    </div>
  )
}

function PaceDial({ value, selectedOption, onChange }) {
  const angle = -70 + ((value - 1) / 4) * 140
  const progress = ((value - 1) / 4) * 100
  const tickAngles = [-70, -35, 0, 35, 70]
  function pointAt(deg, radius) {
    const radians = (deg - 90) * (Math.PI / 180)
    return { x: 120 + radius * Math.cos(radians), y: 120 + radius * Math.sin(radians) }
  }
  return (
    <fieldset className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <legend className="eyebrow">Investigation depth</legend>
        <span className="font-mono text-[11px] text-warm-muted">LEVEL {value} / 5</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-warm-border bg-parchment">
        <div className="grid items-center gap-2 px-5 pt-5 sm:grid-cols-[minmax(15rem,0.9fr)_1fr] sm:px-7">
          <div className="relative mx-auto w-full max-w-[17rem]" aria-hidden="true">
            <svg viewBox="0 0 240 145" className="w-full overflow-visible">
              <path d="M 30 120 A 90 90 0 0 1 210 120" pathLength="100" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" className="text-warm-border" />
              <path d="M 30 120 A 90 90 0 0 1 210 120" pathLength="100" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${progress} 100`} className="text-accent transition-all duration-500" />
              {tickAngles.map((tickAngle, index) => {
                const start = pointAt(tickAngle, 77)
                const end = pointAt(tickAngle, 86)
                return (
                  <line key={tickAngle} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="currentColor" strokeWidth="2" className={index + 1 <= value ? 'text-warm-charcoal' : 'text-warm-muted'} />
                )
              })}
              <g transform={`rotate(${angle} 120 120)`} className="transition-transform duration-500" style={{ transformOrigin: '120px 120px' }}>
                <line x1="120" y1="120" x2="120" y2="49" stroke="currentColor" strokeWidth="3" className="text-marigold" />
                <circle cx="120" cy="49" r="4" fill="currentColor" className="text-marigold" />
              </g>
              <circle cx="120" cy="120" r="13" fill="currentColor" className="text-warm-elevated" />
              <circle cx="120" cy="120" r="5" fill="currentColor" className="text-marigold" />
            </svg>
            <span className="absolute bottom-2 left-1 font-mono text-[9px] tracking-widest text-warm-muted">QUICK</span>
            <span className="absolute bottom-2 right-0 font-mono text-[9px] tracking-widest text-warm-muted">DEEP</span>
          </div>
          <div className="border-t border-warm-border/70 py-5 sm:border-l sm:border-t-0 sm:py-3 sm:pl-7">
            <p className="font-serif text-3xl font-light text-warm-off-white">{selectedOption.label}</p>
            <p className="mt-2 text-sm leading-6 text-warm-muted">{selectedOption.detail}</p>
            <p className="mt-4 text-xs leading-5 text-warm-muted">Safety screening remains equally thorough at every depth.</p>
          </div>
        </div>
        <div className="border-t border-warm-border/70 px-5 py-4 sm:px-7">
          <input type="range" min="1" max="5" step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Investigation depth" className="pace-range w-full" />
          <div className="mt-3 grid grid-cols-5">
            {DEPTH_OPTIONS.map((option) => (
              <button key={option.level} type="button" onClick={() => onChange(option.level)} aria-pressed={value === option.level} className={`font-sans text-[10px] transition-colors sm:text-xs ${value === option.level ? 'text-warm-off-white' : 'text-warm-muted hover:text-marigold'}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  )
}

function WorkspaceLink({ icon, label }) {
  return (
    <FauxLink className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-warm-muted transition-colors hover:bg-warm-elevated hover:text-warm-off-white">
      <span className="text-marigold">{icon}</span>
      {label}
    </FauxLink>
  )
}

function ContextRow({ index, title, body }) {
  return (
    <div className="border-t border-warm-border/70 pt-4">
      <span className="font-mono text-[10px] text-marigold">{index}</span>
      <h3 className="mt-2 font-serif text-lg text-warm-off-white">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-warm-muted">{body}</p>
    </div>
  )
}

/* ───────────────────────── Upload ───────────────────────── */

const DOC_TYPES = [
  { value: 'blood_test', label: 'Blood test' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'imaging_report', label: 'Imaging report' },
  { value: 'other', label: 'Other' },
]

export function UploadPreview() {
  const [docType, setDocType] = useState('blood_test')
  const [profileId, setProfileId] = useState('')
  const [showResult, setShowResult] = useState(true)
  const result = previewUploadResult

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 lg:py-14">
        <p className="eyebrow">Add to your health record</p>
        <h1 className="mt-3 font-serif text-4xl font-light tracking-[-0.04em] text-warm-off-white sm:text-5xl">
          Upload a document
        </h1>
        <p className="mt-4 font-sans text-base leading-7 text-warm-muted">
          Files are processed in memory to extract health values, then discarded. Nothing is stored.
        </p>

        <div className="mt-8 flex gap-2">
          <PreviewToggle active={!showResult} onClick={() => setShowResult(false)}>Upload form</PreviewToggle>
          <PreviewToggle active={showResult} onClick={() => setShowResult(true)}>Extraction result</PreviewToggle>
        </div>

        <div className="mt-6">
          {showResult ? (
            <UploadResultView result={result} />
          ) : (
            <div className="rounded-2xl border border-warm-border bg-warm-surface p-6">
              <p className="mb-5 font-mono text-xs uppercase tracking-widest text-warm-muted">Upload Document</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-warm-border bg-warm-elevated px-4 py-3">
                  <FileArrowUp size={18} className="shrink-0 text-marigold" />
                  <span className="flex-1 truncate font-sans text-sm text-warm-off-white">Complete Blood Count — May 2026.pdf</span>
                  <span className="shrink-0 font-sans text-xs text-warm-muted">Change</span>
                </div>
                <div>
                  <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-warm-muted">Document type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-warm-border bg-warm-elevated px-4 py-2.5 font-sans text-sm text-warm-off-white outline-none transition-colors focus:border-accent"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <PreviewProfileSelector value={profileId} onChange={setProfileId} />
                <button className="w-full rounded-lg bg-accent px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-accent/90">
                  Extract health values
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function PreviewToggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 font-sans text-xs transition-colors ${
        active ? 'border-accent text-accent' : 'border-warm-border text-warm-muted hover:text-warm-off-white'
      }`}
    >
      {children}
    </button>
  )
}

function UploadResultView({ result }) {
  const meta = result.document_meta ?? {}
  return (
    <div className="rounded-2xl border border-warm-border bg-warm-surface p-6">
      <p className="mb-5 font-mono text-xs uppercase tracking-widest text-warm-muted">Upload Result</p>
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-xl border border-warm-border bg-warm-elevated px-5 py-4">
          <p className="font-sans text-sm text-warm-off-white">
            Extracted from <span className="font-medium">{result._filename}</span>. File has been discarded.
          </p>
          {meta.document_date && <p className="font-sans text-xs text-warm-muted">Report date: {meta.document_date}</p>}
          {meta.hospital_or_lab && <p className="font-sans text-xs text-warm-muted">{meta.hospital_or_lab}</p>}
          {result.processing_note && <p className="font-sans text-xs italic text-warm-muted">{result.processing_note}</p>}
        </div>

        {meta.patient_name && (
          <div className="rounded-xl border border-warm-border bg-warm-elevated px-5 py-4">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-warm-muted">Patient</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-sans text-sm text-warm-off-white">{meta.patient_name}</span>
              <span className="font-sans text-xs text-warm-muted">{[meta.patient_age, meta.patient_sex].filter(Boolean).join(' · ')}</span>
              <span className="rounded-full border border-green-400/20 bg-green-400/10 px-2 py-0.5 font-sans text-xs text-green-400">
                Matches your profile
              </span>
            </div>
          </div>
        )}

        {result.conclusions?.length > 0 && (
          <div className="rounded-xl border border-warm-border bg-warm-elevated px-5 py-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-warm-muted">Conclusions</p>
            <ul className="space-y-1.5">
              {result.conclusions.map((c, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span className="font-sans text-sm leading-snug text-warm-off-white">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.numeric_values?.length > 0 && (
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-warm-muted">Lab Values</p>
            <div className="overflow-x-auto rounded-xl border border-warm-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-warm-border bg-warm-elevated">
                    {['Name', 'Value', 'Unit', 'Reference range', ''].map((h, i) => (
                      <th key={i} className="whitespace-nowrap px-4 py-3 font-mono text-xs uppercase tracking-widest text-warm-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.numeric_values.map((v, i) => (
                    <tr key={i} className="border-b border-warm-border last:border-0 odd:bg-transparent even:bg-warm-elevated/30">
                      <td className="px-4 py-3 font-sans text-sm text-warm-off-white">{v.name}</td>
                      <td className="px-4 py-3 font-mono text-sm text-warm-off-white">{v.value}</td>
                      <td className="px-4 py-3 font-sans text-sm text-warm-muted">{v.unit ?? '—'}</td>
                      <td className="px-4 py-3 font-sans text-sm text-warm-muted">{v.reference_range ?? '—'}</td>
                      <td className="w-8 px-4 py-3 text-center font-sans text-xs text-yellow-400">{v.is_abnormal ? 'Low' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── Companion (chat) ───────────────────────── */

export function CompanionPreview() {
  const [input, setInput] = useState('')
  const conversations = previewConversations
  const messages = previewMessages

  return (
    <div className="app-canvas flex min-h-dvh flex-col bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <main className="grid min-h-0 flex-1 md:grid-cols-[16rem_1fr]">
        <aside className="space-y-5 overflow-y-auto border-b border-warm-border bg-warm-surface p-5 md:border-b-0 md:border-r">
          <span className="editorial-link font-sans text-sm text-warm-muted hover:text-warm-off-white">Dashboard</span>
          <button className="w-full rounded-full bg-warm-off-white px-4 py-3 font-sans text-sm font-semibold text-warm-surface transition-all duration-500 hover:-translate-y-0.5 hover:bg-accent">
            New chat
          </button>
          <div className="space-y-2">
            {conversations.map((conv, i) => (
              <button
                key={conv.conversation_id}
                className={`w-full border-b px-3 py-3 text-left font-sans text-sm transition-colors ${
                  i === 0 ? 'border-accent text-warm-off-white' : 'border-warm-border text-warm-muted hover:text-warm-off-white'
                }`}
              >
                <span className="block truncate">{conv.title}</span>
                <span className="font-mono text-xs text-warm-muted">{formatDate(conv.updated_at)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="border-b border-warm-border bg-warm-surface p-4">
            <div className="mx-auto max-w-3xl">
              <PreviewProfileSelector value="" onChange={() => {}} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((message, i) => (
                <MessageBlock key={i} message={message} />
              ))}
            </div>
          </div>

          <div className="border-t border-warm-border p-4 sm:p-6">
            <div className="editorial-panel mx-auto flex max-w-3xl gap-3 rounded-[1.5rem] p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                rows={2}
                placeholder="Ask a wellness question..."
                className="flex-1 resize-none rounded-xl border-0 bg-transparent px-4 py-3 font-sans text-sm text-warm-off-white placeholder-warm-muted outline-none"
              />
              <button disabled={!input.trim()} className="self-end rounded-full bg-accent px-5 py-3 font-sans text-sm font-semibold text-warm-charcoal disabled:opacity-40">
                Send
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function MessageBlock({ message }) {
  const assistant = message.role === 'assistant'
  return (
    <div className={`flex ${assistant ? 'justify-start' : 'justify-end'} animate-fade-in-up`}>
      <div className={`max-w-[85%] px-5 py-4 shadow-matte ${assistant ? 'border-l-2 border-plum bg-warm-surface' : 'rounded-2xl bg-warm-elevated text-warm-off-white'}`}>
        <p className={`${assistant ? 'font-serif text-lg text-warm-off-white' : 'font-sans text-sm text-warm-off-white'} whitespace-pre-wrap leading-relaxed`}>
          {message.content}
        </p>
        {message.disclaimer_shown && (
          <p className="mt-3 font-sans text-xs italic text-warm-muted">
            HealthNav provides clinical context, not a diagnosis. Confirm medical decisions with a licensed clinician.
          </p>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── Doctor brief (prep card) ───────────────────────── */

export function DoctorBriefPreview() {
  const card = previewPrepCard
  const qStyle = QUADRANT_STYLES[card.quadrant?.quadrant_id] ?? QUADRANT_STYLES.Q4
  const cardDepth = card.investigation_depth ?? 3
  const today = new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()

  return (
    <div className="app-canvas flex min-h-dvh flex-col bg-warm-charcoal">
      <PreviewHeader userName={previewUser.firstName} />
      <div className="flex-1 overflow-y-auto px-4 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-[2rem] border border-warm-border bg-warm-surface shadow-matte">
            <div className="flex items-start justify-between gap-4 border-b border-warm-border px-8 pb-6 pt-8">
              <div>
                <p className="mb-1 font-mono text-xs uppercase tracking-widest text-warm-muted">Doctor Visit Prep Card</p>
                <p className="font-mono text-xs text-warm-muted">{today}</p>
                <p className="mt-1 font-mono text-xs text-warm-muted">{DEPTH_LABELS[cardDepth]} investigation · Level {cardDepth}/5</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`font-mono text-xs uppercase tracking-widest ${qStyle.text}`}>{card.quadrant?.quadrant_id}</span>
                <span className={`inline-block rounded-full border px-3 py-1 font-sans text-xs font-medium ${qStyle.border} ${qStyle.text}`}>
                  {card.quadrant?.quadrant_label ?? qStyle.label}
                </span>
                <span className="max-w-48 text-right font-sans text-xs leading-snug text-warm-muted">{card.quadrant?.recommended_action}</span>
              </div>
            </div>

            <CardSection label="Summary">
              <p className="font-sans text-sm leading-relaxed text-warm-muted">{card.summary}</p>
              {card.symptom_timeline && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip label="Symptom" value={card.symptom_timeline.primary_symptom} />
                  <Chip label="Duration" value={card.symptom_timeline.duration} />
                  <Chip label="Severity" value={card.symptom_timeline.severity} />
                  <Chip label="Frequency" value={card.symptom_timeline.frequency} />
                </div>
              )}
            </CardSection>

            <CardDivider />
            <CardSection label="Our Assessment">
              <div className="rounded-xl border border-quadrant-q2 bg-warm-elevated px-5 py-4">
                <p className="font-sans text-sm leading-relaxed text-warm-off-white">{card.suspected_cause}</p>
              </div>
            </CardSection>

            <CardDivider />
            <CardSection label="Key Findings">
              <ul className="space-y-2">
                {card.key_findings.map((finding, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span className="font-sans text-sm leading-snug text-warm-muted">{finding}</span>
                  </li>
                ))}
              </ul>
            </CardSection>

            <CardDivider />
            <CardSection label="Questions to Ask Your Doctor">
              <div className="space-y-2">
                {card.questions_to_ask_doctor.map((q, i) => (
                  <div key={i} className="rounded-r-lg border-l-2 border-quadrant-q2 bg-warm-elevated px-4 py-3">
                    <span className="font-sans text-sm leading-snug text-warm-off-white">{q}</span>
                  </div>
                ))}
              </div>
            </CardSection>

            <CardDivider />
            <CardSection label="Potentially Relevant Specialties">
              <div className="flex flex-wrap gap-2">
                {card.potentially_relevant_specialties.map((s, i) => (
                  <span key={i} className="rounded-full border border-warm-border bg-warm-elevated px-3 py-1.5 font-mono text-xs text-warm-muted">{s}</span>
                ))}
              </div>
            </CardSection>

            <CardDivider />
            <CardSection label="Recommended Next Step">
              <div className="flex items-start gap-4 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-accent" />
                <div>
                  <p className="font-sans text-sm font-medium leading-relaxed text-warm-off-white">{card.recommended_next_step}</p>
                  <p className="mt-2 font-sans text-xs leading-relaxed text-warm-muted">
                    This card is designed to help you have a more informed conversation with your doctor — not to replace that visit.
                  </p>
                </div>
              </div>
            </CardSection>

            <div className="border-t border-warm-border bg-warm-elevated px-8 py-4">
              <p className="font-sans text-xs leading-relaxed text-warm-muted">{card.disclaimer}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-accent px-5 py-2.5 font-sans text-sm font-medium text-accent transition-colors hover:bg-accent/10">Save as PDF</button>
              <button className="flex items-center gap-2 rounded-lg border border-warm-border px-5 py-2.5 font-sans text-sm font-medium text-warm-muted transition-colors hover:border-warm-off-white hover:text-warm-off-white">↗ Share Card</button>
              <button className="rounded-lg border border-warm-border px-5 py-2.5 font-sans text-sm font-medium text-warm-muted transition-colors hover:border-warm-off-white hover:text-warm-off-white">Save Card</button>
            </div>
            <button className="font-sans text-sm text-warm-muted transition-colors hover:text-warm-off-white">Start Over</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardSection({ label, children }) {
  return (
    <div className="px-8 py-6">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-warm-muted">{label}</p>
      {children}
    </div>
  )
}

function CardDivider() {
  return <hr className="mx-8 border-0 border-t border-warm-border" />
}

function Chip({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-warm-border bg-warm-elevated px-3 py-1.5">
      <span className="font-mono text-xs text-warm-muted">{label}:</span>
      <span className="font-sans text-xs capitalize text-warm-off-white">{value}</span>
    </div>
  )
}
