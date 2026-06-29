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
  ExternalLink,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import type { Note } from "@/lib/types"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

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
    </div>
  )
}
