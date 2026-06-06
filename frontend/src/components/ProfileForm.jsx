import { useState } from 'react'

const RELATIONS = [
  ['mother', 'Mother'], ['father', 'Father'], ['parent', 'Parent'], ['wife', 'Wife'],
  ['husband', 'Husband'], ['spouse', 'Spouse / partner'], ['son', 'Son'],
  ['daughter', 'Daughter'], ['child', 'Child'], ['brother', 'Brother'],
  ['sister', 'Sister'], ['sibling', 'Sibling'], ['grandmother', 'Grandmother'],
  ['grandfather', 'Grandfather'], ['grandchild', 'Grandchild'], ['aunt', 'Aunt'],
  ['uncle', 'Uncle'], ['cousin', 'Cousin'], ['other', 'Other'],
]

export default function ProfileForm({
  profile,
  selfProfile = false,
  requireCoreDetails = false,
  submitLabel = 'Save profile',
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    display_name: profile?.display_name === 'Me' ? '' : profile?.display_name ?? '',
    relation: selfProfile ? 'self' : profile?.relation ?? 'other',
    date_of_birth: profile?.date_of_birth ?? '',
    sex: profile?.sex ?? '',
    aliases: (profile?.aliases ?? []).join(', '),
    notes: profile?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const valid = form.display_name.trim()
    && (!requireCoreDetails || (form.date_of_birth && form.sex))

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        display_name: form.display_name.trim(),
        relation: selfProfile ? 'self' : form.relation,
        date_of_birth: form.date_of_birth || null,
        sex: form.sex || null,
        aliases: form.aliases.split(',').map((value) => value.trim()).filter(Boolean),
        notes: form.notes.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Could not save this profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label={selfProfile ? 'Your name' : 'Name'}>
        <input
          value={form.display_name}
          onChange={(event) => update('display_name', event.target.value)}
          placeholder={selfProfile ? 'Your full name' : 'Name used in records'}
          className="profile-input"
          autoFocus
          required
        />
      </Field>
      {!selfProfile && (
        <Field label="Relationship to you">
          <select value={form.relation} onChange={(event) => update('relation', event.target.value)} className="profile-input">
            {RELATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth">
          <input type="date" value={form.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} className="profile-input" required={requireCoreDetails} />
        </Field>
        <Field label="Sex recorded at birth">
          <select value={form.sex} onChange={(event) => update('sex', event.target.value)} className="profile-input" required={requireCoreDetails}>
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
            <option value="unknown">Prefer not to specify</option>
          </select>
        </Field>
      </div>
      <Field label="Other names on medical records" hint="Comma-separated. Helps route reports automatically.">
        <input value={form.aliases} onChange={(event) => update('aliases', event.target.value)} placeholder="Initials, maiden name, alternate spelling" className="profile-input" />
      </Field>
      <Field label="Health context" hint="Optional stable context such as allergies or long-term conditions.">
        <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} rows={3} className="profile-input resize-none" />
      </Field>
      {error && <p className="font-sans text-sm text-quadrant-q1">{error}</p>}
      <div className="flex items-center justify-end gap-4 pt-2">
        {onCancel && <button type="button" onClick={onCancel} className="editorial-link text-sm text-warm-muted">Cancel</button>}
        <button disabled={!valid || saving} className="rounded-full bg-warm-off-white px-6 py-3 font-sans text-sm font-semibold text-warm-surface transition-colors hover:bg-accent disabled:opacity-40">
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-warm-muted">{label}</span>
      {children}
      {hint && <span className="mt-2 block font-sans text-xs leading-5 text-warm-muted">{hint}</span>}
    </label>
  )
}
