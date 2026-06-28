"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Brain, ArrowLeft, ShieldCheck, CreditCard, Sparkles, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import { useSubscription } from "@/lib/subscription"
import type { CheckoutResponse } from "@/lib/types"

function PricingSummaryContent() {
  const { user, loading: authLoading } = useAuth()
  const { refresh } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()

  const planName = searchParams.get("plan") || "pro"
  const interval = searchParams.get("interval") || "monthly"

  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Card details state
  const [cardName, setCardName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  // Static pricing lookup to ensure speed and local accuracy
  const prices: Record<string, { monthly: number; yearly: number; label: string }> = {
    pro: { monthly: 399, yearly: 3192, label: "Personal Knowledge System" },
    premium: { monthly: 1999, yearly: 15992, label: "AI Research Assistant" },
    team: { monthly: 999, yearly: 7992, label: "Collaborative Intelligence" },
  }

  const selectedPlan = prices[planName] || prices.pro
  const basePrice = interval === "yearly" ? selectedPlan.yearly : selectedPlan.monthly
  const periodLabel = interval === "yearly" ? "year" : "month"
  
  // Tax calculation (Simulated GST at 18%)
  const taxAmount = Math.round(basePrice * 0.18)
  const totalAmount = basePrice + taxAmount

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Payment success countdown
  useEffect(() => {
    if (paymentSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push("/settings/billing?success=true")
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [paymentSuccess, router])

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setPaymentProcessing(true)
    try {
      // Direct mock/prod upgrade action call to backend
      const response = await apiFetch<CheckoutResponse>("/api/subscription/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planName, interval }),
      })

      // Since mock checkout returns redirect url, we simulate card success and refresh local subscription context
      await refresh()
      setPaymentSuccess(true)
    } catch (err) {
      console.error("Simulated checkout error:", err)
      alert("Payment processing failed. Please check your details and try again.")
    } finally {
      setPaymentProcessing(false)
    }
  }

  const getPlanAccentColor = () => {
    if (planName === "pro") return "var(--accent-blue)"
    if (planName === "premium") return "var(--accent-forest)"
    if (planName === "team") return "var(--accent-green)"
    return "var(--border)"
  }

  const getButtonBg = () => {
    if (planName === "pro") return "bg-[var(--accent-blue)] text-[#0B0B0F]"
    if (planName === "premium") return "bg-[var(--accent-forest)] text-white"
    if (planName === "team") return "bg-[var(--accent-green)] text-[#0B0B0F]"
    return "bg-foreground text-background"
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Brain className="w-8 h-8 text-[var(--accent-forest)] animate-pulse" />
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="relative flex flex-col items-center max-w-md w-full bg-card border border-border rounded-[28px] p-8 text-center shadow-2xl animate-memoria-scale-in">
          <div className="absolute -top-10 bg-[var(--accent-green)] p-4 rounded-full shadow-lg shadow-[var(--accent-green)]/20 text-[#0B0B0F]">
            <CheckCircle2 className="h-10 w-10 animate-[scaleIn_0.3s_ease-out] fill-current" />
          </div>
          
          <h1 className="text-3xl font-black text-foreground mt-6 mb-3 tracking-tight">
            Activated!
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed mb-6 font-medium">
            Your subscription has been processed successfully. Welcome to Memoria {planName.toUpperCase()}!
          </p>

          <div className="w-full bg-secondary/50 rounded-[20px] p-5 border border-border/40 mb-8 text-xs leading-relaxed">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground font-semibold">Tier Status</span>
              <span className="text-foreground font-bold capitalize">{planName} ({interval})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Amount Billed</span>
              <span className="text-foreground font-bold">₹{totalAmount}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-semibold">
            Redirecting to dashboard in <span className="font-bold text-[var(--accent-blue)]">{countdown}s</span>...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-4xl animate-memoria-fade-in">
        {/* Navigation */}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>

        <h1 className="text-foreground tracking-tight leading-tight mb-8">Checkout Summary</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Plan Invoice details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="memoria-card-static shadow-[var(--shadow-card)]">
              <h2 className="text-foreground text-lg font-bold mb-4">Your Order</h2>
              
              <div className="flex items-start justify-between pb-4 border-b border-border/40">
                <div>
                  <h3 className="font-bold text-foreground text-base capitalize">
                    Memoria {planName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-semibold">{selectedPlan.label}</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-foreground text-xl">
                    ₹{basePrice}
                  </span>
                  <span className="text-xs text-muted-foreground block capitalize font-semibold">
                    per {periodLabel}
                  </span>
                </div>
              </div>

              {/* Price items breakdown */}
              <div className="space-y-3 pt-4 text-xs font-semibold">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground font-bold">₹{basePrice}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (Simulated GST 18%)</span>
                  <span className="text-foreground font-bold">+₹{taxAmount}</span>
                </div>
                <div className="flex justify-between text-foreground font-black text-base border-t border-border/40 pt-4">
                  <span>Total Amount</span>
                  <span style={{ color: getPlanAccentColor() }}>₹{totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-[20px] border border-[var(--accent-blue)]/20 bg-accent-blue-gradient">
              <ShieldCheck className="h-5 w-5 text-[var(--accent-blue)] shrink-0" />
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Secure checkout. Mock transactions are verified and credited immediately to your billing history.
              </p>
            </div>
          </div>

          {/* Checkout simulated Form */}
          <div className="lg:col-span-5">
            <div className="memoria-card-static shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-5 w-5 text-[var(--accent-forest)]" />
                <h2 className="text-foreground text-lg font-bold">Payment Form</h2>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full rounded-full border border-border bg-secondary/50 px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-[var(--accent-forest)] transition-colors font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="•••• •••• •••• ••••"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
                      const matches = value.match(/\d{4,16}/g)
                      const match = (matches && matches[0]) || ""
                      const parts = []
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4))
                      }
                      if (parts.length > 0) {
                        setCardNumber(parts.join(" "))
                      } else {
                        setCardNumber(value)
                      }
                    }}
                    className="w-full rounded-full border border-border bg-secondary/50 px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-[var(--accent-forest)] transition-colors font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^0-9]/g, "")
                        if (value.length > 2) {
                          value = `${value.substring(0, 2)}/${value.substring(2, 4)}`
                        }
                        setCardExpiry(value)
                      }}
                      className="w-full rounded-full border border-border bg-secondary/50 px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-[var(--accent-forest)] transition-colors font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      CVV
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full rounded-full border border-border bg-secondary/50 px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-[var(--accent-forest)] transition-colors font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={paymentProcessing}
                  className={`w-full mt-6 hover:opacity-95 font-bold py-3.5 px-4 rounded-full text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${getButtonBg()}`}
                  style={{ height: "56px" }}
                >
                  {paymentProcessing ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 fill-current" />
                      Pay ₹{totalAmount}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingSummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Brain className="w-8 h-8 text-[var(--accent-forest)] animate-pulse" />
      </div>
    }>
      <PricingSummaryContent />
    </Suspense>
  )
}
