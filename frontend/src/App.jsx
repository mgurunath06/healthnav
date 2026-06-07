import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useInvestigationStore } from './store/useInvestigationStore'
import SymptomInput from './components/SymptomInput'
import LoadingScreen from './components/LoadingScreen'
import QuestionWizard from './components/QuestionWizard'
import PrepCard from './components/PrepCard'
import EmergencyScreen from './components/EmergencyScreen'
import RedirectScreen from './components/RedirectScreen'
import ErrorScreen from './components/ErrorScreen'
import LoginScreen from './screens/LoginScreen'
import PremiumDashboard from './components/PremiumDashboard'
import DocumentUploadScreen from './screens/DocumentUploadScreen'
import PrivateRoute from './components/PrivateRoute'
import ProfileScreen from './components/ProfileScreen'
import ChatScreen from './components/ChatScreen'
import ProfileDetailScreen from './components/ProfileDetailScreen'
import './App.css'

function InvestigationFlow({ memberMode = false }) {
  const { isLoaded } = useAuth()
  const screen          = useInvestigationStore((s) => s.screen)
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const isWizardLoading = screen === 'loading' && followUpHistory.length > 0

  if (!isLoaded) {
    return (
      <div className="app-canvas flex min-h-dvh items-center justify-center bg-warm-charcoal">
        <div className="w-full max-w-xs px-6 text-center">
          <div className="mx-auto h-px w-24 overflow-hidden bg-warm-border">
            <div className="trace-runner" />
          </div>
          <p className="eyebrow mt-5 text-warm-muted">Opening your health desk</p>
        </div>
      </div>
    )
  }

  let content = <SymptomInput memberMode={memberMode} />
  if (screen === 'loading' && !isWizardLoading) content = <LoadingScreen />
  if (screen === 'wizard' || isWizardLoading) content = <QuestionWizard />
  if (screen === 'prep_card') content = <PrepCard />
  if (screen === 'emergency') content = <EmergencyScreen />
  if (screen === 'redirect') content = <RedirectScreen />
  if (screen === 'error') content = <ErrorScreen />
  return <div key={screen} className="route-reveal">{content}</div>
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth()
  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />
  return <InvestigationFlow />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"                  element={<HomeRoute />} />
      <Route path="/investigate"       element={<PrivateRoute><InvestigationFlow memberMode /></PrivateRoute>} />
      <Route path="/login"             element={<LoginScreen />} />
      <Route path="/dashboard"         element={<PrivateRoute><PremiumDashboard /></PrivateRoute>} />
      <Route path="/dashboard/upload"  element={<PrivateRoute><DocumentUploadScreen /></PrivateRoute>} />
      <Route path="/profile"           element={<PrivateRoute><ProfileScreen /></PrivateRoute>} />
      <Route path="/profile/:profileId" element={<PrivateRoute><ProfileDetailScreen /></PrivateRoute>} />
      <Route path="/chat"              element={<PrivateRoute><ChatScreen /></PrivateRoute>} />
    </Routes>
  )
}
