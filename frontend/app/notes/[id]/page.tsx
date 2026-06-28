"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Mic,
  PlayCircle,
  FileText,
  BookOpen,
  HelpCircle,
  ListChecks,
  Bell,
  Layers,
  Timer,
  ExternalLink,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import type { Note } from "@/lib/types"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"
import { motion, AnimatePresence } from "framer-motion"

export default function NoteDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const noteId = params.id as string
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    "notes" | "transcript" | "questions" | "actions"
  >("notes")
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizQuestionsCount, setQuizQuestionsCount] = useState(10)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      apiFetch<{ notes: Note[] }>("/api/notes")
        .then((d) => {
          const found = (d.notes || []).find((n: Note) => n.id === noteId)
          setNote(found || null)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [noteId, user])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-background">
        <div className="memoria-container py-8 lg:py-12 max-w-2xl">
          <Link
            href="/notes"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Notes
          </Link>
          <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-[24px] p-8 shadow-[var(--shadow-card)]">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-foreground font-semibold">Note not found</p>
          </div>
        </div>
      </div>
    )
  }

  const sourceIcon = (type: string) => {
    if (type === "audio") return <Mic className="w-3.5 h-3.5" />
    if (type === "youtube") return <PlayCircle className="w-3.5 h-3.5" />
    return <FileText className="w-3.5 h-3.5" />
  }

  const sourceColor = (type: string) => {
    if (type === "audio") return "bg-[var(--accent-mint)] text-[var(--accent-forest)] border-[rgba(45,106,79,0.15)]"
    if (type === "youtube") return "bg-[var(--accent-peach)] text-[#B24C19] border-[rgba(178,76,25,0.15)]"
    return "bg-[var(--accent-lavender)] text-[#6C5F8B] border-[rgba(108,95,139,0.15)]"
  }

  const tabs = [
    { key: "notes" as const, label: "Notes", icon: BookOpen },
    { key: "transcript" as const, label: "Transcript", icon: FileText },
    { key: "questions" as const, label: "Questions", icon: HelpCircle },
    { key: "actions" as const, label: "Actions", icon: ListChecks },
  ]

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="memoria-container py-8 lg:py-12 max-w-3xl">
        {/* Back link */}
        <div className="mb-6 animate-memoria-fade-in">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Notes
          </Link>
        </div>

        {/* Header Section */}
        <div className="mb-8 animate-memoria-fade-in stagger-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h1 className="text-foreground tracking-tight leading-tight">{note.title}</h1>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-center flex-shrink-0 border ${sourceColor(note.source_type)}`}
            >
              {sourceIcon(note.source_type)}
              {note.source_type}
            </span>
          </div>

          <p className="text-muted-foreground text-base leading-relaxed mb-6 font-medium">
            {note.summary}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
            {note.topics && note.topics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {note.topics.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold border border-border/40"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic font-medium">No tags</span>
            )}

            {note.youtube_url && (
              <a
                href={note.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--accent-coral)] hover:underline text-sm font-bold transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                Watch YouTube video
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-[16px] bg-secondary border border-border/40 animate-memoria-fade-in stagger-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-xs md:text-sm font-bold transition-all flex-1 justify-center cursor-pointer
                ${activeTab === tab.key 
                  ? "bg-card text-[var(--accent-forest)] shadow-sm border border-border/20" 
                  : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.substring(0, 5)}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex flex-col gap-6 animate-memoria-fade-in stagger-3">
          {activeTab === "notes" && (
            <>
              {/* Key Points */}
              {note.key_points && note.key_points.length > 0 && (
                <div className="memoria-card-static">
                  <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                    Key Points
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {note.key_points.map((p, i) => (
                      <li key={i} className="flex gap-3 text-foreground text-sm leading-relaxed font-medium">
                        <span className="text-[var(--accent-forest)] font-mono font-bold flex-shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Structured Notes */}
              <div className="memoria-card-static">
                <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                  Structured Notes
                </h3>
                <div className="text-foreground text-sm leading-relaxed prose prose-sm max-w-none 
                  prose-headings:text-foreground prose-headings:font-bold prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
                  <ReactMarkdown>{note.notes}</ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {activeTab === "transcript" && (
            <div className="memoria-card-static">
              <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                Original Transcript
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium">
                {note.transcript || "No transcript available."}
              </p>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="memoria-card-static">
              <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                Exam Prep Questions
              </h3>
              {note.exam_questions && note.exam_questions.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {note.exam_questions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-foreground text-sm leading-relaxed font-medium">
                      <span className="text-[var(--accent-coral)] font-mono font-bold flex-shrink-0">
                        Q{String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm font-medium">No exam questions generated.</p>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <>
              {/* Action Items */}
              <div className="memoria-card-static">
                <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                  Action Items
                </h3>
                {note.action_items && note.action_items.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {note.action_items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-foreground text-sm leading-relaxed font-medium"
                      >
                        <ListChecks className="w-4 h-4 text-[var(--accent-green)] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span>{item.task}</span>
                          {item.priority && (
                            <span
                              className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                item.priority === "high"
                                  ? "bg-[var(--accent-peach)] text-[#B24C19] border-[rgba(178,76,25,0.15)]"
                                  : item.priority === "medium"
                                    ? "bg-[var(--accent-butter)] text-[#916E0A] border-[rgba(145,110,10,0.15)]"
                                    : "bg-secondary text-muted-foreground border-border"
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm font-medium">No action items found.</p>
                )}
              </div>

              {/* Reminders */}
              {note.reminders && note.reminders.length > 0 && (
                <div className="memoria-card-static">
                  <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                    Reminders
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {note.reminders.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-foreground text-sm leading-relaxed font-medium"
                      >
                        <Bell className="w-4 h-4 text-[var(--accent-yellow)] flex-shrink-0 mt-0.5" />
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Study Actions Bar */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 bg-card/90 backdrop-blur-md px-6 py-3 rounded-full border border-border/60 shadow-[var(--shadow-nav)] flex items-center gap-3 animate-memoria-slide-up">
        <span className="text-xs text-muted-foreground font-semibold hidden md:inline mr-2 border-r border-border/45 pr-4">
          Study Tools
        </span>
        <Link
          href={`/flashcards/${note.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-butter)] text-[#916E0A] rounded-full text-xs font-bold transition-all border border-[rgba(145,110,10,0.2)]"
        >
          <Layers className="w-3.5 h-3.5" />
          Flashcards
        </Link>
        <button
          onClick={() => setShowQuizModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-sky)] text-[#1C5F9B] rounded-full text-xs font-bold transition-all border border-[rgba(28,95,155,0.2)] cursor-pointer"
        >
          <Timer className="w-3.5 h-3.5" />
          Take Quiz
        </button>
      </div>

      {/* Quiz Count Modal */}
      <AnimatePresence>
        {showQuizModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuizModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-card border border-border rounded-[28px] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-6 relative animate-memoria-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowQuizModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-full cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center sm:text-left">
                <h3 className="text-foreground font-bold text-lg mb-1 flex items-center gap-2 justify-center sm:justify-start">
                  <Timer className="w-5 h-5 text-[var(--accent-blue)]" />
                  Quiz Mode Configuration
                </h3>
                <p className="text-muted-foreground text-xs font-semibold leading-normal">
                  How many questions would you like to answer in this timed quiz session?
                </p>
              </div>

              {/* Selection Bar */}
              <div className="flex justify-between gap-1.5 p-1 bg-secondary rounded-full border border-border/40">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuizQuestionsCount(count)}
                    className={`flex-1 py-2 text-center rounded-full text-xs font-bold transition-all cursor-pointer ${
                      quizQuestionsCount === count
                        ? "bg-[var(--accent-blue)] text-[#0B0B0F] shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {count}Q
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="flex-1 py-3 bg-secondary hover:bg-muted border border-border/40 text-foreground rounded-full text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowQuizModal(false)
                    router.push(`/quiz/${note.id}?questions=${quizQuestionsCount}`)
                  }}
                  className="flex-1 py-3 bg-[var(--accent-blue)] text-[#0B0B0F] rounded-full text-xs font-bold transition-colors cursor-pointer text-center shadow-md hover:opacity-90"
                >
                  Start Quiz
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
