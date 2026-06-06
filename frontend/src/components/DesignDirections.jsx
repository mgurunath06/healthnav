import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, FileText, Plus } from '@phosphor-icons/react'

/* ------------------------------------------------------------------ *
 * Design Directions showcase
 * A non-destructive route that previews three meaningfully different
 * visual directions for: 1) signed-in dashboard, 2) family hierarchy,
 * 3) individual profile viewer — at 1440px desktop and 390px mobile.
 * No existing routes, API contracts, auth, or state are touched.
 * ------------------------------------------------------------------ */

/* Static class maps — Tailwind only generates classes it can see as full strings. */
const DOT = { accent: 'bg-accent', plum: 'bg-plum', marigold: 'bg-marigold', sage: 'bg-sage' }
const BORDER_L = { accent: 'border-accent', plum: 'border-plum', marigold: 'border-marigold', sage: 'border-sage' }
const CHIP = {
  accent: 'border-accent text-accent',
  plum: 'border-plum text-plum',
  marigold: 'border-marigold text-marigold',
  sage: 'border-sage text-sage',
}
const TEXT = { accent: 'text-accent', plum: 'text-plum', marigold: 'text-marigold', sage: 'text-sage' }

const FAMILY = {
  self: { name: 'Aanya Rao', relation: 'Self', age: 34, sex: 'Female', docs: 12, briefs: 4, chats: 7 },
  partner: { name: 'Vikram Rao', relation: 'Partner', age: 36, sex: 'Male', docs: 5, briefs: 1, chats: 2 },
  mother: { name: 'Lata Rao', relation: 'Mother', age: 63, sex: 'Female', docs: 9, briefs: 3, chats: 4 },
  father: { name: 'Suresh Rao', relation: 'Father', age: 67, sex: 'Male', docs: 14, briefs: 6, chats: 5 },
  son: { name: 'Arjun Rao', relation: 'Son', age: 6, sex: 'Male', docs: 3, briefs: 0, chats: 1 },
  daughter: { name: 'Mira Rao', relation: 'Daughter', age: 9, sex: 'Female', docs: 4, briefs: 1, chats: 2 },
}

/* ============================ FRAME WRAPPER ============================ */

function Frame({ label, w, h, scale, children }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-warm-muted">{label}</span>
        <span className="font-mono text-[10px] text-warm-border">{w}×{h}</span>
        <span className="h-px flex-1 bg-warm-border/70" />
      </figcaption>
      <div
        className="overflow-hidden rounded-xl border border-warm-border bg-warm-surface shadow-matte"
        style={{ width: w * scale, height: h * scale }}
      >
        <div
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
    </figure>
  )
}

function ScreenRow({ title, note, desktop, mobile, dScale, mScale }) {
  return (
    <div className="mb-12">
      <div className="mb-5 flex items-baseline gap-4">
        <h4 className="font-serif text-2xl font-light tracking-tight text-warm-off-white">{title}</h4>
        <p className="font-sans text-sm text-warm-muted">{note}</p>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <Frame label="Desktop" w={1440} h={900} scale={dScale}>{desktop}</Frame>
        <Frame label="Mobile" w={390} h={844} scale={mScale}>{mobile}</Frame>
      </div>
    </div>
  )
}

/* ================================================================== *
 * DIRECTION A — THE BROADSHEET
 * Medical-journal / newspaper. Masthead, ruled multi-column grid,
 * serif headlines, dateline metadata, thin rules, asymmetric columns.
 * ================================================================== */

function AMast({ small }) {
  return (
    <div className={`flex items-center justify-between border-b-2 border-warm-off-white ${small ? 'px-5 py-3' : 'px-12 py-5'}`}>
      <div className="flex items-baseline gap-3">
        <span className={`font-serif italic tracking-tight text-warm-off-white ${small ? 'text-xl' : 'text-3xl'}`}>HealthNav</span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-warm-muted sm:inline">Family Health Record</span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-warm-muted">Vol. IV · Tue</span>
    </div>
  )
}

