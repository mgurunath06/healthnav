import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export default function ProfileSelector({ value, onChange, includeAll = false }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const token = await getToken()
        const rows = await apiFetch('/profiles', { token })
        if (!active) return
        setProfiles(rows)
        const storageKey = user?.id ? `healthnav:selected_profile:${user.id}` : null
        const saved = storageKey ? localStorage.getItem(storageKey) : null
        const next = value ?? saved ?? (includeAll ? '' : rows[0]?.id ?? '')
        if (next !== value) onChange?.(next)
      } catch {
        if (active) setProfiles([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [getToken, includeAll, onChange, user?.id, value])

  function handleChange(e) {
    const next = e.target.value
    if (user?.id) localStorage.setItem(`healthnav:selected_profile:${user.id}`, next)
    onChange?.(next)
  }

  return (
    <label className="block">
      <span className="font-mono text-xs text-warm-muted tracking-widest uppercase block mb-2">
        {includeAll ? 'Profile' : 'Chatting about'}
      </span>
      <select
        value={value ?? ''}
        onChange={handleChange}
        disabled={loading}
        className="w-full bg-warm-surface border border-warm-border rounded-lg px-4 py-2.5
                   font-sans text-sm text-warm-off-white focus:outline-none focus:border-accent
                   transition-colors duration-250 disabled:opacity-50"
      >
        {includeAll && <option value="">All profiles</option>}
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.display_name}
          </option>
        ))}
      </select>
    </label>
  )
}
