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
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import type { Flashcard, GenerateFlashcardsResponse, FlashcardsResponse } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"

/* ── Color Theme Mappings ─────────────────────────────────── */

const difficultyColor: Record<string, string> = {
  easy: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 dark:border-emerald-500/20",
  medium: "from-blue-500/20 to-blue-600/5 border-blue-500/30 dark:border-blue-500/20",
  hard: "from-red-500/20 to-red-600/5 border-red-500/30 dark:border-red-500/20",
}

const difficultyLabel: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  hard: "bg-red-500/15 text-red-600 dark:text-red-400",
}

/* ── Grid Card Preview Component ─────────────────────────── */

function GridCard({
  card,
  isReviewed,
  onClick,
}: {
  card: Flashcard
  isReviewed: boolean
  onClick: () => void
}) {
  const colors = difficultyColor[card.difficulty] || difficultyColor.medium
  const labelColor = difficultyLabel[card.difficulty] || difficultyLabel.medium

  return (
    <motion.div
      layoutId={`card-container-${card.id}`}
      onClick={onClick}
      className={`break-inside-avoid mb-4 cursor-pointer relative w-full rounded-2xl bg-gradient-to-br ${colors} border p-6 
        hover:scale-[1.02] hover:shadow-md transition-all duration-300 flex flex-col`}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${labelColor}`}
        >
          {card.difficulty}
        </span>
        {isReviewed ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400" />
        ) : (
          <Layers className="w-4 h-4 text-muted-foreground/60" />
        )}
      </div>
      <h3 className="text-foreground font-bold text-lg leading-snug mb-3 flex-1">
        {card.topic}
      </h3>
      <p className="text-muted-foreground text-xs font-semibold">Click to study →</p>
    </motion.div>
  )
}

/* ── Main Page Component ───────────────────────────────────── */

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

  // Focus modal study state
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

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
    setActiveCardIdx(null)
    setIsFlipped(false)
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

  const handleFlip = () => {
    if (activeCardIdx === null) return
    const card = flashcards[activeCardIdx]
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
      setFlippedCards((prev) => {
        const next = new Set(prev)
        next.add(card.id)
        return next
      })
    }
  }

  const handleNextCard = () => {
    if (activeCardIdx === null || flashcards.length === 0) return
    setIsFlipped(false)
    setActiveCardIdx((prev) => (prev !== null && prev < flashcards.length - 1 ? prev + 1 : 0))
  }

  const handlePrevCard = () => {
    if (activeCardIdx === null || flashcards.length === 0) return
    setIsFlipped(false)
    setActiveCardIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : flashcards.length - 1))
  }

  // Keyboard Navigation
  useEffect(() => {
    if (activeCardIdx === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNextCard()
      } else if (e.key === "ArrowLeft") {
        handlePrevCard()
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        handleFlip()
      } else if (e.key === "Escape") {
        setActiveCardIdx(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeCardIdx, isFlipped, flashcards])

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

      {/* Grid of Preview Cards */}
      {!loading && !generating && flashcards.length > 0 && (
        <div
          className="columns-1 sm:columns-2 lg:columns-3 gap-4"
          style={{ columnFill: "balance" }}
        >
          {flashcards.map((card, idx) => (
            <GridCard
              key={card.id}
              card={card}
              isReviewed={flippedCards.has(card.id)}
              onClick={() => {
                setActiveCardIdx(idx)
                setIsFlipped(false)
              }}
            />
          ))}
        </div>
      )}

      {/* Focused study overlay modal */}
      <AnimatePresence>
        {activeCardIdx !== null && flashcards[activeCardIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
            onClick={() => setActiveCardIdx(null)}
          >
            {/* Centered card content card */}
            <div
              className="w-full max-w-xl flex flex-col gap-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setActiveCardIdx(null)}
                className="absolute -top-12 right-0 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted/50 rounded-full cursor-pointer"
                aria-label="Close study overlay"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 3D Flippable card wrapper */}
              <div
                className="w-full h-[380px] cursor-pointer"
                style={{ perspective: "1000px" }}
                onClick={handleFlip}
              >
                <div
                  className="relative w-full h-full transition-transform duration-600 ease-in-out"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transitionDuration: "600ms",
                  }}
                >
                  {/* Front face */}
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${
                      difficultyColor[flashcards[activeCardIdx].difficulty] || difficultyColor.medium
                    } border border-border/80 p-8 flex flex-col justify-between shadow-2xl`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          difficultyLabel[flashcards[activeCardIdx].difficulty] || difficultyLabel.medium
                        }`}
                      >
                        {flashcards[activeCardIdx].difficulty}
                      </span>
                      <Layers className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-foreground font-extrabold text-2xl sm:text-3xl leading-snug text-center px-4 my-auto">
                      {flashcards[activeCardIdx].topic}
                    </h3>
                    <p className="text-muted-foreground text-xs font-semibold text-center">
                      Tap card to flip and reveal details →
                    </p>
                  </div>

                  {/* Back face */}
                  <div
                    className="absolute inset-0 rounded-3xl bg-card border border-border p-8 flex flex-col justify-between shadow-2xl"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            difficultyLabel[flashcards[activeCardIdx].difficulty] || difficultyLabel.medium
                          }`}
                        >
                          {flashcards[activeCardIdx].difficulty}
                        </span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-550 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-2">
                        {flashcards[activeCardIdx].topic}
                      </h4>
                      <p className="text-card-foreground text-base sm:text-lg leading-relaxed font-normal">
                        {flashcards[activeCardIdx].content}
                      </p>
                    </div>
                    <p className="text-muted-foreground/60 text-xs font-semibold text-center mt-4">
                      Tap card to flip back
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation controls bar */}
              <div className="flex items-center justify-between mt-2 px-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevCard}
                    className="p-3 bg-muted hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-xl transition-colors cursor-pointer"
                    title="Previous card (Left Arrow)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextCard}
                    className="p-3 bg-muted hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-xl transition-colors cursor-pointer"
                    title="Next card (Right Arrow)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <span className="text-muted-foreground text-sm font-semibold">
                  Card {activeCardIdx + 1} of {flashcards.length}
                </span>

                <button
                  onClick={handleFlip}
                  className="px-5 py-2.5 bg-muted hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Flip (Space)
                </button>
              </div>

              {/* Tips help */}
              <p className="text-center text-muted-foreground/50 text-[11px] font-medium mt-1">
                Use Keyboard: Left/Right arrow to navigate • Space to flip • Esc to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
