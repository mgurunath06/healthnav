import { Link } from 'react-router-dom'
import { Key, ArrowRight } from '@phosphor-icons/react'
import BrandMark from '../components/BrandMark'

// Shown when VITE_CLERK_PUBLISHABLE_KEY is not configured. Without a key,
// ClerkProvider throws and blanks the whole app, so we render this instead and
// keep the Clerk-free /design-preview route available.
export default function ClerkConfigNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-warm-charcoal px-6 text-warm-off-white">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <BrandMark />
        </div>

        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-warm-muted">
          Configuration required
        </span>
        <h1 className="mt-3 text-balance font-serif text-3xl font-light leading-tight">
          Authentication is not configured yet
        </h1>
        <p className="mt-4 leading-relaxed text-warm-muted">
          The app needs a Clerk publishable key to sign people in. Add an
          environment variable named{' '}
          <code className="rounded bg-warm-surface px-1.5 py-0.5 font-mono text-[13px] text-warm-off-white">
            VITE_CLERK_PUBLISHABLE_KEY
          </code>{' '}
          to your project, then reload. In preview environments use a Clerk{' '}
          <strong className="font-medium text-warm-off-white">test</strong>{' '}
          publishable key (it starts with{' '}
          <code className="rounded bg-warm-surface px-1.5 py-0.5 font-mono text-[13px] text-warm-off-white">
            pk_test_
          </code>
          ).
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-warm-border bg-warm-surface/70 p-4">
          <Key size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-warm-muted">
            Never expose a secret key in the frontend. Only the publishable key
            belongs here — the secret key stays on your backend.
          </p>
        </div>

        <Link
          to="/design-preview"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-warm-charcoal transition-colors hover:bg-accent-hover"
        >
          View the design preview
          <ArrowRight size={16} />
        </Link>
        <p className="mt-3 text-xs text-warm-muted">
          The design preview runs on static sample data and needs no sign-in.
        </p>
      </div>
    </div>
  )
}
