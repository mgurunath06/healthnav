export default function BrandMark({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-3">
      <img
        src="/brand/healthnav-mark-color.png"
        alt=""
        aria-hidden="true"
        className="h-10 w-10 rounded-full object-cover"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-xl font-medium tracking-[-0.03em] text-warm-off-white">
            HealthNav
          </span>
          <span className="font-sans text-[10px] tracking-wide text-warm-muted">
            By Jaitra Labs
          </span>
        </span>
      )}
    </span>
  )
}
