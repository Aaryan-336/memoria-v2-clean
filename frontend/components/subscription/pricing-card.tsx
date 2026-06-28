"use client"

import { Check, Sparkles } from "lucide-react"
import type { Plan, BillingInterval, PlanName } from "@/lib/types"

interface PricingCardProps {
  plan: Plan
  interval: BillingInterval
  currentPlan?: PlanName
  onSelect: (plan: Plan) => void
  isPopular?: boolean
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "100 memories",
    "500 MB storage",
    "30 AI queries/day",
    "Single workspace",
    "Basic semantic search",
    "Text notes & PDF upload",
    "Audio recording",
    "Voice transcription",
    "Basic RAG chat",
    "Markdown export",
  ],
  pro: [
    "10,000 memories",
    "10 GB storage",
    "Unlimited AI chat",
    "5 workspaces",
    "Unlimited YouTube import",
    "AI summaries & smart tags",
    "Collections & timeline view",
    "Daily recap",
    "Memory streaks",
    "AI study planner",
    "Smart reminders",
    "Weekly knowledge reports",
    "Everything in Free",
  ],
  premium: [
    "Unlimited memories",
    "100 GB storage",
    "Multi-agent reasoning",
    "Deep research mode",
    "Knowledge graph visualization",
    "Cross-document analysis",
    "AI-generated insights",
    "Knowledge gap detection",
    "Personal AI assistant",
    "API access",
    "AI writing assistant",
    "Memory replay & time machine",
    "Everything in Pro",
  ],
  team: [
    "Everything in Premium",
    "Shared workspaces",
    "Role-based access control",
    "Team knowledge base",
    "Activity logs",
    "Workspace analytics",
    "Collaborative collections",
    "Shared memory graph",
    "Organization-wide search",
  ],
}

export function PricingCard({ plan, interval, currentPlan, onSelect, isPopular }: PricingCardProps) {
  const isCurrent = currentPlan === plan.name
  const price = interval === "yearly" ? plan.price_yearly : plan.price_monthly
  const monthlyPrice = interval === "yearly" ? Math.round(plan.price_yearly / 12) : plan.price_monthly
  const features = PLAN_FEATURES[plan.name] || []

  const yearlySavings = plan.price_monthly > 0
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0

  const getPlanAccentColor = () => {
    if (plan.name === "pro") return "var(--accent-blue)"
    if (plan.name === "premium") return "var(--accent-forest)"
    if (plan.name === "team") return "var(--accent-green)"
    return "var(--border)"
  }

  const getPlanTextAccent = () => {
    if (plan.name === "pro") return "text-[var(--accent-blue)]"
    if (plan.name === "premium") return "text-[var(--accent-forest)] font-bold"
    if (plan.name === "team") return "text-[var(--accent-green)] font-bold"
    return "text-muted-foreground"
  }

  return (
    <div
      className={`relative flex flex-col rounded-[24px] border p-6 transition-all duration-300 ${
        isPopular
          ? "border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/5 shadow-[var(--shadow-card)] scale-[1.02]"
          : isCurrent
            ? "border-[var(--accent-forest)]/30 bg-secondary/15"
            : "border-border bg-card hover:border-border/80 hover:shadow-md"
      }`}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-blue)] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#0B0B0F] shadow-sm">
            <Sparkles className="h-3 w-3 fill-current" />
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground">{plan.display_name}</h3>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-semibold">{plan.description}</p>
      </div>

      {/* Pricing */}
      <div className="mb-6 mt-auto">
        {plan.price_monthly === 0 ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-foreground">Free</span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-foreground">
                ₹{monthlyPrice}
              </span>
              <span className="text-muted-foreground text-sm font-bold">/mo</span>
            </div>
            {interval === "yearly" && yearlySavings > 0 && (
              <p className="mt-1.5 text-[11px] font-bold text-[var(--accent-forest)] uppercase tracking-wider">
                Save {yearlySavings}% with yearly billing
              </p>
            )}
            {interval === "yearly" && (
              <p className="mt-1 text-xs text-muted-foreground font-semibold">
                ₹{price} billed annually
              </p>
            )}
          </div>
        )}
        {plan.name === "team" && (
          <p className="mt-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">per user / month</p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent}
        className={`mb-6 w-full rounded-full py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
          isCurrent
            ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border/50"
            : plan.name === "pro"
              ? "bg-[var(--accent-blue)] text-[#0B0B0F] hover:opacity-90 shadow-sm"
              : plan.name === "premium"
                ? "bg-[var(--accent-forest)] text-white hover:opacity-90 shadow-sm"
                : plan.name === "team"
                  ? "bg-[var(--accent-green)] text-[#0B0B0F] hover:opacity-90 shadow-sm"
                  : "bg-foreground text-background hover:opacity-95"
        }`}
      >
        {isCurrent ? "Current Plan" : "Select Plan"}
      </button>

      {/* Features */}
      <ul className="flex flex-col gap-3 border-t border-border/40 pt-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs">
            <Check className={`h-4 w-4 mt-0.5 shrink-0 ${getPlanTextAccent()}`} />
            <span className="text-muted-foreground font-semibold leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
