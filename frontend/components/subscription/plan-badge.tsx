"use client"

import { Crown, Users, Zap } from "lucide-react"
import type { PlanName } from "@/lib/types"
import { getPlanBadgeColor } from "@/lib/subscription"

interface PlanBadgeProps {
  plan: PlanName
  size?: "sm" | "md" | "lg"
}

export function PlanBadge({ plan, size = "sm" }: PlanBadgeProps) {
  if (plan === "free") return null

  const badgeColor = getPlanBadgeColor(plan)
  const label = plan === "team" ? "Team" : plan.charAt(0).toUpperCase() + plan.slice(1)

  const Icon = plan === "team" ? Users : plan === "premium" ? Crown : Zap

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-1.5",
  }[size]

  const iconSize = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  }[size]

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wider ${badgeColor} ${sizeClasses}`}
    >
      <Icon className={iconSize} />
      {label}
    </span>
  )
}
