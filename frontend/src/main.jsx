import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'
import DesignPreview from './preview/DesignPreview.jsx'
import ClerkConfigNotice from './preview/ClerkConfigNotice.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// When the Clerk publishable key is missing, ClerkProvider throws and blanks the
// entire app. Instead, mount a Clerk-free router so the static /design-preview
// route still works and every other route shows a clear configuration screen.
function FallbackApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/design-preview" element={<DesignPreview />} />
        <Route path="*" element={<ClerkConfigNotice />} />
      </Routes>
    </BrowserRouter>
  )
}

function ClerkApp() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{PUBLISHABLE_KEY ? <ClerkApp /> : <FallbackApp />}</StrictMode>,
)
