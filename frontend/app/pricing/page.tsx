"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Brain, ArrowLeft, GraduationCap, Check, X } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import { PricingCard } from "@/components/subscription/pricing-card"
import { useSubscription } from "@/lib/subscription"
import type { Plan, PlanListResponse, BillingInterval } from "@/lib/types"

function PricingPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { planName } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [plans, setPlans] = useState<Plan[]>([])
  const [interval, setInterval] = useState<BillingInterval>("yearly")
  const [loading, setLoading] = useState(true)

  const canceled = searchParams.get("canceled") === "true"

  useEffect(() => {
    apiFetch<PlanListResponse>("/api/plans")
      .then((data) => setPlans(data.plans))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name === "free") return
    if (plan.name === planName) return
    if (!user) {
      router.push("/login")
      return
    }
    router.push(`/pricing/summary?plan=${plan.name}&interval=${interval}`)
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Brain className="w-8 h-8 text-[var(--accent-forest)] animate-pulse" />
      </div>
    )
  }

  // Feature comparison data
  const comparisonFeatures = [
    { name: "Memories (notes)", free: "100", pro: "10,000", premium: "Unlimited", team: "Unlimited" },
    { name: "Storage", free: "500 MB", pro: "10 GB", premium: "100 GB", team: "100 GB/seat" },
    { name: "AI queries/day", free: "30", pro: "Unlimited", premium: "Unlimited", team: "Unlimited" },
    { name: "Workspaces", free: "1", pro: "5", premium: "Unlimited", team: "Unlimited" },
    { name: "YouTube imports/day", free: "3", pro: "Unlimited", premium: "Unlimited", team: "Unlimited" },
    { name: "Voice transcription", free: true, pro: true, premium: true, team: true },
    { name: "AI summaries", free: false, pro: true, premium: true, team: true },
    { name: "Smart tags", free: false, pro: true, premium: true, team: true },
    { name: "Collections", free: false, pro: true, premium: true, team: true },
    { name: "Timeline view", free: false, pro: true, premium: true, team: true },
    { name: "Memory streaks", free: false, pro: true, premium: true, team: true },
    { name: "AI study planner", free: false, pro: true, premium: true, team: true },
    { name: "Weekly reports", free: false, pro: true, premium: true, team: true },
    { name: "Multi-agent reasoning", free: false, pro: false, premium: true, team: true },
    { name: "Deep research mode", free: false, pro: false, premium: true, team: true },
    { name: "Knowledge graph", free: false, pro: false, premium: true, team: true },
    { name: "AI insights", free: false, pro: false, premium: true, team: true },
    { name: "Personal AI assistant", free: false, pro: false, premium: true, team: true },
    { name: "API access", free: false, pro: false, premium: true, team: true },
    { name: "Shared workspaces", free: false, pro: false, premium: false, team: true },
    { name: "Role-based access", free: false, pro: false, premium: false, team: true },
    { name: "Team analytics", free: false, pro: false, premium: false, team: true },
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="memoria-container py-8 lg:py-12 max-w-6xl animate-memoria-fade-in">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {canceled && (
          <div className="mb-6 rounded-full border border-[var(--accent-coral)]/20 bg-[var(--accent-coral)]/5 px-6 py-3.5 text-sm text-[var(--accent-coral)] font-bold text-center">
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-[var(--accent-forest)]" />
            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
              Memoria AI
            </span>
          </div>
          <h1 className="text-foreground tracking-tight leading-tight mb-4">
            Supercharge Your Second Brain
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-sm font-medium">
            Choose the plan that fits your study, learning, or collaboration needs. Upgrade or downgrade at any time.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center rounded-full border border-border bg-secondary p-1 gap-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                interval === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                interval === "yearly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-[10px] text-[var(--accent-forest)] font-extrabold uppercase tracking-wide">Save 33%</span>
            </button>
          </div>
        </div>

        {/* Student Discount Banner */}
        <div className="mb-12 rounded-[24px] border border-[var(--accent-blue)]/20 bg-accent-blue-gradient p-5 flex items-center gap-4 max-w-2xl mx-auto animate-memoria-fade-in stagger-1">
          <GraduationCap className="h-6 w-6 text-[var(--accent-blue)] shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Student Discount Available</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Use your academic email (.edu) to unlock 20% off all yearly subscriptions.</p>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 animate-memoria-fade-in stagger-2">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              interval={interval}
              currentPlan={planName}
              onSelect={handleSelectPlan}
              isPopular={plan.name === "pro"}
            />
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16 animate-memoria-fade-in stagger-3">
          <h2 className="text-foreground text-center mb-8">
            Compare All Features
          </h2>
          <div className="overflow-x-auto rounded-[24px] border border-border/80 bg-card">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/80">
                  <th className="p-4 font-bold text-muted-foreground">Feature</th>
                  <th className="text-center p-4 font-bold text-muted-foreground">Free</th>
                  <th className="text-center p-4 font-bold text-[var(--accent-blue)]">Pro</th>
                  <th className="text-center p-4 font-bold text-[var(--accent-forest)]">Premium</th>
                  <th className="text-center p-4 font-bold text-[var(--accent-green)]">Team</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-border/40 transition-colors hover:bg-secondary/20 ${i % 2 === 0 ? "bg-card/50" : ""}`}
                  >
                    <td className="p-4 text-foreground font-semibold text-xs">{feature.name}</td>
                    {(["free", "pro", "premium", "team"] as const).map((tier) => {
                      const val = feature[tier]
                      return (
                        <td key={tier} className="p-4 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="h-4.5 w-4.5 text-[var(--accent-forest)] mx-auto font-bold" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/20 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground font-semibold">{val}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto mb-16 animate-memoria-fade-in stagger-4">
          <h2 className="text-foreground text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-4">
            {[
              {
                q: "Can I switch plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged a prorated amount for the remainder of your billing cycle.",
              },
              {
                q: "What happens to my data if I downgrade?",
                a: "Your existing data is preserved. However, you won't be able to create new memories beyond your plan's limit. Premium features will become view-only.",
              },
              {
                q: "Is there a student discount?",
                a: "Yes! Students with a valid .edu email address get 20% off yearly plans. Pro becomes ~$4.80/mo and Premium becomes ~$9.60/mo.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact support for a full refund.",
              },
              {
                q: "How does the Team plan work?",
                a: "Team plans are billed per seat. You can add or remove team members anytime. Each member gets full Premium-level features plus collaboration tools.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-[18px] border border-border/80 bg-card p-5 cursor-pointer transition-all hover:border-[var(--accent-forest)]/55"
              >
                <summary className="text-foreground font-semibold text-sm list-none flex items-center justify-between">
                  {q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg leading-none font-bold">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed font-semibold">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Brain className="w-8 h-8 text-[var(--accent-forest)] animate-pulse" />
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  )
}
