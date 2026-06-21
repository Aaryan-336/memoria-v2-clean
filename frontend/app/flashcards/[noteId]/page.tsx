"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Layers,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import type { Flashcard, GenerateFlashcardsResponse, FlashcardsResponse } from "@/lib/types"

/* ── Flip Card Component ───────────────────────────────────── */

function FlipCard({
  card,
  isFlipped,
  onFlip,
}: {
  card: Flashcard
  isFlipped: boolean
  onFlip: () => void
}) {
  const difficultyColor: Record<string, string> = {
    easy: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    medium: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    hard: "from-red-500/20 to-red-600/5 border-red-500/30",
  }

  const difficultyLabel: Record<string, string> = {
    easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    hard: "bg-red-500/15 text-red-600 dark:text-red-400",
  }

  const colors = difficultyColor[card.difficulty] || difficultyColor.medium
  const labelColor = difficultyLabel[card.difficulty] || difficultyLabel.medium

  return (
    <div
      className="break-inside-avoid mb-4 cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={onFlip}
    >
      <div
        className="relative w-full transition-transform duration-600 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionDuration: "600ms",
        }}
      >
        {/* ── Front Face ──────────────────────────────────── */}
        <div
          className={`relative w-full rounded-2xl bg-gradient-to-br ${colors} border p-6 
            hover:scale-[1.02] transition-transform`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}
            >
              {card.difficulty}
            </span>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-bold text-lg leading-snug mb-3">
            {card.topic}
          </h3>
          <p className="text-muted-foreground text-xs font-medium">Tap to reveal →</p>
        </div>

        {/* ── Back Face ───────────────────────────────────── */}
        <div
          className="absolute inset-0 w-full rounded-2xl bg-card border border-border p-6 overflow-auto shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}
            >
              {card.difficulty}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="text-muted-foreground font-semibold text-sm mb-3 uppercase tracking-wider">
            {card.topic}
          </h3>
          <p className="text-card-foreground text-sm leading-relaxed">{card.content}</p>
          <p className="text-muted-foreground/60 text-xs mt-4">Tap to flip back</p>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────── */

export default function FlashcardNotePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const noteId = params.noteId as string

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [noteTitle, setNoteTitle] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Fetch note title
  useEffect(() => {
    if (user && noteId) {
      apiFetch<{ notes: { id: string; title: string }[] }>("/api/notes")
        .then((d) => {
          const note = (d.notes || []).find((n) => n.id === noteId)
          if (note) setNoteTitle(note.title)
        })
        .catch(() => {})
    }
  }, [user, noteId])

  // Fetch flashcards
  useEffect(() => {
    if (user && noteId) {
      apiFetch<FlashcardsResponse>(`/api/flashcards/${noteId}`)
        .then((d) => {
          setFlashcards(d.flashcards || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [user, noteId])

  const handleGenerate = async () => {
    setGenerating(true)
    setFlippedCards(new Set())
    try {
      const data = await apiFetch<GenerateFlashcardsResponse>(
        "/api/flashcards/generate",
        {
          method: "POST",
          body: JSON.stringify({ note_id: noteId }),
        }
      )
      setFlashcards(data.flashcards || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate flashcards"
      alert(msg)
    }
    setGenerating(false)
  }

  const toggleFlip = (cardId: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  const reviewedCount = flippedCards.size
  const totalCount = flashcards.length

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 max-w-5xl mx-auto">
      {/* Header */}
      <Link
        href="/flashcards"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Flashcards
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {noteTitle || "Flashcards"}
          </h1>
          {totalCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm font-medium">
                {totalCount} cards
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-amber-500 dark:text-amber-400 text-sm font-medium">
                {reviewedCount} reviewed
              </span>
              {/* Progress bar */}
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-amber-600/10"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : flashcards.length > 0 ? (
            <RotateCcw className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating
            ? "Generating…"
            : flashcards.length > 0
              ? "Regenerate"
              : "Generate Flashcards"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading flashcards…</p>
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">
            AI is creating your flashcards…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !generating && flashcards.length === 0 && (
        <div className="text-center py-20 text-muted-foreground/60">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="mb-4">No flashcards yet for this note.</p>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate Flashcards
          </button>
        </div>
      )}

      {/* Masonry Grid */}
      {!loading && !generating && flashcards.length > 0 && (
        <div
          className="columns-1 sm:columns-2 lg:columns-3 gap-4"
          style={{ columnFill: "balance" }}
        >
          {flashcards.map((card) => (
            <FlipCard
              key={card.id}
              card={card}
              isFlipped={flippedCards.has(card.id)}
              onFlip={() => toggleFlip(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
