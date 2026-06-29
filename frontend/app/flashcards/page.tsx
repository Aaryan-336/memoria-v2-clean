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
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-5xl">
        {/* Header */}
        <div className="mb-10 animate-memoria-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-[var(--accent-yellow)]" />
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Study Deck
            </span>
          </div>
          <h1 className="text-foreground mb-2">Flashcards</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Create AI-powered interactive study cards from your records and notes to test your recall.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note, idx) => (
              <div
                key={note.id}
                className={`memoria-card group relative p-6 flex flex-col justify-between animate-memoria-fade-in stagger-${Math.min(idx + 1, 6)}`}
              >
                <div>
                  <h3 className="text-foreground font-semibold text-lg line-clamp-1 mb-2 group-hover:text-[var(--accent-yellow)] transition-colors">
                    {note.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 leading-relaxed">
                    {note.summary}
                  </p>
                </div>

                <div className="flex flex-col gap-4 mt-auto">
                  {note.topics && note.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-4">
                      {note.topics.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border/40"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerate(note.id)}
                      disabled={generating === note.id}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--accent-yellow)]/15 hover:bg-[var(--accent-yellow)]/25 text-[#855B00] dark:text-[#FFD254] border border-[var(--accent-yellow)]/40 rounded-full text-xs font-bold transition-all disabled:opacity-50 flex-1 justify-center cursor-pointer"
                    >
                      {generating === note.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {generating === note.id ? "Generating…" : "Generate"}
                    </button>
                    <Link
                      href={`/flashcards/${note.id}`}
                      className="flex items-center gap-1 px-4 py-2.5 bg-secondary hover:bg-muted text-foreground rounded-full text-xs font-bold transition-all border border-border/40 justify-center shrink-0"
                    >
                      View
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
