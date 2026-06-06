import { useAuth, SignIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import Header from '../components/Header'

const clerkAppearance = {
  variables: {
    colorPrimary:                 '#B95538',
    colorPrimaryHover:            '#98442D',
    colorBackground:              '#FFFAF2',
    colorInputBackground:         '#F2EDE4',
    colorInputText:               '#29241F',
    colorText:                    '#29241F',
    colorTextSecondary:           '#756D64',
    colorTextOnPrimaryBackground: '#FFFAF2',
    colorNeutral:                 '#D0C5B7',
    borderRadius:                 '1rem',
    fontFamily:                   "'Inter', 'DM Sans', system-ui, sans-serif",
    fontSize:                     '15px',
  },
  elements: {
    card: {
      background:   '#FFFAF2',
      border:       '1px solid #D0C5B7',
      boxShadow:    '0 26px 70px -42px rgba(71, 54, 39, 0.38)',
    },
    headerTitle: {
      fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontWeight: '300',
      color:      '#29241F',
    },
    headerSubtitle: {
      color: '#756D64',
    },
    dividerLine: {
      background: '#D0C5B7',
    },
    dividerText: {
      color: '#756D64',
    },
    socialButtonsBlockButton: {
      background:  '#F2EDE4',
      border:      '1px solid #D0C5B7',
      color:       '#29241F',
    },
    socialButtonsBlockButtonText: {
      color: '#29241F',
    },
    formFieldLabel: {
      color: '#756D64',
    },
    formFieldInput: {
      background:  '#F2EDE4',
      border:      '1px solid #D0C5B7',
      color:       '#29241F',
    },
    formButtonPrimary: {
      background:    '#B95538',
      color:         '#FFFAF2',
      fontFamily:    "'Inter', 'DM Sans', system-ui, sans-serif",
      letterSpacing: '0',
    },
    footerActionLink: {
      color: '#B95538',
    },
    identityPreviewText: {
      color: '#29241F',
    },
    identityPreviewEditButton: {
      color: '#756D64',
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
