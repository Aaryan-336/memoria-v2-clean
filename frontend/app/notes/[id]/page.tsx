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
      <div className="min-h-screen bg-background px-6 py-12 max-w-2xl mx-auto">
        <Link
          href="/notes"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notes
        </Link>
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Note not found.</p>
        </div>
      </div>
    )
  }

  const sourceIcon = (type: string) => {
    if (type === "audio") return <Mic className="w-3 h-3" />
    if (type === "youtube") return <PlayCircle className="w-3 h-3" />
    return <FileText className="w-3 h-3" />
  }

  const sourceColor = (type: string) => {
    if (type === "audio") return "text-blue-400 bg-blue-400/10"
    if (type === "youtube") return "text-red-400 bg-red-400/10"
    return "text-green-400 bg-green-400/10"
  }

  const tabs = [
    { key: "notes" as const, label: "Notes", icon: BookOpen },
    { key: "transcript" as const, label: "Transcript", icon: FileText },
    { key: "questions" as const, label: "Questions", icon: HelpCircle },
    { key: "actions" as const, label: "Actions", icon: ListChecks },
  ]

  return (
    <div className="min-h-screen bg-background px-6 py-12 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/notes"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notes
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-3xl font-bold text-foreground">{note.title}</h1>
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${sourceColor(note.source_type)}`}
          >
            {sourceIcon(note.source_type)}
            {note.source_type}
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {note.summary}
        </p>
        {note.topics && note.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.topics.map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full bg-muted text-card-foreground text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {note.youtube_url && (
          <a
            href={note.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Watch on YouTube
          </a>
        )}

        {/* Study Actions */}
        <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-border">
          <Link
            href={`/flashcards/${note.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl text-xs font-medium transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            Flashcards
          </Link>
          <Link
            href={`/quiz/${note.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-xl text-xs font-medium transition-all"
          >
            <Timer className="w-3.5 h-3.5" />
            Take Quiz
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-card border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
              ${activeTab === tab.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex flex-col gap-4">
        {activeTab === "notes" && (
          <>
            {/* Key Points */}
            {note.key_points && note.key_points.length > 0 && (
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                  Key Points
                </h3>
                <ul className="flex flex-col gap-2">
                  {note.key_points.map((p, i) => (
                    <li key={i} className="flex gap-3 text-card-foreground text-sm">
                      <span className="text-blue-400 font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Structured Notes */}
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Structured Notes
              </h3>
              <div className="text-card-foreground text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{note.notes}</ReactMarkdown>
              </div>
            </div>
          </>
        )}

        {activeTab === "transcript" && (
          <div className="p-5 rounded-2xl bg-card border border-border">
            <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Transcript
            </h3>
            <p className="text-card-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {note.transcript || "No transcript available."}
            </p>
          </div>
        )}

        {activeTab === "questions" && (
          <div className="p-5 rounded-2xl bg-card border border-border">
            <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Exam Questions
            </h3>
            {note.exam_questions && note.exam_questions.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {note.exam_questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-card-foreground text-sm">
                    <span className="text-purple-400 font-mono flex-shrink-0">
                      Q{String(i + 1).padStart(2, "0")}
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No exam questions generated.</p>
            )}
          </div>
        )}

        {activeTab === "actions" && (
          <>
            {/* Action Items */}
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Action Items
              </h3>
              {note.action_items && note.action_items.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {note.action_items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-card-foreground text-sm"
                    >
                      <ListChecks className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span>{item.task}</span>
                        {item.priority && (
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                              item.priority === "high"
                                ? "bg-red-400/10 text-red-400"
                                : item.priority === "medium"
                                  ? "bg-yellow-400/10 text-yellow-400"
                                  : "bg-muted text-muted-foreground"
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
                <p className="text-muted-foreground text-sm">No action items.</p>
              )}
            </div>

            {/* Reminders */}
            {note.reminders && note.reminders.length > 0 && (
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                  Reminders
                </h3>
                <ul className="flex flex-col gap-3">
                  {note.reminders.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-card-foreground text-sm"
                    >
                      <Bell className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
