import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import ProfileOnboardingGate from './ProfileOnboardingGate'

export default function PrivateRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-px w-28 bg-accent animate-agent-trace-pulse" />
      </div>
    )
  }

  if (!isSignedIn) return <Navigate to="/login" replace />

  return <ProfileOnboardingGate>{children}</ProfileOnboardingGate>
}
