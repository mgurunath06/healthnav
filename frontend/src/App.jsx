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
import './App.css'

function InvestigationFlow() {
  const screen          = useInvestigationStore((s) => s.screen)
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)
  const isWizardLoading = screen === 'loading' && followUpHistory.length > 0

  if (screen === 'input')                       return <SymptomInput />
  if (screen === 'loading' && !isWizardLoading) return <LoadingScreen />
  if (screen === 'wizard' || isWizardLoading)   return <QuestionWizard />
  if (screen === 'prep_card')                   return <PrepCard />
  if (screen === 'emergency')                   return <EmergencyScreen />
  if (screen === 'redirect')                    return <RedirectScreen />
  if (screen === 'error')                       return <ErrorScreen />
  return <SymptomInput />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"                  element={<InvestigationFlow />} />
      <Route path="/login"             element={<LoginScreen />} />
      <Route path="/dashboard"         element={<PrivateRoute><PremiumDashboard /></PrivateRoute>} />
      <Route path="/dashboard/upload"  element={<PrivateRoute><DocumentUploadScreen /></PrivateRoute>} />
    </Routes>
  )
}
