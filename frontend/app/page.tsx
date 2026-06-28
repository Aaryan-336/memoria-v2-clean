"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Mic,
  PlayCircle,
  BookOpen,
  MessageSquare,
  Brain,
  Zap,
  LogOut,
  Layers,
  Timer,
  CreditCard,
  Crown,
  ArrowRight,
  Sparkles,
  TrendingUp,
  BookMarked,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch, API_BASE_URL } from "@/lib/api"
import { PlanBadge } from "@/components/subscription/plan-badge"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"
import { useSubscription } from "@/lib/subscription"

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const { planName, isFree, usageLimits } = useSubscription()
  const router = useRouter()
  const [notes, setNotes] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    const errHandler = (event: ErrorEvent) => {
      setClientError(`Error: ${event.message} at ${event.lineno}:${event.colno}`)
    }

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason ? (event.reason.message || String(event.reason)) : "Unknown"
      setClientError(`Unhandled Rejection: ${reason}`)
    }

    window.addEventListener("error", errHandler)
    window.addEventListener("unhandledrejection", rejectionHandler)

    return () => {
      window.removeEventListener("error", errHandler)
      window.removeEventListener("unhandledrejection", rejectionHandler)
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      apiFetch<{ notes: any[] }>("/api/notes")
        .then(d => setNotes(d.notes || []))
        .catch(() => {})
    }
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-mint)] flex items-center justify-center animate-pulse">
          <Brain className="w-5 h-5 text-[var(--accent-forest)]" />
        </div>
        <div className="text-muted-foreground text-[10px] font-mono max-w-xs text-center space-y-1 opacity-70">
          <p>Auth Loading: {loading ? "Yes" : "No"}</p>
          <p>User: {user ? user.email : "None"}</p>
          {mounted ? (
            <>
              <p>API Base URL: {API_BASE_URL}</p>
              <p>Hostname: {window.location.hostname}</p>
              {clientError && (
                <p className="text-[var(--destructive)] font-bold mt-2 break-all px-4">{clientError}</p>
              )}
            </>
          ) : (
            <>
              <p>API Base URL: loading...</p>
              <p>Hostname: loading...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  const showUpgradeNudge = isFree && notes.length >= 5
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  const quickActions = [
    { icon: Mic, label: "Record", desc: "Voice note", href: "/record", color: "var(--accent-sky)", bgColor: "var(--accent-sky)" },
    { icon: PlayCircle, label: "YouTube", desc: "Import video", href: "/youtube", color: "var(--accent-peach)", bgColor: "var(--accent-peach)" },
    { icon: MessageSquare, label: "Research", desc: "Ask AI", href: "/ask", color: "var(--accent-lavender)", bgColor: "var(--accent-lavender)" },
    { icon: BookOpen, label: "Notes", desc: "Library", href: "/notes", color: "var(--accent-mint)", bgColor: "var(--accent-mint)" },
  ]

  const featureCards = [
    { icon: Layers, label: "Flashcards", desc: "Study cards", href: "/flashcards", color: "var(--accent-butter)", bgColor: "var(--accent-butter)" },
    { icon: Timer, label: "Quiz Mode", desc: "Test yourself", href: "/quiz", color: "var(--accent-sky)", bgColor: "var(--accent-sky)" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12">

        {/* ── Header Row ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-forest)] flex items-center justify-center lg:hidden">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">{greeting()}</p>
              <h1 className="text-foreground leading-tight" style={{ fontSize: '1.75rem' }}>
                Your Second Brain
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge plan={planName} size="sm" />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-[var(--accent)]/60 transition-all text-xs font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── Upgrade Banner ── */}
        {showUpgradeNudge && (
          <div className="mb-6 animate-memoria-fade-in">
            <UpgradePrompt
              type="nudge"
              message="Unlock unlimited AI queries, collections, and more with Pro"
              requiredPlan="pro"
              variant="banner"
            />
          </div>
        )}

        {/* ── Hero Card ── */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 lg:p-10 mb-8 animate-memoria-fade-in"
          style={{
            background: "linear-gradient(135deg, rgba(212,237,218,0.35) 0%, rgba(214,234,248,0.2) 50%, rgba(212,237,218,0.1) 100%)",
            border: "1px solid rgba(212,237,218,0.4)",
            minHeight: "200px",
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent-mint), transparent)" }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[var(--accent-forest)]" />
              <span className="text-[var(--accent-forest)] text-xs font-semibold uppercase tracking-widest">
                AI Insights
              </span>
            </div>
            <h2 className="text-foreground mb-3" style={{ fontSize: '1.5rem', lineHeight: '1.3' }}>
              {notes.length > 0
                ? `You have ${notes.length} memor${notes.length === 1 ? "y" : "ies"} saved`
                : "Start building your knowledge base"
              }
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {notes.length > 0
                ? "Your AI memory is growing. Ask questions, create flashcards, or take a quiz to reinforce learning."
                : "Record audio, import YouTube videos, or ask AI to start capturing knowledge."
              }
            </p>
            {notes.length > 0 && (
              <Link
                href="/ask"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  background: "var(--accent-forest)",
                  color: "#FFFFFF",
                }}
              >
                <MessageSquare className="w-4 h-4" />
                Ask Your Memory
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="mb-8">
          <h3 className="text-foreground font-semibold text-sm mb-4 uppercase tracking-wider" style={{ fontSize: '0.75rem' }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="memoria-card group flex flex-col items-start gap-3 p-5"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: item.bgColor }}
                >
                  <item.icon className="w-5 h-5 text-[var(--foreground)]" />
                </div>
                <div>
                  <p className="text-foreground font-semibold text-sm">{item.label}</p>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── AI Insight Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {/* Knowledge Growth */}
          <div className="memoria-card-static bg-accent-mint-gradient flex items-start gap-4 p-5" style={{ borderColor: 'rgba(212,237,218,0.5)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-mint)' }}>
              <TrendingUp className="w-5 h-5 text-[var(--accent-forest)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Knowledge</p>
              <p className="text-foreground font-bold text-xl">{notes.length}</p>
              <p className="text-muted-foreground text-xs">memories saved</p>
            </div>
          </div>

          {/* Study */}
          <Link href="/flashcards" className="memoria-card bg-accent-butter-gradient flex items-start gap-4 p-5" style={{ borderColor: 'rgba(255,243,205,0.5)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-butter)' }}>
              <BookMarked className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Study</p>
              <p className="text-foreground font-bold text-xl">Cards & Quiz</p>
              <p className="text-muted-foreground text-xs">reinforce learning</p>
            </div>
          </Link>

          {/* AI */}
          <Link href="/ask" className="memoria-card bg-accent-lavender-gradient flex items-start gap-4 p-5" style={{ borderColor: 'rgba(232,223,245,0.5)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-lavender)' }}>
              <Sparkles className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">AI Assistant</p>
              <p className="text-foreground font-bold text-xl">Ask Memory</p>
              <p className="text-muted-foreground text-xs">RAG-powered Q&A</p>
            </div>
          </Link>
        </div>

        {/* ── Usage Summary (Free users) ── */}
        {isFree && usageLimits && (
          <div className="grid grid-cols-3 gap-3 mb-8 animate-memoria-fade-in">
            <div className="memoria-card-static text-center p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">AI Queries</p>
              <p className="text-lg font-bold text-foreground">
                {usageLimits.usage.ai_queries}
                <span className="text-muted-foreground font-normal text-sm"> / {usageLimits.limits.max_ai_queries_daily ?? "∞"}</span>
              </p>
            </div>
            <div className="memoria-card-static text-center p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Memories</p>
              <p className="text-lg font-bold text-foreground">
                {usageLimits.memories_count}
                <span className="text-muted-foreground font-normal text-sm"> / {usageLimits.limits.max_memories ?? "∞"}</span>
              </p>
            </div>
            <div className="memoria-card-static text-center p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">YouTube</p>
              <p className="text-lg font-bold text-foreground">
                {usageLimits.usage.youtube_imports}
                <span className="text-muted-foreground font-normal text-sm"> / {usageLimits.limits.max_youtube_daily ?? "∞"}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── More Features Row ── */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {featureCards.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="memoria-card group flex items-center gap-4 p-5"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ background: item.bgColor }}
              >
                <item.icon className="w-5 h-5 text-[var(--foreground)]" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">{item.label}</p>
                <p className="text-muted-foreground text-xs">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        {/* ── Recent Notes ── */}
        {notes.length > 0 && (
          <div className="animate-memoria-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold text-sm uppercase tracking-wider" style={{ fontSize: '0.75rem' }}>
                Recent Memories
              </h3>
              <Link href="/notes" className="text-[var(--accent-forest)] text-xs font-semibold hover:opacity-80 transition-opacity flex items-center gap-1">
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {notes.slice(0, 3).map((note: any) => (
                <Link key={note.id} href={`/notes/${note.id}`}
                  className="memoria-card flex items-start gap-4 p-5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-mint)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-[var(--accent-forest)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm mb-1 truncate">{note.title}</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{note.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {notes.length === 0 && (
          <div className="text-center py-20 animate-memoria-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-5">
              <Brain className="w-7 h-7 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-foreground font-semibold mb-2" style={{ fontSize: '1.125rem' }}>No memories yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
              Start by recording audio or importing a YouTube video to build your knowledge base.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/record" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all" style={{ background: 'var(--accent-forest)' }}>
                <Mic className="w-4 h-4" />
                Record Audio
              </Link>
              <Link href="/youtube" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold bg-[var(--accent)] text-foreground hover:bg-[var(--background-secondary)] transition-all">
                <PlayCircle className="w-4 h-4" />
                Import YouTube
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
