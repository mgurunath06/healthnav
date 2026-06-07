import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useSelfProfile() {
  const { getToken, isSignedIn } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(isSignedIn))

  useEffect(() => {
    let active = true

    async function load() {
      if (!isSignedIn) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const token = await getToken()
        const profiles = await apiFetch('/profiles', { token })
        if (active) {
          setProfile(profiles.find((item) => item.relation === 'self') ?? null)
        }
      } catch {
        if (active) setProfile(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [getToken, isSignedIn])

  const saveProfile = useCallback(async (values) => {
    if (!profile) throw new Error('Your main profile is not available yet.')
    const token = await getToken()
    const updated = await apiFetch(`/profiles/${profile.id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(values),
    })
    setProfile(updated)
    return updated
  }, [getToken, profile])

  return { profile, loading, saveProfile }
}
