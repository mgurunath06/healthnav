import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import Header from './Header'

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function PremiumDashboard() {
  const { user } = useUser()

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <main className="flex-1 overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl mx-auto space-y-8">

          {/* Greeting */}
          <div>
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-2">
              Premium
            </p>
            <h1 className="font-serif text-3xl font-light text-warm-off-white">
              Good {timeOfDay()}{user?.firstName ? `, ${user.firstName}` : ''}
            </h1>
          </div>

          {/* Start new investigation CTA */}
          <Link
            to="/"
            className="block rounded-2xl bg-accent/10 border border-accent/30 px-6 py-5
                       hover:bg-accent/15 transition-colors duration-250 group"
          >
            <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
              Symptom Investigation
            </p>
            <p className="font-sans text-base font-medium text-warm-off-white
                          group-hover:text-white transition-colors duration-250">
              Start a new investigation →
            </p>
            <p className="font-sans text-sm text-warm-muted mt-1">
              Describe your symptoms and get a Doctor Prep Card.
            </p>
          </Link>

          {/* Saved prep cards */}
          <section>
            <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-4">
              Saved Prep Cards
            </p>
            <EmptyState message="No saved cards yet" />
          </section>

          {/* Health values */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase">
                Health Values
              </p>
              <Link
                to="/dashboard/upload"
                className="font-sans text-xs text-accent hover:text-accent/80 transition-colors duration-250"
              >
                Upload a document →
              </Link>
            </div>
            <EmptyState message="No documents uploaded yet" />
          </section>

          {/* Upload tile — utility action, dashed border, no fill */}
          <Link
            to="/dashboard/upload"
            className="flex items-center gap-4 border border-dashed border-warm-border
                       rounded-xl px-6 py-5 hover:border-warm-muted transition-colors duration-250 group"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-0.5">
                Upload a document
              </p>
              <p className="font-sans text-xs text-warm-muted">
                Blood tests · Prescriptions · Imaging reports
              </p>
            </div>
            <span className="font-mono text-xs text-warm-muted group-hover:text-warm-off-white transition-colors duration-250 shrink-0">
              →
            </span>
          </Link>

        </div>
      </main>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-warm-border px-6 py-8 text-center">
      <p className="font-sans text-sm text-warm-muted">{message}</p>
    </div>
  )
}
