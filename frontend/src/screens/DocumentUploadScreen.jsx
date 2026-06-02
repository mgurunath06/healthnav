import { Link } from 'react-router-dom'
import Header from '../components/Header'
import DocumentUpload from '../components/DocumentUpload'
import DocumentHistoryList from '../components/DocumentHistoryList'

export default function DocumentUploadScreen() {
  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />

      <main className="flex-1 overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl mx-auto space-y-6">

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-sm text-warm-muted
                       hover:text-warm-off-white transition-colors duration-250"
          >
            ← Dashboard
          </Link>

          <DocumentUpload />
          <DocumentHistoryList />

        </div>
      </main>
    </div>
  )
}
