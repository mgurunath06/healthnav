import { Link, useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import { useTimer } from '../hooks/useTimer'
import BrandMark from './BrandMark'

export default function Header({ showReset = false }) {
  const reset = useInvestigationStore((s) => s.reset)
  const screen = useInvestigationStore((s) => s.screen)
  const { cycle, active } = useTimer()
  const { user, isSignedIn } = useUser()
  const navigate = useNavigate()

  const canReset = screen !== 'input'
  const showTimer = active && screen !== 'input'

  return (
    <header className="relative z-20 w-full shrink-0 border-b border-warm-border/70 bg-warm-charcoal/90 px-4 py-4 sm:px-7">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
        <button
          onClick={() => navigate(isSignedIn ? '/dashboard' : '/')}
          className="cursor-pointer"
          aria-label="HealthNav home"
        >
          <BrandMark />
        </button>

        {showTimer && (
          <div className="hidden items-center gap-3 sm:flex">
            <span className="eyebrow text-warm-muted">Session</span>
            <span className="font-mono text-sm tabular-nums text-warm-off-white">
              {cycle.mm}:{cycle.ss}
            </span>
            <span className="h-px w-8 bg-accent" />
          </div>
        )}

        <nav className="flex items-center gap-4">
          {(canReset || showReset) && (
            <button
              onClick={reset}
              className="editorial-link hidden font-sans text-sm text-warm-muted transition-colors hover:text-warm-off-white sm:block"
            >
              New investigation
            </button>
          )}
          <SignedOut>
            <Link
              to="/login"
              className="rounded-full border border-warm-border px-4 py-2 font-sans text-sm text-warm-off-white transition-colors hover:border-accent hover:text-accent"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            {user?.firstName && (
              <span className="hidden font-sans text-sm text-warm-muted md:block">
                {user.firstName}
              </span>
            )}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  )
}
