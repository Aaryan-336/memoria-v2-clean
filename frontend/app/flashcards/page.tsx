"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Layers, Loader2, BookOpen, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import type { Note } from "@/lib/types"

export default function FlashcardsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

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

  const handleGenerate = async (noteId: string) => {
    setGenerating(noteId)
    try {
      await apiFetch("/api/flashcards/generate", {
        method: "POST",
        body: JSON.stringify({ note_id: noteId }),
      })
      router.push(`/flashcards/${noteId}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate flashcards"
      alert(msg)
    }
    setGenerating(null)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 max-w-4xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-6 h-6 text-amber-400" />
          <span className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
            Study Cards
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Flashcards</h1>
        <p className="text-muted-foreground">
          Generate AI-powered flashcards from your notes. Select a note to get started.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-center py-20 text-muted-foreground/60">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No notes yet. Record audio or import a YouTube video first.</p>
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative p-5 rounded-2xl bg-card border border-border hover:border-border/80 transition-all flex flex-col shadow-sm"
            >
              {/* Note Info */}
              <h3 className="text-card-foreground font-semibold mb-2 line-clamp-2">
                {note.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                {note.summary}
              </p>
              {note.topics && note.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {note.topics.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(note.id)}
                  disabled={generating === note.id}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 dark:text-amber-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex-1 justify-center cursor-pointer"
                >
                  {generating === note.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {generating === note.id ? "Generating…" : "Generate"}
                </button>
                <Link
                  href={`/flashcards/${note.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-accent hover:text-accent-foreground text-card-foreground rounded-xl text-sm font-medium transition-all"
                >
                  View
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
