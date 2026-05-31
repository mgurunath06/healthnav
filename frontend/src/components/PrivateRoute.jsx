import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

export default function PrivateRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) return <Navigate to="/login" replace />

  return children
}
