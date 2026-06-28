"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { apiFetch } from "@/lib/api"
import type { UserSubscription, UsageLimits, Plan, PlanName } from "@/lib/types"

// ─── Context Types ──────────────────────────────────────────

interface SubscriptionContextType {
  subscription: UserSubscription | null
  usageLimits: UsageLimits | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  hasFeature: (key: string) => boolean
  isUnderQuota: (metric: string) => boolean
  planName: PlanName
  isPro: boolean
  isPremium: boolean
  isTeam: boolean
  isFree: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  usageLimits: null,
  loading: true,
  error: null,
  refresh: async () => {},
  hasFeature: () => false,
  isUnderQuota: () => true,
  planName: "free",
  isPro: false,
  isPremium: false,
  isTeam: false,
  isFree: true,
})

// ─── Provider ───────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const [subData, usageData] = await Promise.all([
        apiFetch<UserSubscription>("/api/subscription").catch(() => null),
        apiFetch<UsageLimits>("/api/usage/limits").catch(() => null),
      ])
      if (subData) setSubscription(subData)
      if (usageData) setUsageLimits(usageData)
    } catch (e) {
      setError("Failed to load subscription data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const planName: PlanName = subscription?.plan?.name || "free"

  const hasFeature = useCallback(
    (key: string): boolean => {
      if (!subscription?.plan?.features) return false
      return !!subscription.plan.features[key]
    },
    [subscription]
  )

  const isUnderQuota = useCallback(
    (metric: string): boolean => {
      if (!usageLimits) return true
      const limitMap: Record<string, number | null | undefined> = {
        ai_queries: usageLimits.limits.max_ai_queries_daily,
        youtube_imports: usageLimits.limits.max_youtube_daily,
        memories: usageLimits.limits.max_memories,
      }
      const limit = limitMap[metric]
      if (limit === null || limit === undefined) return true

      const usageMap: Record<string, number> = {
        ai_queries: usageLimits.usage.ai_queries,
        youtube_imports: usageLimits.usage.youtube_imports,
        memories: usageLimits.memories_count,
      }
      return (usageMap[metric] || 0) < limit
    },
    [usageLimits]
  )

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        usageLimits,
        loading,
        error,
        refresh,
        hasFeature,
        isUnderQuota,
        planName,
        isPro: planName === "pro",
        isPremium: planName === "premium",
        isTeam: planName === "team",
        isFree: planName === "free",
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────────

export function useSubscription() {
  return useContext(SubscriptionContext)
}

// ─── Utilities ──────────────────────────────────────────────

export function formatPrice(cents: number, interval?: "monthly" | "yearly"): string {
  if (cents === 0) return "Free"
  if (interval === "yearly") {
    const monthlyPrice = Math.round(cents / 12)
    return `₹${monthlyPrice}/mo`
  }
  return `₹${cents}/mo`
}

export function getPlanColor(plan: PlanName): string {
  switch (plan) {
    case "pro":
      return "from-[var(--accent-blue)] to-[var(--accent-blue)]/80"
    case "premium":
      return "from-[var(--accent-forest)] to-[var(--accent-forest)]/80"
    case "team":
      return "from-[var(--accent-green)] to-[var(--accent-green)]/80"
    default:
      return "from-muted-foreground to-muted-foreground/80"
  }
}

export function getPlanBadgeColor(plan: PlanName): string {
  switch (plan) {
    case "pro":
      return "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20"
    case "premium":
      return "bg-[var(--accent-lavender)] text-[#6C5F8B] border-[rgba(108,95,139,0.15)]"
    case "team":
      return "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20"
    default:
      return "bg-muted/15 text-muted-foreground border-border/40"
  }
}

export const PLAN_TIER_ORDER: PlanName[] = ["free", "pro", "premium", "team"]

export function isHigherTier(planA: PlanName, planB: PlanName): boolean {
  return PLAN_TIER_ORDER.indexOf(planA) > PLAN_TIER_ORDER.indexOf(planB)
}

export function getRequiredPlan(feature: string): PlanName {
  const proFeatures = [
    "youtube_unlimited", "ai_summaries", "smart_tags",
    "collections", "timeline_view", "daily_recap", "priority_indexing",
    "ppt_upload", "image_upload", "browser_extension", "memory_streaks",
    "ai_study_planner", "smart_reminders", "weekly_reports", "knowledge_analytics",
    "ai_memory_coach", "context_recommendations",
  ]
  const premiumFeatures = [
    "multi_agent_reasoning", "deep_research", "cross_document_analysis",
    "ai_insights", "knowledge_gap_detection", "personal_ai_assistant",
    "custom_ai_personalities", "knowledge_graph", "automatic_organization",
    "memory_health_score", "knowledge_decay_detection", "scheduled_quizzes",
    "study_revision_mode", "learning_mode", "api_access", "long_term_retention",
    "ai_writing_assistant", "meeting_assistant", "smart_workflows",
    "email_ingestion", "memory_replay", "time_machine", "ai_memory_maps",
    "revision_scheduling", "mastery_score", "ai_goal_tracking",
  ]
  const teamFeatures = [
    "shared_workspaces", "rbac", "team_knowledge_base", "activity_logs",
    "workspace_analytics", "collaborative_collections", "shared_memory_graph",
    "org_search",
  ]

  if (teamFeatures.includes(feature)) return "team"
  if (premiumFeatures.includes(feature)) return "premium"
  if (proFeatures.includes(feature)) return "pro"
  return "free"
}
