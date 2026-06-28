"use client"

import { Lock } from "lucide-react"
import type { PlanName } from "@/lib/types"
import { getPlanBadgeColor } from "@/lib/subscription"

interface FeatureBadgeProps {
  plan: PlanName
  size?: "sm" | "md"
  showLock?: boolean
}

export function FeatureBadge({ plan, size = "sm", showLock = true }: FeatureBadgeProps) {
  if (plan === "free") return null

  const badgeColor = getPlanBadgeColor(plan)
  const label = plan.charAt(0).toUpperCase() + plan.slice(1)

  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-[10px]"
    : "px-2 py-0.5 text-xs"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-semibold uppercase tracking-wider ${badgeColor} ${sizeClasses}`}
    >
      {showLock && <Lock className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      {label}
    </span>
  )
}
