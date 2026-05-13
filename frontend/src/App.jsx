import { useInvestigationStore } from './store/useInvestigationStore'
import SymptomInput from './components/SymptomInput'
import LoadingScreen from './components/LoadingScreen'
import QuestionWizard from './components/QuestionWizard'
import PrepCard from './components/PrepCard'
import EmergencyScreen from './components/EmergencyScreen'
import RedirectScreen from './components/RedirectScreen'
import ErrorScreen from './components/ErrorScreen'
import './App.css'

export default function App() {
  const screen          = useInvestigationStore((s) => s.screen)
  const followUpHistory = useInvestigationStore((s) => s.followUpHistory)

  // While loading between wizard rounds, keep the wizard layout visible
  // (left panel history + right panel context stay on screen)
  const isWizardLoading = screen === 'loading' && followUpHistory.length > 0

  if (screen === 'input')     return <SymptomInput />
  if (screen === 'loading' && !isWizardLoading) return <LoadingScreen />
  if (screen === 'wizard' || isWizardLoading)   return <QuestionWizard />
  if (screen === 'prep_card') return <PrepCard />
  if (screen === 'emergency') return <EmergencyScreen />
  if (screen === 'redirect')  return <RedirectScreen />
  if (screen === 'error')     return <ErrorScreen />
  return <SymptomInput />
}
