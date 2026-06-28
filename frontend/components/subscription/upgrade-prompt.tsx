"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Sparkles, ArrowRight, Lock } from "lucide-react"
import type { PlanName } from "@/lib/types"
import { getPlanBadgeColor } from "@/lib/subscription"

interface UpgradePromptProps {
  type: "quota_exceeded" | "feature_locked" | "memory_limit_reached" | "nudge"
  message: string
  feature?: string
  requiredPlan?: PlanName
  currentUsage?: number
  limit?: number
  onDismiss?: () => void
  variant?: "modal" | "banner" | "inline"
}

export function UpgradePrompt({
  type,
  message,
  feature,
  requiredPlan = "pro",
  currentUsage,
  limit,
  onDismiss,
  variant = "banner",
}: UpgradePromptProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  const planLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)
  const badgeColor = getPlanBadgeColor(requiredPlan)

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-[var(--accent-yellow)]/20 bg-[var(--accent-yellow)]/5 px-4.5 py-2">
        <Lock className="h-3.5 w-3.5 text-[var(--accent-yellow)] shrink-0" />
        <span className="text-xs text-foreground font-bold">{message}</span>
        <button
          onClick={handleUpgrade}
          className="ml-auto text-xs font-bold text-[var(--accent-yellow)] hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
        >
          Upgrade →
        </button>
      </div>
    )
  }

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
        <div className="relative mx-4 w-full max-w-md rounded-[28px] border border-border/80 bg-card p-8 shadow-[var(--shadow-elevated)] animate-memoria-scale-in">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-[var(--accent-coral)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[20px] bg-accent-mint-gradient text-[var(--accent-forest)]">
            <Sparkles className="h-6 w-6 fill-current" />
          </div>

          <h3 className="mb-2 text-xl font-black text-foreground tracking-tight">
            {type === "quota_exceeded" && "Limit Reached"}
            {type === "feature_locked" && "Premium Feature"}
            {type === "memory_limit_reached" && "Storage Full"}
            {type === "nudge" && "Unlock More Power"}
          </h3>

          <p className="mb-5 text-xs text-muted-foreground leading-relaxed font-semibold">{message}</p>

          {currentUsage !== undefined && limit !== undefined && (
            <div className="mb-6 rounded-[20px] bg-secondary/50 p-4 border border-border/40">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-bold">
                <span>Usage Progress</span>
                <span>{currentUsage} / {limit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent-coral)]"
                  style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 rounded-full border border-border/80 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--accent-forest)] py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 transition-opacity shadow-md cursor-pointer"
            >
              Upgrade to {planLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Banner variant (default)
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[var(--accent-blue)]/20 bg-accent-blue-gradient px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
            <Sparkles className="h-4.5 w-4.5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-relaxed">{message}</p>
            {feature && (
              <span className={`inline-flex items-center gap-1 mt-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                {planLabel} Required
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleUpgrade}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-blue)] px-4.5 py-2 text-xs font-bold uppercase tracking-wider text-[#0B0B0F] hover:opacity-90 transition-all cursor-pointer"
          >
            Upgrade
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
