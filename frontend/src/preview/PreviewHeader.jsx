import BrandMark from '../components/BrandMark'

// A Clerk-free header used only inside /design-preview. It mirrors the visual
// language of the real Header but takes no auth or router dependencies.
export default function PreviewHeader({ userName = 'Aanya' }) {
  return (
    <header className="relative z-20 w-full shrink-0 border-b border-warm-border/70 bg-warm-surface px-4 py-4 sm:px-7">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
        <span aria-label="HealthNav home">
          <BrandMark />
        </span>

        <nav className="flex items-center gap-4">
          <span className="hidden font-sans text-sm text-warm-muted md:block">{userName}</span>
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full border border-warm-border bg-warm-elevated font-sans text-xs text-warm-off-white"
          >
            {userName.slice(0, 1)}
          </span>
        </nav>
      </div>
    </header>
  )
}
