export default function BrandMark({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-accent text-warm-charcoal">
        <span className="absolute h-[2px] w-6 -rotate-45 bg-warm-charcoal/85" />
        <span className="absolute h-[2px] w-6 rotate-45 bg-warm-charcoal/85" />
        <span className="h-2.5 w-2.5 rounded-full border-2 border-warm-charcoal bg-marigold" />
      </span>
      {!compact && (
        <span className="font-serif text-xl font-medium tracking-[-0.03em] text-warm-off-white">
          HealthNav
        </span>
      )}
    </span>
  )
}
