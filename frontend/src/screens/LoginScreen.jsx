import { useAuth, SignIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import Header from '../components/Header'

const clerkAppearance = {
  variables: {
    colorPrimary:                 '#C4622D',
    colorPrimaryHover:            '#A8501F',
    colorBackground:              '#242018',
    colorInputBackground:         '#2E2A24',
    colorInputText:               '#F0EBE3',
    colorText:                    '#F0EBE3',
    colorTextSecondary:           '#9A9080',
    colorTextOnPrimaryBackground: '#F0EBE3',
    colorNeutral:                 '#3D3830',
    borderRadius:                 '0.75rem',
    fontFamily:                   "'Inter', 'DM Sans', system-ui, sans-serif",
    fontSize:                     '15px',
  },
  elements: {
    card: {
      background:   '#242018',
      border:       '1px solid #3D3830',
      boxShadow:    '0 4px 20px -2px rgba(26, 24, 20, 0.4)',
    },
    headerTitle: {
      fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontWeight: '300',
      color:      '#F0EBE3',
    },
    headerSubtitle: {
      color: '#9A9080',
    },
    dividerLine: {
      background: '#3D3830',
    },
    dividerText: {
      color: '#9A9080',
    },
    socialButtonsBlockButton: {
      background:  '#2E2A24',
      border:      '1px solid #3D3830',
      color:       '#F0EBE3',
    },
    socialButtonsBlockButtonText: {
      color: '#F0EBE3',
    },
    formFieldLabel: {
      color: '#9A9080',
    },
    formFieldInput: {
      background:  '#2E2A24',
      border:      '1px solid #3D3830',
      color:       '#F0EBE3',
    },
    formButtonPrimary: {
      background:    '#C4622D',
      fontFamily:    "'Inter', 'DM Sans', system-ui, sans-serif",
      letterSpacing: '0',
    },
    footerActionLink: {
      color: '#C4622D',
    },
    identityPreviewText: {
      color: '#F0EBE3',
    },
    identityPreviewEditButton: {
      color: '#9A9080',
    },
  },
}

export default function LoginScreen() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">

          <div className="text-center mb-8">
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">
              HealthNav Premium
            </p>
            <h1 className="font-serif text-3xl font-light text-warm-off-white">
              Sign in to your account
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
