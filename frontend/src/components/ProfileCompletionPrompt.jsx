import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, X } from '@phosphor-icons/react'
import ProfileForm from './ProfileForm'
import { isProfileComplete } from '../lib/profileCompletion'

export default function ProfileCompletionPrompt({
  profile,
  user,
  expanded = false,
  onSave,
  onSkip,
}) {
  const [opened, setOpened] = useState(false)
  const editing = expanded || opened

  if (!profile || isProfileComplete(profile)) return null

  if (!editing) {
    return (
      <div className="mb-7 flex flex-col gap-4 border-l-2 border-marigold bg-warm-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-sm font-medium text-warm-off-white">
            Complete your health profile for more relevant questions.
          </p>
          <p className="mt-1 text-xs leading-5 text-warm-muted">
            Missing details never block an investigation and can be added anytime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="editorial-link inline-flex items-center gap-2 text-sm text-warm-off-white hover:text-accent"
          >
            Add details <ArrowRight size={15} />
          </button>
          {onSkip && (
            <button type="button" onClick={onSkip} aria-label="Dismiss profile reminder" className="text-warm-muted hover:text-warm-off-white">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="mb-8 rounded-[1.75rem] border border-warm-border bg-warm-surface p-6 sm:p-8">
      <p className="eyebrow">Optional profile details</p>
      <h2 className="mt-3 font-serif text-3xl font-light text-warm-off-white">
        Help HealthNav ask more relevant questions.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-warm-muted">
        Add what you know now, or continue without it. Direct demographic answers
        during an investigation can fill missing details later.
      </p>
      <div className="mt-6">
        <ProfileForm
          profile={{
            ...profile,
            display_name: profile.display_name === 'Me'
              ? user?.fullName ?? user?.firstName ?? ''
              : profile.display_name,
          }}
          selfProfile
          submitLabel="Save and continue"
          onSubmit={onSave}
          onCancel={onSkip ? () => {
            setOpened(false)
            onSkip()
          } : () => setOpened(false)}
        />
      </div>
      <p className="mt-5 text-xs text-warm-muted">
        You can also manage these details from <Link to="/profile" className="underline decoration-accent">Family profiles</Link>.
      </p>
    </section>
  )
}
