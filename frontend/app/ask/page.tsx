"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Send, 
  Loader2, 
  Brain, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Lock, 
  ArrowLeft, 
  Network, 
  Users, 
  AlertCircle 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch, apiUrl, getHeaders } from "@/lib/api"
import { useSubscription } from "@/lib/subscription"
import { useWorkspace } from "@/lib/workspace"
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher"
import { cn } from "@/lib/utils"

interface AgentStepState {
  status: "waiting" | "running" | "success" | "error"
  message: string
}

interface AgentTrace {
  orchestrator: AgentStepState
  search: AgentStepState
  synthesis: AgentStepState
  recap: AgentStepState
}

interface Message {
  role: "user" | "assistant"
  content: string
  isDeepResearch?: boolean
  trace?: AgentTrace
  traceCollapsed?: boolean
}

export default function AskPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { planName } = useSubscription()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [deepResearch, setDeepResearch] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Live trace state for the message currently being generated
  const [liveTrace, setLiveTrace] = useState<AgentTrace>({
    orchestrator: { status: "waiting", message: "Queueing agents..." },
    search: { status: "waiting", message: "Pending notes retrieval..." },
    synthesis: { status: "waiting", message: "Pending synthesis check..." },
    recap: { status: "waiting", message: "Pending study recap structure..." },
  })

  const bottomRef = useRef<HTMLDivElement>(null)

  const isPremiumOrTeam = planName === "premium" || planName === "team"

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, liveTrace])

  const toggleDeepResearch = () => {
    if (!isPremiumOrTeam) {
      setShowUpgradeModal(true)
      return
    }
    setDeepResearch(!deepResearch)
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput("")
    setMessages((m) => [...m, { role: "user", content: q }])
    setLoading(true)

    // Reset live trace
    const initialTrace: AgentTrace = {
      orchestrator: { status: "waiting", message: "Queueing agents..." },
      search: { status: "waiting", message: "Pending notes retrieval..." },
      synthesis: { status: "waiting", message: "Pending synthesis check..." },
      recap: { status: "waiting", message: "Pending study recap structure..." },
    }
    setLiveTrace(initialTrace)

    if (deepResearch) {
      try {
        // Add empty assistant response to hold stream & trace
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "",
            isDeepResearch: true,
            trace: initialTrace,
            traceCollapsed: false,
          },
        ])

        const headers = await getHeaders()
        const response = await fetch(apiUrl("/api/ask/deep-research"), {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: q,
            workspace_id: currentWorkspace?.id || null,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          let errMsg = "Deep research failed"
          if (errData) {
            if (typeof errData.detail === "string") {
              errMsg = errData.detail
            } else if (errData.detail && typeof errData.detail === "object" && errData.detail !== null) {
              errMsg = errData.detail.message || errData.detail.detail || JSON.stringify(errData.detail)
            } else if (typeof errData.message === "string") {
              errMsg = errData.message
            } else if (typeof errData === "string") {
              errMsg = errData
            } else if (typeof errData === "object" && errData !== null) {
              errMsg = errData.message || JSON.stringify(errData)
            }
          }
          throw new Error(errMsg)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let assistantText = ""
        let traceState = { ...initialTrace }

        if (reader) {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              const cleanLine = line.trim()
              if (cleanLine.startsWith("data: ")) {
                const rawJson = cleanLine.substring(6)
                try {
                  const chunk = JSON.parse(rawJson)
                  if (chunk.type === "agent_start") {
                    traceState = {
                      ...traceState,
                      orchestrator: { status: "success", message: chunk.message },
                      search: { status: "running", message: "Searching workspace databases..." },
                    }
                    setLiveTrace(traceState)
                    updateLastMessageTrace(traceState, assistantText)
                  } else if (chunk.type === "agent_status") {
                    const { agent, status, message } = chunk
                    const nextAgentMap: Record<string, keyof AgentTrace> = {
                      search: "synthesis",
                      synthesis: "recap",
                    }
                    const nextAgent = nextAgentMap[agent]

                    traceState = {
                      ...traceState,
                      [agent]: { status, message },
                    }

                    // Auto-advance next status to running if previous succeeded
                    if (status === "success" && nextAgent) {
                      traceState[nextAgent] = {
                        status: "running",
                        message: `Starting ${nextAgent} stage...`,
                      }
                    }

                    setLiveTrace(traceState)
                    updateLastMessageTrace(traceState, assistantText)
                  } else if (chunk.type === "text") {
                    // Mark recap as success once answer streaming starts
                    if (traceState.recap.status !== "success") {
                      traceState.recap = {
                        status: "success",
                        message: "Study recap structured. Streaming insights.",
                      }
                      setLiveTrace(traceState)
                    }

                    assistantText += chunk.content
                    setMessages((m) => {
                      const next = [...m]
                      if (next.length > 0) {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          content: assistantText,
                          trace: traceState,
                        }
                      }
                      return next
                    })
                  } else if (chunk.type === "done") {
                    // Auto-collapse trace when generation is finished
                    setMessages((m) => {
                      const next = [...m]
                      if (next.length > 0) {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          traceCollapsed: true,
                        }
                      }
                      return next
                    })
                  } else if (chunk.type === "error") {
                    throw new Error(chunk.message)
                  }
                } catch (e) {
                  console.error("Failed to parse event", e)
                }
              }
            }
          }
        }
      } catch (e: any) {
        setMessages((m) => {
          const next = [...m]
          if (next.length > 0) {
            let errorMsg = "Something went wrong."
            if (e && typeof e === "object") {
              if (e.message && typeof e.message === "string") {
                errorMsg = e.message
              } else if (e.message && typeof e.message === "object") {
                errorMsg = e.message.message || JSON.stringify(e.message)
              } else if (e.detail && typeof e.detail === "string") {
                errorMsg = e.detail
              } else if (e.detail && typeof e.detail === "object") {
                errorMsg = e.detail.message || JSON.stringify(e.detail)
              } else {
                errorMsg = JSON.stringify(e)
              }
            } else if (typeof e === "string") {
              errorMsg = e
            }
            next[next.length - 1] = {
              role: "assistant",
              content: `Deep Research Error: ${errorMsg}`,
            }
          }
          return next
        })
      } finally {
        setLoading(false)
      }
    } else {
      // Standard Q&A Mode
      try {
        const data = await apiFetch<{ answer: string }>("/api/ask", {
          method: "POST",
          body: JSON.stringify({
            question: q,
            workspace_id: currentWorkspace?.id || null,
          }),
        })
        setMessages((m) => [...m, { role: "assistant", content: data.answer }])
      } catch (err: any) {
        let errorMsg = "Connecting to backend failed."
        if (err && typeof err === "object") {
          if (err.message && typeof err.message === "string") {
            errorMsg = err.message
          } else if (err.message && typeof err.message === "object") {
            errorMsg = err.message.message || JSON.stringify(err.message)
          } else if (err.detail && typeof err.detail === "string") {
            errorMsg = err.detail
          } else if (err.detail && typeof err.detail === "object") {
            errorMsg = err.detail.message || JSON.stringify(err.detail)
          } else {
            errorMsg = JSON.stringify(err)
          }
        } else if (typeof err === "string") {
          errorMsg = err
        }
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${errorMsg}` },
        ])
      } finally {
        setLoading(false)
      }
    }
  }

  const updateLastMessageTrace = (trace: AgentTrace, content: string) => {
    setMessages((m) => {
      const next = [...m]
      if (next.length > 0) {
        next[next.length - 1] = {
          ...next[next.length - 1],
          trace,
          content,
        }
      }
      return next
    })
  }

  const toggleTraceCollapse = (index: number) => {
    setMessages((m) => {
      const next = [...m]
      next[index] = {
        ...next[index],
        traceCollapsed: !next[index].traceCollapsed,
      }
      return next
    })
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  // --- Render Agent Trace Component ---
  const renderTrace = (trace: AgentTrace, isCollapsed: boolean, onToggle: () => void) => {
    const steps = [
      { key: "orchestrator", label: "Orchestrator", icon: "🕵️‍♂️" },
      { key: "search", label: "Search Agent", icon: "🔍" },
      { key: "synthesis", label: "Synthesis Agent", icon: "🧠" },
      { key: "recap", label: "Study Coach Agent", icon: "📋" },
    ]

    return (
      <div className="bg-secondary/40 border border-border/60 rounded-[20px] p-5 mb-4 overflow-hidden max-w-full">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider mb-2 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-[var(--accent-forest)] animate-pulse" />
            Reasoning Trace (Multi-Agent)
          </span>
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-4 pt-2 relative pl-3"
            >
              {/* Connector line */}
              <div className="absolute top-4 bottom-4 left-[23px] w-0.5 bg-border/40" />

              {steps.map((step, idx) => {
                const s = trace[step.key as keyof AgentTrace]
                const isRunning = s.status === "running"
                const isSuccess = s.status === "success"

                return (
                  <div key={step.key} className="flex items-start gap-4 relative">
                    <div
                      className={cn(
                        "relative flex items-center justify-center w-[22px] h-[22px] rounded-full text-xs z-10 border transition-all duration-300",
                        isRunning && "border-[var(--accent-sky)] bg-[var(--accent-sky)]/30 text-[var(--foreground)] scale-105",
                        isSuccess && "border-[var(--accent-forest)] bg-[var(--accent-mint)] text-[var(--accent-forest)]",
                        s.status === "waiting" && "border-border bg-card text-muted-foreground/45"
                      )}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-forest)] shrink-0" />
                      ) : isRunning ? (
                        <Loader2 className="w-3 h-3 text-[var(--foreground)] animate-spin shrink-0" />
                      ) : (
                        <span className="text-[10px] opacity-75">{step.icon}</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-0.5 pt-0.5">
                      <p
                        className={cn(
                          "text-xs font-bold leading-none transition-colors",
                          isRunning && "text-[var(--foreground)]",
                          isSuccess && "text-[var(--accent-forest)]",
                          s.status === "waiting" && "text-muted-foreground/60"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{s.message}</p>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <div className="memoria-container py-8 lg:py-12 max-w-2xl flex-1 flex flex-col">
        {/* Header with Switcher */}
        <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-memoria-fade-in">
          <div>
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-foreground mb-2">AI Assistant</h1>
            <p className="text-muted-foreground">Ask questions and synthesize concepts across your memories.</p>
          </div>
          <div className="flex items-center">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col gap-6 mb-8 min-h-[400px]">
          {messages.length === 0 && (
            <div className="flex flex-col gap-6 animate-memoria-fade-in stagger-1">
              {/* Hero Card */}
              <div className="memoria-card-static bg-accent-lavender-gradient border-[var(--accent-lavender)]/40 p-8 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-2xl bg-[var(--accent-lavender)] text-[var(--foreground)]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h2 className="text-foreground font-bold tracking-tight text-xl">Query Your Knowledge Base</h2>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Your notes and recordings are vectorized and indexed. Ask about specific details, cross-examine subjects, or request a complete summary study session.
                </p>
                <div className="text-xs text-[var(--accent-forest)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4" />
                  AI RAG Pipeline Active
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Suggested Queries
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    "What key topics have I saved in this workspace?",
                    "Summarize my recent recordings and notes",
                    "What are the main actionable items from my notes?"
                  ].map((q, idx) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className={`px-5 py-4 rounded-[16px] bg-card border border-border text-foreground text-sm hover:border-[var(--accent-forest)] transition-all text-left cursor-pointer shadow-sm hover:shadow-md animate-memoria-fade-in stagger-${idx + 2}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} animate-memoria-fade-in`}>
              <div
                className={cn(
                  "max-w-[90%] px-5 py-4 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "bg-[var(--accent-forest)] text-white rounded-[20px] rounded-br-[4px] font-semibold"
                    : "bg-card border border-border text-foreground rounded-[20px] rounded-bl-[4px]"
                )}
              >
                {/* If it has an agent trace, render it inside the assistant bubble */}
                {m.role === "assistant" && m.trace && (
                  <div className="mb-3">
                    {renderTrace(m.trace, !!m.traceCollapsed, () => toggleTraceCollapse(i))}
                  </div>
                )}
                {m.content ? (
                  <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                ) : (
                  m.role === "assistant" && (
                    <div className="flex items-center gap-2 text-muted-foreground py-1 text-xs font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-forest)]" /> 
                      AI Agent reasoning...
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input box + Toggles */}
        <div className="sticky bottom-24 md:bottom-6 bg-background/95 backdrop-blur-md pt-2 space-y-3 z-30 animate-memoria-fade-in stagger-2">
          {/* Toggle container */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-[20px] bg-secondary/50 border border-border/40">
            <button
              onClick={toggleDeepResearch}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border",
                deepResearch 
                  ? "bg-[var(--accent-mint)] text-[var(--accent-forest)] border-[var(--accent-forest)]/30" 
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              <Sparkles className={cn("w-3.5 h-3.5", deepResearch ? "text-[var(--accent-forest)]" : "text-muted-foreground")} />
              <span>Deep Research (Multi-Agent)</span>
              {!isPremiumOrTeam && <Lock className="w-3 h-3 text-[var(--accent-yellow)] shrink-0" />}
            </button>
            <span className="text-[10px] font-semibold text-muted-foreground/60 mr-2 uppercase tracking-wide">
              {deepResearch ? "Scopes entire database" : "Quick Q&A"}
            </span>
          </div>

          <div className="flex gap-3">
            <div
              className="flex-1 flex items-center gap-3 px-5 rounded-[28px] bg-card border border-border focus-within:border-[var(--accent-forest)] focus-within:shadow-[0_0_0_3px_rgba(45,106,79,0.08)] transition-all"
              style={{ height: "56px" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about your notes…"
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
              />
            </div>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-[28px] text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center flex-shrink-0"
              style={{
                height: "56px",
                width: "56px",
                background: "var(--accent-forest)",
                color: "#FFFFFF",
              }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal overlay */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border p-6 rounded-[24px] max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--accent-butter)]/20 to-transparent rounded-full filter blur-xl" />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-[var(--accent-butter)] text-[var(--foreground)]">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Unlock Deep Research</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Deep Research Mode deploys specialized subagents (Search, Synthesis, and Study Recap Coach) to inspect and cross-examine concepts across your entire note ecosystem. 
                <span className="block mt-2 font-semibold text-[var(--accent-yellow)]">Requires Premium or Team subscription.</span>
              </p>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false)
                    router.push("/pricing")
                  }}
                  className="px-5 py-2.5 bg-[var(--accent-forest)] text-white text-sm font-bold rounded-full transition-all shadow-lg cursor-pointer"
                >
                  Upgrade Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
