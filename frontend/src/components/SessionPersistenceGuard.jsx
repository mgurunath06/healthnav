import { useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-react'
import {
  ACTIVE_BROWSER_SESSION_KEY,
  shouldRemainLoggedIn,
} from '../lib/sessionPreference'

export default function SessionPersistenceGuard({ children }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const shouldEndSession = Boolean(
    isLoaded
    && isSignedIn
    && !shouldRemainLoggedIn()
    && sessionStorage.getItem(ACTIVE_BROWSER_SESSION_KEY) !== 'true'
  )

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      sessionStorage.removeItem(ACTIVE_BROWSER_SESSION_KEY)
      return
    }

    if (!shouldEndSession) {
      sessionStorage.setItem(ACTIVE_BROWSER_SESSION_KEY, 'true')
      return
    }

    signOut({ redirectUrl: '/' })
  }, [isLoaded, isSignedIn, shouldEndSession, signOut])

  if (!isLoaded || shouldEndSession) {
    return (
      <div className="app-canvas grid min-h-dvh place-items-center bg-warm-charcoal">
        <div className="h-px w-28 bg-accent animate-agent-trace-pulse" />
      </div>
    )
  }

  return children
}
