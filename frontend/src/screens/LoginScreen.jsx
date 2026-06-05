import { useAuth, SignIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import Header from '../components/Header'

const clerkAppearance = {
  variables: {
    colorPrimary:                 '#EE704B',
    colorPrimaryHover:            '#E7AE49',
    colorBackground:              '#211B16',
    colorInputBackground:         '#2B231C',
    colorInputText:               '#F7F0E5',
    colorText:                    '#F7F0E5',
    colorTextSecondary:           '#AD9F90',
    colorTextOnPrimaryBackground: '#17130F',
    colorNeutral:                 '#45392E',
    borderRadius:                 '1rem',
    fontFamily:                   "'Inter', 'DM Sans', system-ui, sans-serif",
    fontSize:                     '15px',
  },
  elements: {
    card: {
      background:   '#211B16',
      border:       '1px solid #45392E',
      boxShadow:    '0 4px 20px -2px rgba(26, 24, 20, 0.4)',
    },
    headerTitle: {
      fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontWeight: '300',
      color:      '#F7F0E5',
    },
    headerSubtitle: {
      color: '#AD9F90',
    },
    dividerLine: {
      background: '#45392E',
    },
    dividerText: {
      color: '#AD9F90',
    },
    socialButtonsBlockButton: {
      background:  '#2B231C',
      border:      '1px solid #45392E',
      color:       '#F7F0E5',
    },
    socialButtonsBlockButtonText: {
      color: '#F7F0E5',
    },
    formFieldLabel: {
      color: '#AD9F90',
    },
    formFieldInput: {
      background:  '#2B231C',
      border:      '1px solid #45392E',
      color:       '#F7F0E5',
    },
    formButtonPrimary: {
      background:    '#EE704B',
      color:         '#17130F',
      fontFamily:    "'Inter', 'DM Sans', system-ui, sans-serif",
      letterSpacing: '0',
    },
    footerActionLink: {
      color: '#EE704B',
    },
    identityPreviewText: {
      color: '#F7F0E5',
    },
    identityPreviewEditButton: {
      color: '#AD9F90',
    },
  },
}

export default function LoginScreen() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <div className="app-canvas min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">

          <div className="text-center mb-8">
            <p className="eyebrow mb-3">
              Your health desk
            </p>
            <h1 className="font-serif text-4xl font-light tracking-[-0.04em] text-warm-off-white">
              Pick up where you left off.
            </h1>
          </div>

          <SignIn
            fallbackRedirectUrl="/dashboard"
            appearance={clerkAppearance}
          />

        </div>
      </main>

      <footer className="px-4 py-5 border-t border-warm-border text-center">
        <p className="font-sans text-xs text-warm-muted">
          Your data stays private.&nbsp;&nbsp;·&nbsp;&nbsp;Not a diagnosis tool. Always consult a licensed medical professional.
        </p>
      </footer>
    </div>
  )
}
