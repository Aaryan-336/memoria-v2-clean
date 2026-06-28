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
  easy: "from-[var(--accent-green)]/12 to-[var(--accent-green)]/2 border-border/80",
  medium: "from-[var(--accent-blue)]/12 to-[var(--accent-blue)]/2 border-border/80",
  hard: "from-[var(--accent-coral)]/12 to-[var(--accent-coral)]/2 border-border/80",
}

const difficultyLabel: Record<string, string> = {
  easy: "bg-[rgba(212,237,218,0.4)] text-[rgb(20,85,45)] dark:text-[var(--accent-green)]",
  medium: "bg-[rgba(214,234,248,0.4)] text-[rgb(15,70,150)] dark:text-[var(--accent-blue)]",
  hard: "bg-[rgba(232,93,74,0.15)] text-[rgb(165,30,20)] dark:text-[var(--accent-coral)]",
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
      className={`break-inside-avoid mb-6 cursor-pointer relative w-full rounded-[24px] bg-gradient-to-br ${colors} border p-6 
        hover:scale-[1.01] hover:shadow-md transition-all duration-200 flex flex-col`}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${labelColor}`}
        >
          {card.difficulty}
        </span>
        {isReviewed ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-[var(--accent-green)]" />
        ) : (
          <Layers className="w-4 h-4 text-muted-foreground/60" />
        )}
      </div>
      <h3 className="text-foreground font-bold text-lg leading-snug mb-4 flex-1">
        {card.topic}
      </h3>
      <p className="text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">Click to study →</p>
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
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-5xl">
        {/* Header */}
        <div className="mb-6 animate-memoria-fade-in">
          <Link
            href="/flashcards"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Flashcards
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap animate-memoria-fade-in stagger-1">
          <div>
            <h1 className="text-foreground tracking-tight leading-tight mb-3">
              {noteTitle || "Flashcards"}
            </h1>
            {totalCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-semibold">
                  {totalCount} cards
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-[#8F6200] text-sm font-bold">
                  {reviewedCount} reviewed
                </span>
                {/* Progress bar */}
                <div className="w-28 h-2 bg-secondary rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-[var(--accent-yellow)] rounded-full transition-all duration-300"
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
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--accent-yellow)]/10 hover:bg-[var(--accent-yellow)]/20 text-[#8F6200] dark:text-[#FFD867] border border-[var(--accent-yellow)]/30 rounded-full text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
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
                ? "Regenerate Deck"
                : "Generate Flashcards"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20 animate-memoria-fade-in">
            <Loader2 className="w-8 h-8 text-[var(--accent-yellow)] animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Loading study materials…</p>
          </div>
        )}

        {/* Generating */}
        {generating && (
          <div className="flex flex-col items-center gap-4 py-20 animate-memoria-fade-in">
            <Loader2 className="w-8 h-8 text-[var(--accent-yellow)] animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">
              AI Coach is building your study deck…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !generating && flashcards.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-[24px] max-w-xl mx-auto p-8 shadow-[var(--shadow-card)] animate-memoria-fade-in stagger-2">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
            <h3 className="text-foreground font-semibold mb-2" style={{ fontSize: '1.125rem' }}>No flashcards yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create custom AI-generated flashcards to review this note.</p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-[var(--accent-yellow)] text-[#0B0B0F] rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md hover:opacity-90"
            >
              <Sparkles className="w-4 h-4" />
              Generate Flashcards
            </button>
          </div>
        )}

        {/* Grid of Preview Cards */}
        {!loading && !generating && flashcards.length > 0 && (
          <div
            className="columns-1 sm:columns-2 lg:columns-3 gap-6 animate-memoria-fade-in stagger-2"
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
      </div>

      {/* Focused study overlay modal */}
      <AnimatePresence>
        {activeCardIdx !== null && flashcards[activeCardIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-start md:justify-center overflow-y-auto py-16 px-4"
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
                className="absolute -top-12 right-2 sm:right-0 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted/50 rounded-full cursor-pointer"
                aria-label="Close study overlay"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 3D Flippable card wrapper with swipe gestures */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(event, info) => {
                  const swipe = info.offset.x
                  if (swipe < -80) {
                    handleNextCard()
                  } else if (swipe > 80) {
                    handlePrevCard()
                  }
                }}
                onTap={handleFlip}
                className="w-full h-auto cursor-pointer"
                style={{ perspective: "1000px" }}
              >
                <div
                  className="relative w-full h-auto transition-transform duration-600 ease-in-out"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transitionDuration: "600ms",
                  }}
                >
                  {/* Front face */}
                  <div
                    className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${
                      difficultyColor[flashcards[activeCardIdx].difficulty] || difficultyColor.medium
                    } border border-border/80 p-8 flex flex-col justify-between shadow-2xl min-h-[300px] sm:min-h-[380px]`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                    <p className="text-muted-foreground text-xs font-semibold text-center mt-auto">
                      Tap card to reveal answer →
                    </p>
                  </div>

                  {/* Back face */}
                  <div
                    className="relative w-full min-h-[300px] sm:min-h-[380px] rounded-[28px] bg-card border border-border p-8 flex flex-col justify-between shadow-2xl"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-6">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            difficultyLabel[flashcards[activeCardIdx].difficulty] || difficultyLabel.medium
                          }`}
                        >
                          {flashcards[activeCardIdx].difficulty}
                        </span>
                        <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)]" />
                      </div>
                      <h4 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-2">
                        {flashcards[activeCardIdx].topic}
                      </h4>
                      <p className="text-foreground text-base sm:text-lg leading-relaxed font-normal">
                        {flashcards[activeCardIdx].content}
                      </p>
                    </div>
                    <p className="text-muted-foreground/60 text-xs font-semibold text-center mt-6">
                      Tap card to flip back
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Navigation controls bar */}
              <div className="flex items-center justify-between mt-2 px-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrevCard}
                    className="p-3 bg-secondary hover:bg-muted border border-border/80 text-foreground rounded-full transition-colors cursor-pointer"
                    title="Previous card (Left Arrow)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextCard}
                    className="p-3 bg-secondary hover:bg-muted border border-border/80 text-foreground rounded-full transition-colors cursor-pointer"
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
                  className="px-5 py-2.5 bg-secondary hover:bg-muted border border-border/80 text-foreground rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  Flip (Space)
                </button>
              </div>

              {/* Tips help */}
              <p className="text-center text-muted-foreground/50 text-[11px] font-medium mt-1">
                Use Keyboard: Left/Right Arrow to navigate • Space to flip • Esc to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
