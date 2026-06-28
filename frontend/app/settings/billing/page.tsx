"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Brain,
  ArrowLeft,
  CreditCard,
  ExternalLink,
  MessageSquare,
  PlayCircle,
  BookOpen,
  HardDrive,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import { useSubscription } from "@/lib/subscription"
import { PlanBadge } from "@/components/subscription/plan-badge"
import { UsageMeter } from "@/components/subscription/usage-meter"
import { WorkspaceMembers } from "@/components/subscription/workspace-members"
import type {
  UsageLimits,
  PortalResponse,
  PaymentHistoryResponse,
  PaymentHistoryItem,
} from "@/lib/types"

function BillingPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { subscription, planName, isFree, refresh } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null)
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const success = searchParams.get("success") === "true"

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      Promise.all([
        apiFetch<UsageLimits>("/api/usage/limits").catch(() => null),
        apiFetch<PaymentHistoryResponse>("/api/billing/history").catch(() => ({ payments: [] })),
      ]).then(([usage, billing]) => {
        if (usage) setUsageLimits(usage)
        setPayments(billing?.payments || [])
        setLoading(false)
      })

      // Refresh subscription data when returning from checkout
      if (success) {
        refresh()
      }
    }
  }, [user, success, refresh])

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await apiFetch<PortalResponse>("/api/subscription/portal", {
        method: "POST",
      })
      window.location.href = portal_url
    } catch (e) {
      console.error("Portal error:", e)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel? You'll retain access until the end of your billing period.")) {
      return
    }
    try {
      await apiFetch("/api/subscription/cancel", { method: "POST" })
      refresh()
    } catch (e) {
      console.error("Cancel error:", e)
    }
  }

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Brain className="w-8 h-8 text-[var(--accent-forest)] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="memoria-container py-8 lg:py-12 max-w-4xl animate-memoria-fade-in">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {success && (
          <div className="mb-6 rounded-full border border-[var(--accent-green)]/20 bg-[var(--accent-green)]/5 px-6 py-3.5 flex items-center justify-center gap-2 text-sm text-[var(--accent-green)] font-bold text-center">
            <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)] shrink-0" />
            <span>Payment successful! Your plan has been upgraded.</span>
          </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="h-6 w-6 text-[var(--accent-forest)]" />
          <h1 className="text-foreground tracking-tight leading-tight">Billing & Usage</h1>
        </div>

        {/* Current Plan Card */}
        <div className="memoria-card-static mb-8 shadow-[var(--shadow-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Current Plan</p>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-foreground">
                  {subscription?.plan.display_name || "Explorer"}
                </h2>
                <PlanBadge plan={planName} size="md" />
              </div>
              {subscription && subscription.status !== "active" && (
                <p className="mt-1 text-xs text-[var(--accent-yellow)] font-bold capitalize">
                  Status: {subscription.status}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isFree && (
                <button
                  onClick={handleManageBilling}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-[var(--accent-forest)] transition-all cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manage Billing
                </button>
              )}
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-forest)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 transition-all"
              >
                {isFree ? "Upgrade Plan" : "Change Plan"}
              </Link>
            </div>
          </div>

          {/* Plan details */}
          {subscription && !isFree && (
            <div className="flex gap-8 text-xs text-muted-foreground border-t border-border/40 pt-5 mt-5 font-semibold">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold">Billing Cycle</span>
                <p className="text-foreground font-bold mt-0.5 capitalize">{subscription.billing_interval}</p>
              </div>
              {subscription.current_period_end && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold">
                    {subscription.canceled_at ? "Access Until" : "Next Billing Date"}
                  </span>
                  <p className="text-foreground font-bold mt-0.5">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Usage Meters */}
        <div className="mb-8">
          <h2 className="text-foreground text-xl font-bold mb-4">Resource Limits & Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UsageMeter
              label="AI Queries Today"
              current={usageLimits?.usage.ai_queries || 0}
              limit={usageLimits?.limits.max_ai_queries_daily ?? null}
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <UsageMeter
              label="YouTube Imports Today"
              current={usageLimits?.usage.youtube_imports || 0}
              limit={usageLimits?.limits.max_youtube_daily ?? null}
              icon={<PlayCircle className="h-4 w-4" />}
            />
            <UsageMeter
              label="Total Memories"
              current={usageLimits?.memories_count || 0}
              limit={usageLimits?.limits.max_memories ?? null}
              icon={<BookOpen className="h-4 w-4" />}
            />
            <UsageMeter
              label="Storage Used"
              current={usageLimits?.usage.storage_used_mb || 0}
              limit={usageLimits?.limits.max_storage_mb ?? null}
              icon={<HardDrive className="h-4 w-4" />}
              unit=" MB"
            />
          </div>
        </div>

        {/* Team Collaboration */}
        <WorkspaceMembers />

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-foreground text-xl font-bold mb-4">Payment History</h2>
            <div className="rounded-[24px] border border-border/80 bg-card overflow-hidden shadow-[var(--shadow-card)]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/80">
                    <th className="p-4 font-bold text-muted-foreground">Date</th>
                    <th className="p-4 font-bold text-muted-foreground">Description</th>
                    <th className="p-4 font-bold text-muted-foreground text-right">Amount</th>
                    <th className="p-4 font-bold text-muted-foreground text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/40 transition-colors hover:bg-secondary/20">
                      <td className="p-4 text-muted-foreground font-semibold">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-foreground font-semibold">
                        {payment.description || "Subscription payment"}
                      </td>
                      <td className="p-4 text-right text-foreground font-black">
                        ₹{(payment.amount / 100).toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            payment.status === "succeeded"
                              ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border-[rgba(45,106,79,0.15)]"
                              : payment.status === "failed"
                                ? "bg-[var(--accent-coral)]/15 text-[var(--accent-coral)] border-[rgba(232,93,74,0.15)]"
                                : "bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border-[rgba(212,168,67,0.15)]"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cancel subscription */}
        {!isFree && subscription?.status === "active" && !subscription.canceled_at && (
          <div className="rounded-[24px] border border-[var(--accent-coral)]/20 bg-[var(--accent-coral)]/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Cancel Subscription</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Need to cancel? You will retain all premium workspace access benefits until the end of your billing cycle.
              </p>
            </div>
            <button
              onClick={handleCancelSubscription}
              className="inline-flex items-center justify-center text-xs font-bold uppercase tracking-wider text-[var(--accent-coral)] bg-[var(--accent-coral)]/10 hover:bg-[var(--accent-coral)]/20 px-5 py-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Brain className="w-8 h-8 text-[var(--accent-forest)] animate-pulse" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}
