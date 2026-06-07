import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AUTH_KEY = 'healthnav:test-authenticated'
const AUTH_EVENT = 'healthnav:test-auth-change'
const ACTIVE_BROWSER_SESSION_KEY = 'healthnav:active_browser_session'

const defaultUser = {
  id: 'user_test_healthnav',
  firstName: 'Test',
  fullName: 'Test User',
}

const ClerkContext = createContext(null)

function readSignedIn() {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function ClerkProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(readSignedIn)

  useEffect(() => {
    function sync() {
      setIsSignedIn(readSignedIn())
    }
    window.addEventListener(AUTH_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  async function signOut({ redirectUrl } = {}) {
    localStorage.removeItem(AUTH_KEY)
    setIsSignedIn(false)
    window.dispatchEvent(new Event(AUTH_EVENT))
    if (redirectUrl) {
      window.history.replaceState({}, '', redirectUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const value = {
    isLoaded: true,
    isSignedIn,
    user: isSignedIn ? defaultUser : null,
    getToken: async () => isSignedIn ? 'test-token' : null,
    signOut,
    signIn: () => {
      localStorage.setItem(AUTH_KEY, 'true')
      window.dispatchEvent(new Event(AUTH_EVENT))
    },
  }

  return <ClerkContext.Provider value={value}>{children}</ClerkContext.Provider>
}

function useMockClerk() {
  const context = useContext(ClerkContext)
  if (!context) throw new Error('ClerkProvider is required')
  return context
}

export function useAuth() {
  const { isLoaded, isSignedIn, getToken } = useMockClerk()
  return { isLoaded, isSignedIn, getToken }
}

export function useUser() {
  const { isLoaded, isSignedIn, user } = useMockClerk()
  return { isLoaded, isSignedIn, user }
}

export function useClerk() {
  const { signOut } = useMockClerk()
  return { signOut }
}

export function SignedIn({ children }) {
  return useMockClerk().isSignedIn ? children : null
}

export function SignedOut({ children }) {
  return useMockClerk().isSignedIn ? null : children
}

export function UserButton({ afterSignOutUrl = '/' }) {
  const { signOut } = useMockClerk()
  return (
    <button type="button" aria-label="Sign out" onClick={() => signOut({ redirectUrl: afterSignOutUrl })}>
      Sign out
    </button>
  )
}

export function SignIn({ fallbackRedirectUrl = '/dashboard' }) {
  const { signIn, isSignedIn } = useMockClerk()
  const navigate = useNavigate()

  useEffect(() => {
    if (isSignedIn) navigate(fallbackRedirectUrl, { replace: true })
  }, [fallbackRedirectUrl, isSignedIn, navigate])

  function handleSignIn() {
    sessionStorage.setItem(ACTIVE_BROWSER_SESSION_KEY, 'true')
    signIn()
  }

  return (
    <div data-clerk-component="SignIn">
      <button type="button" onClick={handleSignIn}>
        Continue with test account
      </button>
    </div>
  )
}
