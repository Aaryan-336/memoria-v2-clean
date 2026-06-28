"use client"

interface UsageMeterProps {
  label: string
  current: number
  limit: number | null
  icon?: React.ReactNode
  unit?: string
}

export function UsageMeter({ label, current, limit, icon, unit = "" }: UsageMeterProps) {
  const isUnlimited = limit === null || limit === undefined
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const isWarning = percentage >= 80
  const isDanger = percentage >= 95

  const barColor = isDanger
    ? "bg-[var(--accent-coral)]"
    : isWarning
      ? "bg-[var(--accent-yellow)]"
      : "bg-[var(--accent-blue)]"

  const glowColor = isDanger
    ? "shadow-[var(--accent-coral)]/20"
    : isWarning
      ? "shadow-[var(--accent-yellow)]/20"
      : "shadow-[var(--accent-blue)]/20"

  return (
    <div className="rounded-[24px] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground font-semibold">
          {current.toLocaleString()}{unit}
          {isUnlimited ? (
            <span className="text-[var(--accent-green)] ml-1">/ ∞</span>
          ) : (
            <span> / {limit.toLocaleString()}{unit}</span>
          )}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor} ${percentage > 0 ? `shadow-md ${glowColor}` : ""}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {isUnlimited && (
        <div className="h-2 rounded-full bg-[var(--accent-green)]/20 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-green)]/40 to-[var(--accent-green)]/60 w-full" />
        </div>
      )}

      {isDanger && !isUnlimited && (
        <p className="mt-1.5 text-xs text-[var(--accent-coral)] font-semibold">
          {limit! - current <= 0 ? "Limit reached!" : `${limit! - current} remaining`}
        </p>
      )}
    </div>
  )
}
