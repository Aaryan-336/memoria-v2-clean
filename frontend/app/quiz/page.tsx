"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Timer, Loader2, BookOpen, ArrowRight, Zap } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import type { Note } from "@/lib/types"

export default function QuizPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      apiFetch<{ notes: Note[] }>("/api/notes")
        .then((d) => {
          setNotes(d.notes || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [user])

  const getQuestionCount = (noteId: string) => selectedQuestions[noteId] || 10

  const setQuestionCount = (noteId: string, count: number) => {
    setSelectedQuestions((prev) => ({ ...prev, [noteId]: count }))
  }

  const startQuiz = (noteId: string) => {
    const count = getQuestionCount(noteId)
    router.push(`/quiz/${noteId}?questions=${count}`)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-10 animate-memoria-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-[var(--accent-blue)]" />
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Test Yourself
            </span>
          </div>
          <h1 className="text-foreground mb-2">Quiz Mode</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Challenge your understanding with custom AI-generated timed quizzes generated directly from your saved memories.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-[24px] max-w-xl mx-auto p-8 shadow-[var(--shadow-card)] animate-memoria-fade-in stagger-1">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
            <h3 className="text-foreground font-semibold mb-2" style={{ fontSize: '1.125rem' }}>No notes available</h3>
            <p className="text-muted-foreground text-sm">Please record an audio file or import a YouTube video first to generate study materials.</p>
          </div>
        )}

        {!loading && notes.length > 0 && (
          <div className="flex flex-col gap-6">
            {notes.map((note, idx) => (
              <div
                key={note.id}
                className={`memoria-card group p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 animate-memoria-fade-in stagger-${Math.min(idx + 1, 6)}`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-semibold text-lg truncate mb-1.5 group-hover:text-[var(--accent-blue)] transition-colors">
                    {note.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-1 mb-4 leading-relaxed">
                    {note.summary}
                  </p>
                  {note.topics && note.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {note.topics.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border/40"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 self-start sm:self-center">
                  {/* Question count selector */}
                  <div className="flex items-center gap-1 bg-secondary rounded-full p-1 border border-border/40">
                    {[5, 10, 15].map((count) => (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(note.id, count)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          getQuestionCount(note.id) === count
                            ? "bg-[var(--accent-blue)] text-[#0B0B0F] shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {count}Q
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => startQuiz(note.id)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 text-[#2B7ECF] dark:text-[#8BC5FF] border border-[var(--accent-blue)]/30 rounded-full text-xs font-bold transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Start
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
