import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import BrandMark from './BrandMark'
import ProfileForm from './ProfileForm'

export default function ProfileOnboardingGate({ children }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const token = await getToken()
        const profiles = await apiFetch('/profiles', { token })
        if (active) setProfile(profiles.find((item) => item.relation === 'self'))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [getToken])

  if (loading) {
    return <div className="min-h-dvh bg-warm-charcoal grid place-items-center"><div className="h-px w-28 bg-accent animate-agent-trace-pulse" /></div>
  }

  const complete = profile && profile.display_name !== 'Me' && profile.date_of_birth && profile.sex
  if (complete) return children

  async function save(values) {
    const token = await getToken()
    const updated = await apiFetch(`/profiles/${profile.id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({
        ...values,
        display_name: values.display_name || user?.fullName || user?.firstName || 'Me',
      }),
    })
    setProfile(updated)
  }

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <BrandMark />
        <div className="mt-12 border-t border-warm-border pt-10">
          <p className="eyebrow">Build your main health profile</p>
          <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-warm-off-white sm:text-5xl">
            First, help HealthNav know who you are.
          </h1>
          <p className="mt-4 max-w-xl font-sans text-base leading-7 text-warm-muted">
            These details keep your records separate from family profiles and make age, sex, and family-history guidance relevant.
          </p>
          <div className="mt-9 rounded-[1.75rem] border border-warm-border bg-warm-surface p-6 sm:p-8">
            <ProfileForm
              profile={{ ...profile, display_name: profile?.display_name === 'Me' ? user?.fullName ?? '' : profile?.display_name }}
              selfProfile
              requireCoreDetails
              submitLabel="Create my health profile"
              onSubmit={save}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