function DashA() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <AMast />
      <div className="px-12 py-9">
        <div className="flex items-end justify-between border-b border-warm-border pb-7">
          <div>
            <p className="eyebrow">The morning desk</p>
            <h1 className="mt-3 max-w-2xl font-serif text-6xl font-light leading-[0.95] tracking-[-0.03em]">Good morning, Aanya.</h1>
          </div>
          <button className="flex items-center gap-3 border border-warm-off-white px-6 py-3 font-sans text-sm font-semibold">
            Start an investigation <ArrowRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-12 gap-10 pt-8">
          <div className="col-span-7 border-r border-warm-border pr-10">
            <p className="eyebrow mb-4">Latest doctor briefs</p>
            {[
              ['Persistent evening headaches', 'Investigation · 14 Mar', 'accent'],
              ['Father — blood pressure review', 'Brief · 09 Mar', 'plum'],
              ['Thyroid panel discussion', 'Brief · 02 Mar', 'marigold'],
            ].map(([t, m, c]) => (
              <div key={t} className="flex items-start gap-5 border-b border-warm-border py-5">
                <span className={`mt-2 h-2 w-2 rounded-full ${DOT[c]}`} />
                <div className="flex-1">
                  <h3 className="font-serif text-2xl leading-tight">{t}</h3>
                  <p className="mt-1 font-mono text-xs text-warm-muted">{m}</p>
                </div>
                <ArrowUpRight size={18} className="text-warm-muted" />
              </div>
            ))}
          </div>
          <div className="col-span-5">
            <p className="eyebrow mb-4">On the desk</p>
            {[
              ['01', 'Prepare a doctor brief'],
              ['02', 'Ask HealthNav'],
              ['03', 'Add a health document'],
              ['04', 'Family profiles'],
            ].map(([i, t]) => (
              <div key={i} className="flex items-center gap-4 border-b border-warm-border py-4">
                <span className="font-mono text-xs text-warm-muted">{i}</span>
                <span className="font-serif text-xl">{t}</span>
                <ArrowRight size={15} className="ml-auto text-warm-muted" />
              </div>
            ))}
            <div className="mt-7 bg-warm-elevated p-6">
              <p className="eyebrow">Health documents</p>
              <p className="mt-3 font-serif text-lg leading-7">Lipid panel · 41 values</p>
              <p className="font-serif text-lg leading-7 text-warm-muted">Chest X-ray report · 6 findings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashAMobile() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <AMast small />
      <div className="px-5 py-6">
        <p className="eyebrow">The morning desk</p>
        <h1 className="mt-2 font-serif text-4xl font-light leading-[0.95] tracking-[-0.02em]">Good morning, Aanya.</h1>
        <button className="mt-5 flex w-full items-center justify-between border border-warm-off-white px-5 py-3 text-sm font-semibold">
          Start an investigation <ArrowRight size={15} />
        </button>
        <p className="eyebrow mt-8 mb-3">Latest doctor briefs</p>
        {[['Persistent evening headaches', '14 Mar', 'accent'], ['Father — BP review', '09 Mar', 'plum']].map(([t, m, c]) => (
          <div key={t} className="flex items-start gap-3 border-b border-warm-border py-4">
            <span className={`mt-2 h-2 w-2 rounded-full ${DOT[c]}`} />
            <div className="flex-1"><h3 className="font-serif text-xl leading-tight">{t}</h3><p className="mt-1 font-mono text-[11px] text-warm-muted">{m}</p></div>
          </div>
        ))}
        <p className="eyebrow mt-7 mb-2">On the desk</p>
        {[['01', 'Prepare a doctor brief'], ['02', 'Ask HealthNav'], ['03', 'Add a document']].map(([i, t]) => (
          <div key={i} className="flex items-center gap-3 border-b border-warm-border py-3">
            <span className="font-mono text-[11px] text-warm-muted">{i}</span><span className="font-serif text-lg">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function familyAColumns() {
  return [
    ['You & partner', [FAMILY.self, FAMILY.partner]],
    ['Parents & grandparents', [FAMILY.mother, FAMILY.father]],
    ['Children', [FAMILY.daughter, FAMILY.son]],
  ]
}

function FamilyA() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <AMast />
      <div className="px-12 py-9">
        <div className="border-b border-warm-border pb-7">
          <p className="eyebrow">Family health directory</p>
          <h1 className="mt-3 font-serif text-5xl font-light tracking-[-0.03em]">One family. Separate histories.</h1>
        </div>
        <div className="grid grid-cols-3 gap-px bg-warm-border pt-px">
          {familyAColumns().map(([label, people]) => (
            <div key={label} className="bg-warm-charcoal px-6 pt-6">
              <div className="flex items-center gap-3 pb-4"><p className="eyebrow">{label}</p><span className="h-px flex-1 bg-warm-border" /></div>
              {people.map((p) => (
                <div key={p.name} className="border-t border-warm-border py-5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-warm-muted">{p.relation}</p>
                  <h3 className="mt-1 font-serif text-3xl leading-tight">{p.name}</h3>
                  <p className="mt-1 font-sans text-sm text-warm-muted">{p.age} years · {p.sex}</p>
                  <div className="mt-4 flex gap-6">
                    <span className="font-mono text-xs text-warm-muted">{p.docs} docs</span>
                    <span className="font-mono text-xs text-warm-muted">{p.briefs} briefs</span>
                    <span className="font-mono text-xs text-warm-muted">{p.chats} chats</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-accent"><span className="font-sans text-sm font-semibold">Open record</span><ArrowRight size={14} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FamilyAMobile() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <AMast small />
      <div className="px-5 py-6">
        <p className="eyebrow">Family directory</p>
        <h1 className="mt-2 font-serif text-3xl font-light leading-tight tracking-tight">One family. Separate histories.</h1>
        {familyAColumns().slice(0, 2).map(([label, people]) => (
          <div key={label} className="mt-6">
            <div className="flex items-center gap-3 pb-2"><p className="eyebrow">{label}</p><span className="h-px flex-1 bg-warm-border" /></div>
            {people.map((p) => (
              <div key={p.name} className="border-t border-warm-border py-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-warm-muted">{p.relation}</p>
                <h3 className="font-serif text-2xl">{p.name}</h3>
                <p className="font-sans text-xs text-warm-muted">{p.age} years · {p.sex}</p>
                <div className="mt-2 flex gap-4"><span className="font-mono text-[10px] text-warm-muted">{p.docs} docs</span><span className="font-mono text-[10px] text-warm-muted">{p.briefs} briefs</span></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileA() {
  const p = FAMILY.father
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <AMast />
      <div className="px-12 py-9">
        <div className="grid grid-cols-12 items-end gap-8 border-b border-warm-border pb-7">
          <div className="col-span-8">
            <p className="eyebrow">{p.relation}&apos;s health record</p>
            <h1 className="mt-2 font-serif text-7xl font-light tracking-[-0.04em]">{p.name}</h1>
            <p className="mt-2 font-sans text-base text-warm-muted">{p.age} years · {p.sex} · also recorded as “S. Rao”, “Suresh R.”</p>
          </div>
          <div className="col-span-4 flex flex-col gap-2">
            {[['Start investigation', 'accent'], ['Chat about Suresh', 'plum'], ['Upload a document', 'marigold']].map(([t, c]) => (
              <button key={t} className={`flex items-center justify-between border-l-2 ${BORDER_L[c]} bg-warm-surface px-4 py-3 text-sm`}>{t}<ArrowRight size={14} /></button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-10 pt-8">
          <div className="col-span-7 border-r border-warm-border pr-10">
            <p className="eyebrow mb-3">Longitudinal health memory</p>
            <p className="font-serif text-2xl leading-9 text-warm-off-white">Managing hypertension since 2019. Statin therapy started 2022. Family history of type-2 diabetes on the paternal line. Last review noted improving lipid control and stable kidney function.</p>
          </div>
          <div className="col-span-5">
            <div className="grid grid-cols-3 border-y border-warm-border">
              {[[p.docs, 'Documents'], [p.briefs, 'Briefs'], [p.chats, 'Chats']].map(([v, l]) => (
                <div key={l} className="border-r border-warm-border py-4 pl-1 last:border-0"><p className="font-mono text-3xl">{v}</p><p className="font-sans text-xs text-warm-muted">{l}</p></div>
              ))}
            </div>
            <p className="eyebrow mt-6 mb-2">Recent documents</p>
            {['Lipid panel — 14 Mar', 'Renal function — 02 Feb', 'ECG report — 18 Jan'].map((d) => (
              <div key={d} className="flex items-center gap-3 border-b border-warm-border py-3"><FileText size={15} className="text-warm-muted" /><span className="font-sans text-sm">{d}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileAMobile() {
  const p = FAMILY.father
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <AMast small />
      <div className="px-5 py-6">
        <p className="eyebrow">{p.relation}&apos;s record</p>
        <h1 className="mt-1 font-serif text-5xl font-light tracking-[-0.03em]">{p.name}</h1>
        <p className="mt-1 font-sans text-sm text-warm-muted">{p.age} years · {p.sex}</p>
        <div className="mt-4 flex flex-col gap-2">
          {[['Start investigation', 'accent'], ['Chat about Suresh', 'plum']].map(([t, c]) => (
            <button key={t} className={`flex items-center justify-between border-l-2 ${BORDER_L[c]} bg-warm-surface px-4 py-3 text-sm`}>{t}<ArrowRight size={14} /></button>
          ))}
        </div>
        <p className="eyebrow mt-6 mb-2">Health memory</p>
        <p className="font-serif text-xl leading-8">Managing hypertension since 2019. Statin therapy from 2022. Stable kidney function at last review.</p>
        <div className="mt-5 grid grid-cols-3 border-y border-warm-border">
          {[[p.docs, 'Docs'], [p.briefs, 'Briefs'], [p.chats, 'Chats']].map(([v, l]) => (<div key={l} className="border-r border-warm-border py-3 last:border-0"><p className="font-mono text-2xl">{v}</p><p className="font-sans text-[11px] text-warm-muted">{l}</p></div>))}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== *
 * DIRECTION B — THE CLINICAL DOSSIER / LEDGER
 * Archival record system. Persistent left index rail, tabular ledger
 * rows, file-tab navigation, monospace record IDs, label chips.
 * ================================================================== */

function BRail({ active }) {
  const items = ['Overview', 'Family Index', 'Documents', 'Briefs', 'Companion']
  return (
    <aside className="flex h-full w-60 flex-col border-r border-warm-border bg-warm-surface">
      <div className="border-b border-warm-border px-6 py-5">
        <p className="font-serif text-2xl tracking-tight text-warm-off-white">HealthNav</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-warm-muted">Record System</p>
      </div>
      <nav className="flex-1 py-4">
        {items.map((it) => (
          <div key={it} className={`flex items-center gap-3 px-6 py-3 font-sans text-sm ${it === active ? 'border-l-2 border-accent bg-warm-elevated text-warm-off-white' : 'border-l-2 border-transparent text-warm-muted'}`}>
            <span className="font-mono text-[10px] text-warm-border">·</span>{it}
          </div>
        ))}
      </nav>
      <div className="border-t border-warm-border px-6 py-4"><p className="font-mono text-[10px] text-warm-muted">SIGNED IN</p><p className="mt-1 font-sans text-sm text-warm-off-white">Aanya Rao</p></div>
    </aside>
  )
}

function Chip({ children, tone = 'accent' }) {
  return <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${CHIP[tone]}`}>{children}</span>
}

function DashB() {
  return (
    <div className="flex h-full bg-warm-charcoal font-sans text-warm-off-white">
      <BRail active="Overview" />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between border-b border-warm-border px-10 py-5">
          <div className="flex items-baseline gap-3"><h1 className="font-serif text-3xl font-light tracking-tight">Overview</h1><span className="font-mono text-xs text-warm-muted">— Aanya Rao</span></div>
          <button className="flex items-center gap-2 bg-warm-off-white px-5 py-2.5 font-sans text-sm font-semibold text-warm-surface">New investigation<ArrowRight size={15} /></button>
        </div>
        <div className="px-10 py-7">
          <div className="grid grid-cols-4 gap-px bg-warm-border">
            {[['38', 'Documents'], ['11', 'Doctor briefs'], ['6', 'Profiles'], ['21', 'Conversations']].map(([v, l]) => (
              <div key={l} className="bg-warm-surface px-5 py-5"><p className="font-mono text-4xl text-warm-off-white">{v}</p><p className="mt-1 font-sans text-xs text-warm-muted">{l}</p></div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3"><p className="eyebrow">Recent activity</p><span className="h-px flex-1 bg-warm-border" /></div>
          <table className="mt-3 w-full border-collapse">
            <tbody>
              {[
                ['REC-0142', 'Persistent evening headaches', 'Aanya', 'Brief ready', 'accent'],
                ['REC-0141', 'Lipid panel imported', 'Suresh', 'Document', 'marigold'],
                ['REC-0139', 'Thyroid follow-up questions', 'Lata', 'Companion', 'plum'],
                ['REC-0137', 'Annual review prep', 'Vikram', 'Brief ready', 'accent'],
              ].map(([id, t, who, st, c]) => (
                <tr key={id} className="border-b border-warm-border">
                  <td className="py-4 pr-4 font-mono text-xs text-warm-muted">{id}</td>
                  <td className="py-4 pr-4 font-serif text-lg">{t}</td>
                  <td className="py-4 pr-4 font-sans text-sm text-warm-muted">{who}</td>
                  <td className="py-4 pr-2"><Chip tone={c}>{st}</Chip></td>
                  <td className="py-4 text-right"><ArrowUpRight size={16} className="text-warm-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DashBMobile() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <div className="flex items-center justify-between border-b border-warm-border bg-warm-surface px-5 py-4"><p className="font-serif text-xl tracking-tight">HealthNav</p><span className="font-mono text-[10px] uppercase tracking-widest text-warm-muted">Overview</span></div>
      <div className="px-5 py-6">
        <div className="grid grid-cols-2 gap-px bg-warm-border">
          {[['38', 'Documents'], ['11', 'Briefs'], ['6', 'Profiles'], ['21', 'Chats']].map(([v, l]) => (<div key={l} className="bg-warm-surface px-4 py-4"><p className="font-mono text-3xl">{v}</p><p className="font-sans text-[11px] text-warm-muted">{l}</p></div>))}
        </div>
        <button className="mt-5 flex w-full items-center justify-between bg-warm-off-white px-5 py-3 text-sm font-semibold text-warm-surface">New investigation<ArrowRight size={15} /></button>
        <p className="eyebrow mt-6 mb-2">Recent activity</p>
        {[['REC-0142', 'Evening headaches', 'accent'], ['REC-0141', 'Lipid panel imported', 'marigold'], ['REC-0139', 'Thyroid follow-up', 'plum']].map(([id, t, c]) => (
          <div key={id} className="border-b border-warm-border py-3"><p className="font-mono text-[10px] text-warm-muted">{id}</p><p className="font-serif text-lg">{t}</p><div className="mt-1"><Chip tone={c}>Logged</Chip></div></div>
        ))}
      </div>
    </div>
  )
}

function FamilyB() {
  const rows = [
    ['IDX-01', FAMILY.self, 'You & partner'],
    ['IDX-02', FAMILY.partner, 'You & partner'],
    ['IDX-03', FAMILY.mother, 'Parents'],
    ['IDX-04', FAMILY.father, 'Parents'],
    ['IDX-05', FAMILY.daughter, 'Children'],
    ['IDX-06', FAMILY.son, 'Children'],
  ]
  return (
    <div className="flex h-full bg-warm-charcoal font-sans text-warm-off-white">
      <BRail active="Family Index" />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between border-b border-warm-border px-10 py-5">
          <h1 className="font-serif text-3xl font-light tracking-tight">Family Index</h1>
          <button className="flex items-center gap-2 border border-warm-off-white px-4 py-2 text-sm"><Plus size={14} />Add member</button>
        </div>
        <div className="px-10 py-6">
          <div className="grid grid-cols-[90px_1fr_120px_180px_90px] gap-4 border-b border-warm-off-white pb-2 font-mono text-[10px] uppercase tracking-widest text-warm-muted">
            <span>Record</span><span>Name</span><span>Age / Sex</span><span>Linked records</span><span>Group</span>
          </div>
          {rows.map(([id, p, group]) => (
            <div key={id} className="grid grid-cols-[90px_1fr_120px_180px_90px] items-center gap-4 border-b border-warm-border py-4">
              <span className="font-mono text-xs text-warm-muted">{id}</span>
              <div><p className="font-serif text-xl leading-tight">{p.name}</p><p className="font-sans text-xs text-warm-muted">{p.relation}</p></div>
              <span className="font-sans text-sm text-warm-muted">{p.age} · {p.sex[0]}</span>
              <span className="font-mono text-xs text-warm-muted">{p.docs} docs / {p.briefs} briefs / {p.chats} chats</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-warm-muted">{group}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FamilyBMobile() {
  const rows = [FAMILY.self, FAMILY.partner, FAMILY.mother, FAMILY.father]
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <div className="flex items-center justify-between border-b border-warm-border bg-warm-surface px-5 py-4"><p className="font-serif text-xl tracking-tight">Family Index</p><Plus size={16} /></div>
      <div className="px-5 py-4">
        {rows.map((p, i) => (
          <div key={p.name} className="grid grid-cols-[60px_1fr] items-center gap-3 border-b border-warm-border py-4">
            <span className="font-mono text-[10px] text-warm-muted">IDX-0{i + 1}</span>
            <div><p className="font-serif text-lg leading-tight">{p.name}</p><p className="font-mono text-[10px] text-warm-muted">{p.relation} · {p.age} · {p.docs} docs</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileB() {
  const p = FAMILY.father
  return (
    <div className="flex h-full bg-warm-charcoal font-sans text-warm-off-white">
      <BRail active="Family Index" />
      <div className="flex-1 overflow-hidden">
        <div className="border-b border-warm-border px-10 py-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-warm-muted">IDX-04 · {p.relation}</p>
          <div className="mt-1 flex items-end justify-between">
            <h1 className="font-serif text-4xl font-light tracking-tight">{p.name}</h1>
            <div className="flex gap-2">
              <Chip tone="accent">Investigate</Chip><Chip tone="plum">Chat</Chip><Chip tone="marigold">Upload</Chip>
            </div>
          </div>
          <p className="mt-1 font-sans text-sm text-warm-muted">{p.age} years · {p.sex} · alt. records: S. Rao, Suresh R.</p>
        </div>
        <div className="flex">
          <div className="flex-1 border-r border-warm-border px-10 py-7">
            <p className="eyebrow mb-3">Health memory ledger</p>
            <p className="font-serif text-xl leading-8">Hypertension since 2019 · Statin therapy 2022 · Paternal T2DM history · Lipid control improving · Renal function stable.</p>
            <p className="eyebrow mb-2 mt-7">Document log</p>
            <table className="w-full border-collapse">
              <tbody>
                {[['DOC-209', 'Lipid panel', '14 Mar', '41 values'], ['DOC-204', 'Renal function', '02 Feb', '12 values'], ['DOC-198', 'ECG report', '18 Jan', '6 findings']].map(([id, t, d, m]) => (
                  <tr key={id} className="border-b border-warm-border"><td className="py-3 pr-3 font-mono text-xs text-warm-muted">{id}</td><td className="py-3 pr-3 font-serif text-base">{t}</td><td className="py-3 pr-3 font-sans text-xs text-warm-muted">{d}</td><td className="py-3 font-mono text-xs text-warm-muted">{m}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="w-72 px-8 py-7">
            <p className="eyebrow mb-3">Counts</p>
            {[[p.docs, 'Documents'], [p.briefs, 'Briefs'], [p.chats, 'Conversations']].map(([v, l]) => (
              <div key={l} className="flex items-baseline justify-between border-b border-warm-border py-3"><span className="font-sans text-sm text-warm-muted">{l}</span><span className="font-mono text-2xl">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileBMobile() {
  const p = FAMILY.father
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <div className="border-b border-warm-border bg-warm-surface px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-warm-muted">IDX-04 · {p.relation}</p>
        <h1 className="font-serif text-3xl font-light tracking-tight">{p.name}</h1>
        <p className="font-sans text-xs text-warm-muted">{p.age} · {p.sex}</p>
        <div className="mt-2 flex gap-2"><Chip tone="accent">Investigate</Chip><Chip tone="plum">Chat</Chip></div>
      </div>
      <div className="px-5 py-5">
        <p className="eyebrow mb-2">Health memory ledger</p>
        <p className="font-serif text-lg leading-7">Hypertension since 2019 · Statin 2022 · Renal function stable.</p>
        <p className="eyebrow mb-2 mt-5">Document log</p>
        {[['DOC-209', 'Lipid panel · 14 Mar'], ['DOC-204', 'Renal function · 02 Feb']].map(([id, t]) => (
          <div key={id} className="flex justify-between border-b border-warm-border py-3"><span className="font-serif text-base">{t}</span><span className="font-mono text-[10px] text-warm-muted">{id}</span></div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== *
 * DIRECTION C — THE ATELIER / EDITORIAL MINIMAL
 * Generous whitespace, oversized serif display, very few elements,
 * asymmetric calm hero, restrained. Magazine / spa feel.
 * ================================================================== */

function CTop({ small }) {
  return (
    <div className={`flex items-center justify-between ${small ? 'px-6 py-4' : 'px-16 py-7'}`}>
      <span className={`font-serif tracking-tight text-warm-off-white ${small ? 'text-lg' : 'text-xl'}`}>HealthNav</span>
      <div className="flex items-center gap-7 font-sans text-sm text-warm-muted">
        {!small && <><span>Family</span><span>Documents</span><span>Companion</span></>}
        <span className="h-7 w-7 rounded-full bg-warm-elevated" />
      </div>
    </div>
  )
}

function DashC() {
  return (
    <div className="flex h-full flex-col bg-warm-charcoal font-sans text-warm-off-white">
      <CTop />
      <div className="flex flex-1 flex-col justify-center px-16">
        <p className="eyebrow">Tuesday · 14 March</p>
        <h1 className="mt-6 max-w-4xl font-serif text-[5.5rem] font-light leading-[0.95] tracking-[-0.04em]">A calm place for your family&apos;s health.</h1>
        <div className="mt-12 flex items-center gap-12">
          <button className="flex items-center gap-3 border-b-2 border-accent pb-2 font-serif text-2xl text-warm-off-white">Start an investigation<ArrowRight size={20} className="text-accent" /></button>
          <button className="flex items-center gap-3 pb-2 font-serif text-2xl text-warm-muted">Ask HealthNav</button>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-warm-border">
        {[['Latest brief', 'Persistent evening headaches'], ['Recent document', 'Lipid panel · 41 values'], ['Family', '6 profiles maintained']].map(([l, v]) => (
          <div key={l} className="border-r border-warm-border px-16 py-8 last:border-0"><p className="eyebrow">{l}</p><p className="mt-3 font-serif text-xl leading-tight">{v}</p></div>
        ))}
      </div>
    </div>
  )
}

function DashCMobile() {
  return (
    <div className="flex h-full flex-col bg-warm-charcoal font-sans text-warm-off-white">
      <CTop small />
      <div className="flex-1 px-6 pt-10">
        <p className="eyebrow">Tuesday · 14 March</p>
        <h1 className="mt-5 font-serif text-5xl font-light leading-[0.95] tracking-[-0.03em]">A calm place for your family&apos;s health.</h1>
        <button className="mt-9 flex items-center gap-3 border-b-2 border-accent pb-2 font-serif text-xl">Start an investigation<ArrowRight size={18} className="text-accent" /></button>
      </div>
      <div className="border-t border-warm-border px-6 py-6"><p className="eyebrow">Latest brief</p><p className="mt-2 font-serif text-lg">Persistent evening headaches</p></div>
    </div>
  )
}

function familyCGroups() {
  return [
    ['You & partner', [FAMILY.self, FAMILY.partner]],
    ['Parents', [FAMILY.mother, FAMILY.father]],
    ['Children', [FAMILY.daughter, FAMILY.son]],
  ]
}

function FamilyC() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <CTop />
      <div className="px-16 pt-10">
        <h1 className="max-w-2xl font-serif text-6xl font-light leading-[0.95] tracking-[-0.04em]">The family.</h1>
        <p className="mt-4 max-w-md font-sans text-base leading-7 text-warm-muted">Separate histories, gently connected. Each person keeps their own record.</p>
        <div className="mt-12 space-y-10">
          {familyCGroups().map(([label, people]) => (
            <div key={label} className="grid grid-cols-[200px_1fr] gap-8 border-t border-warm-border pt-6">
              <p className="eyebrow pt-2">{label}</p>
              <div className="flex gap-16">
                {people.map((p) => (
                  <div key={p.name}>
                    <h3 className="font-serif text-4xl font-light leading-tight tracking-tight">{p.name}</h3>
                    <p className="mt-2 font-sans text-sm text-warm-muted">{p.age} years · {p.sex} · {p.docs} documents</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FamilyCMobile() {
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <CTop small />
      <div className="px-6 pt-8">
        <h1 className="font-serif text-5xl font-light leading-[0.95] tracking-[-0.03em]">The family.</h1>
        {familyCGroups().slice(0, 2).map(([label, people]) => (
          <div key={label} className="mt-8 border-t border-warm-border pt-5">
            <p className="eyebrow">{label}</p>
            {people.map((p) => (<div key={p.name} className="mt-3"><h3 className="font-serif text-3xl font-light leading-tight">{p.name}</h3><p className="font-sans text-xs text-warm-muted">{p.age} years · {p.docs} docs</p></div>))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileC() {
  const p = FAMILY.father
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <CTop />
      <div className="px-16 pt-10">
        <p className="eyebrow">{p.relation}</p>
        <h1 className="mt-3 font-serif text-8xl font-light leading-[0.9] tracking-[-0.05em]">{p.name}</h1>
        <p className="mt-4 font-sans text-base text-warm-muted">{p.age} years · {p.sex} · also recorded as “S. Rao”</p>
        <div className="mt-12 grid grid-cols-[1.4fr_1fr] gap-16">
          <div>
            <p className="eyebrow">Health memory</p>
            <p className="mt-4 font-serif text-3xl font-light leading-[1.4] tracking-tight">Managing hypertension since 2019. Statin therapy from 2022. Lipid control improving, renal function stable.</p>
            <div className="mt-10 flex gap-10">
              {['Start investigation', 'Chat about Suresh', 'Upload'].map((t, i) => (
                <button key={t} className={`border-b pb-2 font-serif text-xl ${i === 0 ? 'border-accent text-warm-off-white' : 'border-warm-border text-warm-muted'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-end gap-8 border-b border-warm-border pb-5">
              {[[p.docs, 'Documents'], [p.briefs, 'Briefs'], [p.chats, 'Chats']].map(([v, l]) => (<div key={l}><p className="font-serif text-5xl font-light">{v}</p><p className="mt-1 font-sans text-xs text-warm-muted">{l}</p></div>))}
            </div>
            <p className="eyebrow mt-6 mb-2">Recent</p>
            {['Lipid panel — 14 Mar', 'Renal function — 02 Feb'].map((d) => (<p key={d} className="border-b border-warm-border py-3 font-serif text-lg">{d}</p>))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileCMobile() {
  const p = FAMILY.father
  return (
    <div className="h-full bg-warm-charcoal font-sans text-warm-off-white">
      <CTop small />
      <div className="px-6 pt-8">
        <p className="eyebrow">{p.relation}</p>
        <h1 className="mt-2 font-serif text-6xl font-light leading-[0.9] tracking-[-0.04em]">{p.name}</h1>
        <p className="mt-3 font-sans text-sm text-warm-muted">{p.age} years · {p.sex}</p>
        <p className="eyebrow mt-8">Health memory</p>
        <p className="mt-3 font-serif text-2xl font-light leading-[1.4]">Hypertension since 2019. Statin therapy from 2022. Renal function stable.</p>
        <div className="mt-8 flex gap-6 border-t border-warm-border pt-5">
          {[[p.docs, 'Docs'], [p.briefs, 'Briefs'], [p.chats, 'Chats']].map(([v, l]) => (<div key={l}><p className="font-serif text-4xl font-light">{v}</p><p className="font-sans text-[11px] text-warm-muted">{l}</p></div>))}
        </div>
      </div>
    </div>
  )
}

/* ============================ DIRECTIONS DATA ============================ */

const DIRECTIONS = [
  {
    key: 'A',
    name: 'The Broadsheet',
    tagline: 'Medical-journal editorial',
    body: 'A printed-record sensibility: a ruled masthead, serif headlines, multi-column reading grids and dateline metadata. Information reads like a considered front page rather than a dashboard.',
    accent: 'accent',
    screens: [
      { title: 'Signed-in dashboard', note: 'Masthead + asymmetric reading columns', d: <DashA />, m: <DashAMobile /> },
      { title: 'Family hierarchy', note: 'Three ruled columns, one per branch', d: <FamilyA />, m: <FamilyAMobile /> },
      { title: 'Individual profile viewer', note: 'Oversized name, longitudinal memory lede', d: <ProfileA />, m: <ProfileAMobile /> },
    ],
  },
  {
    key: 'B',
    name: 'The Clinical Dossier',
    tagline: 'Archival record system',
    body: 'A structured, professional record system: a persistent index rail, tabular ledger rows, monospace record IDs and quiet label chips. Feels clinically precise and built for repeat use.',
    accent: 'plum',
    screens: [
      { title: 'Signed-in dashboard', note: 'Index rail + activity ledger table', d: <DashB />, m: <DashBMobile /> },
      { title: 'Family hierarchy', note: 'Sortable family index with record IDs', d: <FamilyB />, m: <FamilyBMobile /> },
      { title: 'Individual profile viewer', note: 'Memory ledger + document log table', d: <ProfileB />, m: <ProfileBMobile /> },
    ],
  },
  {
    key: 'C',
    name: 'The Atelier',
    tagline: 'Editorial minimal',
    body: 'Maximum restraint and air: oversized serif display, very few elements per screen, and calm asymmetric composition. The product recedes so the person and their history come forward.',
    accent: 'marigold',
    screens: [
      { title: 'Signed-in dashboard', note: 'Single statement, quiet footer rail', d: <DashC />, m: <DashCMobile /> },
      { title: 'Family hierarchy', note: 'Label / names split, generous whitespace', d: <FamilyC />, m: <FamilyCMobile /> },
      { title: 'Individual profile viewer', note: 'Display-scale name, memory as the hero', d: <ProfileC />, m: <ProfileCMobile /> },
    ],
  },
]

/* ============================ PAGE ============================ */

export default function DesignDirections() {
  const [dScale, setDScale] = useState(0.42)
  const [active, setActive] = useState('A')
  const mScale = 0.6

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth
      if (w < 640) setDScale(Math.min(0.62, (w - 48) / 1440))
      else if (w < 1100) setDScale(0.36)
      else setDScale(0.42)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const current = DIRECTIONS.find((d) => d.key === active)

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal">
      <header className="border-b border-warm-border bg-warm-surface px-5 py-5 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">HealthNav · Frontend redesign</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-light tracking-[-0.03em] text-warm-off-white sm:text-5xl">Three visual directions</h1>
          <p className="mt-3 max-w-2xl font-sans text-base leading-7 text-warm-muted">
            Pick one direction for the dashboard, family hierarchy and individual profile viewer. Each is shown as a desktop frame at 1440px and a mobile frame at 390px. Nothing is implemented into the app yet.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-warm-border bg-warm-charcoal/90 px-5 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-3">
          {DIRECTIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => { setActive(d.key); const el = document.getElementById(`dir-${d.key}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={`flex items-center gap-3 border px-5 py-3 text-left transition-colors duration-300 ${active === d.key ? 'border-warm-off-white bg-warm-surface' : 'border-warm-border bg-transparent hover:border-warm-muted'}`}
            >
              <span className={`font-mono text-xs ${TEXT[d.accent]}`}>{d.key}</span>
              <span>
                <span className="block font-serif text-lg leading-tight text-warm-off-white">{d.name}</span>
                <span className="block font-sans text-xs text-warm-muted">{d.tagline}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-10">
        {DIRECTIONS.map((d) => (
          <section key={d.key} id={`dir-${d.key}`} className="mb-20 scroll-mt-28">
            <div className="mb-8 flex items-start gap-5 border-b border-warm-border pb-6">
              <span className={`font-serif text-5xl font-light ${TEXT[d.accent]}`}>{d.key}</span>
              <div>
                <h2 className="font-serif text-4xl font-light tracking-tight text-warm-off-white">{d.name}</h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-muted">{d.tagline}</p>
                <p className="mt-3 max-w-2xl font-sans text-base leading-7 text-warm-muted">{d.body}</p>
              </div>
            </div>
            {d.screens.map((s) => (
              <ScreenRow key={s.title} title={s.title} note={s.note} desktop={s.d} mobile={s.m} dScale={dScale} mScale={mScale} />
            ))}
          </section>
        ))}

        <div className="border-t border-warm-border pt-8">
          <p className="eyebrow">Next</p>
          <p className="mt-3 max-w-2xl font-serif text-2xl font-light leading-relaxed text-warm-off-white">
            Tell me which direction to use — {DIRECTIONS.map((d) => d.name).join(', ')} — and I&apos;ll implement it across all ten flows while preserving routes, Clerk auth, Zustand state and every API contract.
          </p>
        </div>
      </main>
    </div>
  )
}
