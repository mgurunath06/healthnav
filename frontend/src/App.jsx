import { Routes, Route } from 'react-router-dom'
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
import './App.css'

function InvestigationFlow() {
  const screen          = useInvestigationStore((s) => s.screen)
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const isWizardLoading = screen === 'loading' && followUpHistory.length > 0

  let content = <SymptomInput />
  if (screen === 'loading' && !isWizardLoading) content = <LoadingScreen />
  if (screen === 'wizard' || isWizardLoading) content = <QuestionWizard />
  if (screen === 'prep_card') content = <PrepCard />
  if (screen === 'emergency') content = <EmergencyScreen />
  if (screen === 'redirect') content = <RedirectScreen />
  if (screen === 'error') content = <ErrorScreen />
  return <div key={screen} className="route-reveal">{content}</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/"                  element={<InvestigationFlow />} />
      <Route path="/login"             element={<LoginScreen />} />
      <Route path="/dashboard"         element={<PrivateRoute><PremiumDashboard /></PrivateRoute>} />
      <Route path="/dashboard/upload"  element={<PrivateRoute><DocumentUploadScreen /></PrivateRoute>} />
      <Route path="/profile"           element={<PrivateRoute><ProfileScreen /></PrivateRoute>} />
      <Route path="/chat"              element={<PrivateRoute><ChatScreen /></PrivateRoute>} />
    </Routes>
  )
}
