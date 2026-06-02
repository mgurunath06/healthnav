import Header from './Header'
import DocumentHistoryList from './DocumentHistoryList'

export default function ProfileScreen() {
  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 py-10">
        <div className="w-full max-w-3xl mx-auto">
          <DocumentHistoryList />
        </div>
      </main>
    </div>
  )
}
