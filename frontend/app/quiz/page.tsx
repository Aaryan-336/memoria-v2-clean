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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-12 max-w-4xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-6 h-6 text-cyan-400" />
          <span className="text-zinc-500 text-sm font-medium tracking-widest uppercase">
            Test Yourself
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Quiz Mode</h1>
        <p className="text-zinc-500">
          AI-generated timed quizzes from your notes. Select a note and start.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No notes yet. Record audio or import a YouTube video first.</p>
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="flex flex-col gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-zinc-100 font-semibold mb-1 truncate">
                    {note.title}
                  </h3>
                  <p className="text-zinc-500 text-sm line-clamp-1 mb-3">
                    {note.summary}
                  </p>
                  {note.topics && note.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {note.topics.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Question count selector */}
                  <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-1">
                    {[5, 10, 15].map((count) => (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(note.id, count)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          getQuestionCount(note.id) === count
                            ? "bg-cyan-600 text-white"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {count}Q
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => startQuiz(note.id)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    Start
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
