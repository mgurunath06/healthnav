import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import { useTimer } from '../hooks/useTimer'

export default function Header({ showReset = false }) {
  const reset = useInvestigationStore((s) => s.reset)
  const screen = useInvestigationStore((s) => s.screen)
  const { clock, cycle, active } = useTimer()
  const { user, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [logoError, setLogoError] = useState(false)

  const canReset = screen !== 'input'
  const showTimer = active && screen !== 'input'

  return (
    <header className="w-full border-b border-warm-border bg-warm-charcoal px-6 py-4 flex items-center justify-between shrink-0">

      {/* Logo */}
      <button
        onClick={() => navigate(isSignedIn ? '/dashboard' : '/')}
        className="cursor-pointer flex items-center shrink-0"
        aria-label="HealthNav home"
      >
        {!logoError ? (
          <span className="inline-flex items-center justify-center bg-[#F0EBE3] rounded-lg p-1">
            <img
              src="/logo.jpg"
              alt="HealthNav"
              className="h-8 w-auto object-contain"
              onError={() => setLogoError(true)}
            />
          </span>
        ) : (
          <span className="font-serif text-xl font-light text-accent select-none">
            HealthNav
          </span>
        )}
      </button>

      {/* Centre — dual timers */}
      {showTimer && (
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <DigitPair value={clock.hh} />
              <span className="font-mono text-warm-muted text-base leading-none select-none">:</span>
              <DigitPair value={clock.mm} />
            </div>
            <span className="font-mono text-[10px] text-warm-muted tracking-widest uppercase">Now</span>
          </div>

          <span className="text-warm-border select-none">|</span>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <DigitPair value={cycle.mm} />
              <span className="font-mono text-warm-muted text-base leading-none select-none">:</span>
              <DigitPair value={cycle.ss} />
            </div>
            <span className="font-mono text-[10px] text-warm-muted tracking-widest uppercase">Session</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center gap-3">
        {(canReset || showReset) && (
          <button
            onClick={reset}
            className="font-sans text-sm text-warm-muted hover:text-warm-off-white transition-colors duration-250 border border-warm-border rounded-md px-3 py-1.5"
          >
            New Investigation
          </button>
        )}
        <SignedOut>
          <Link
            to="/login"
            className="font-sans text-sm text-warm-muted hover:text-warm-off-white transition-colors duration-250 border border-warm-border rounded-md px-3 py-1.5"
          >
            Sign in
          </Link>
        </SignedOut>
        <SignedIn>
          {user?.firstName && (
            <span className="font-sans text-sm text-warm-muted hidden sm:block">
              {user.firstName}
            </span>
          )}
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>

    </header>
  )
}

function DigitPair({ value }) {
  return (
    <div className="flex gap-1">
      <DigitCard digit={value[0]} />
      <DigitCard digit={value[1]} />
    </div>
  )
}

function DigitCard({ digit }) {
  return (
    <span
      key={digit}
      className="animate-digit inline-flex items-center justify-center w-7 h-9 bg-warm-elevated border border-warm-border rounded-md font-mono text-base font-semibold text-warm-off-white tabular-nums leading-none select-none"
    >
      {digit}
    </span>
  )
}
