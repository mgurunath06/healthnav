import { useState } from 'react'
import {
  House,
  UsersThree,
  IdentificationCard,
  Stethoscope,
  UploadSimple,
  ChatCircleText,
  ClipboardText,
} from '@phosphor-icons/react'
import {
  DashboardPreview,
  FamilyDirectoryPreview,
  ProfileViewerPreview,
  InvestigationPreview,
  UploadPreview,
  CompanionPreview,
  DoctorBriefPreview,
} from './screens'

const SCREENS = [
  { key: 'dashboard',     label: 'Dashboard',         icon: House,               Component: DashboardPreview },
  { key: 'family',        label: 'Family directory',  icon: UsersThree,          Component: FamilyDirectoryPreview },
  { key: 'profile',       label: 'Profile viewer',    icon: IdentificationCard,  Component: ProfileViewerPreview },
  { key: 'investigation', label: 'Investigation',     icon: Stethoscope,         Component: InvestigationPreview },
  { key: 'upload',        label: 'Upload',            icon: UploadSimple,        Component: UploadPreview },
  { key: 'companion',     label: 'Companion',         icon: ChatCircleText,      Component: CompanionPreview },
  { key: 'brief',         label: 'Doctor brief',      icon: ClipboardText,       Component: DoctorBriefPreview },
]

export default function DesignPreview() {
  const [active, setActive] = useState('dashboard')
  const Current = SCREENS.find((s) => s.key === active)?.Component ?? DashboardPreview

  return (
    <div className="min-h-screen bg-warm-charcoal text-warm-off-white">
      <div className="sticky top-0 z-30 border-b border-warm-border bg-warm-surface/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3">
            <span className="mr-3 shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-warm-muted">
              Design preview
            </span>
            {SCREENS.map(({ key, label, icon: Icon }) => {
              const isActive = key === active
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-accent bg-accent text-warm-charcoal'
                      : 'border-warm-border bg-warm-surface text-warm-muted hover:border-accent/50 hover:text-warm-off-white'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon size={15} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <main>
        <Current />
      </main>
    </div>
  )
}
