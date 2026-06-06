import { previewProfiles } from './fixtures'

// Static, controlled profile selector for the preview. No backend fetch.
export default function PreviewProfileSelector({ value, onChange }) {
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-widest text-warm-muted">For whom?</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 w-full cursor-pointer rounded-lg border border-warm-border bg-warm-elevated px-4 py-2.5 font-sans text-sm text-warm-off-white outline-none transition-colors focus:border-accent"
      >
        <option value="">Myself</option>
        {previewProfiles
          .filter((p) => p.relation !== 'self')
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
      </select>
    </div>
  )
}
