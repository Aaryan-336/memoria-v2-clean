"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  Loader2,
  ArrowLeft,
  Timer as TimerIcon,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import type { QuizQuestion, QuizResponse } from "@/lib/types"

export default function QuizSessionPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const noteId = params.noteId as string
  const questionCount = parseInt(searchParams.get("questions") || "10", 10)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [noteTitle, setNoteTitle] = useState("Quiz")
  const [error, setError] = useState<string | null>(null)

  // Quiz State
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [isFinished, setIsFinished] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({})

  // Timer State
  const [timeLeft, setTimeLeft] = useState(30)
  const [timeTaken, setTimeTaken] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const fetchQuiz = async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await apiFetch<QuizResponse>("/api/quiz/generate", {
        method: "POST",
        body: JSON.stringify({
          note_id: noteId,
          num_questions: questionCount,
        }),
      })
      if (data.success && data.questions) {
        setQuestions(data.questions)
        setNoteTitle(data.note_title || "Quiz")
      } else {
        setError("Failed to generate quiz questions.")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load quiz")
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && noteId) {
      fetchQuiz()
    }
  }, [user, noteId])

  // Total timer increment
  useEffect(() => {
    if (!loading && !generating && !isFinished && questions.length > 0) {
      totalTimerRef.current = setInterval(() => {
        setTimeTaken((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current)
    }
  }, [loading, generating, isFinished, questions])

  // Question countdown timer
  useEffect(() => {
    if (!loading && !generating && !isFinished && questions.length > 0) {
      setTimeLeft(30) // Reset timer for new question
      if (timerRef.current) clearInterval(timerRef.current)
 
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Auto advance
            handleNext(true)
            return 30
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIdx, loading, generating, isFinished, questions])

  const handleSelectAnswer = (option: string) => {
    if (selectedAnswers[currentIdx] !== undefined) return // Already answered
    setSelectedAnswers((prev) => ({ ...prev, [currentIdx]: option }))
  }

  const handleNext = (timedOut = false) => {
    // If no answer selected and not timed out, do nothing
    if (selectedAnswers[currentIdx] === undefined && !timedOut) {
      // Mark as unanswered
      setSelectedAnswers((prev) => ({ ...prev, [currentIdx]: "" }))
    }

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1)
    } else {
      setIsFinished(true)
      if (timerRef.current) clearInterval(timerRef.current)
      if (totalTimerRef.current) clearInterval(totalTimerRef.current)
    }
  }

  const handleRetake = () => {
    setCurrentIdx(0)
    setSelectedAnswers({})
    setIsFinished(false)
    setTimeTaken(0)
    setLoading(true)
    fetchQuiz()
  }

  const toggleExpand = (idx: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-[var(--accent-blue)] animate-spin" />
        <p className="text-muted-foreground text-sm font-semibold">
          {generating ? "AI is generating your custom quiz..." : "Loading quiz details..."}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="memoria-container px-6 py-12 max-w-xl text-center flex flex-col items-center gap-6">
          <XCircle className="w-16 h-16 text-[var(--accent-coral)] opacity-80 animate-memoria-scale-in" />
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Quiz Generation Failed</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{error}</p>
          </div>
          <button
            onClick={handleRetake}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--accent-blue)]/15 hover:bg-[var(--accent-blue)]/25 text-[#1A5FA0] border border-[var(--accent-blue)]/40 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Quiz completed results processing
  if (isFinished) {
    const correctCount = questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correct_answer ? 1 : 0)
    }, 0)
    const percentage = Math.round((correctCount / questions.length) * 100)
    const isPassing = percentage >= 80

    return (
      <div className="min-h-screen bg-background">
        <div className="memoria-container py-8 lg:py-12 max-w-2xl">
          <div className="text-center mb-10 animate-memoria-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-card border border-border rounded-full mb-4 shadow-sm">
              <Award className={`w-12 h-12 ${isPassing ? "text-[var(--accent-yellow)]" : "text-muted-foreground opacity-60"}`} />
            </div>
            <h1 className="text-foreground tracking-tight mb-2">Quiz Completed!</h1>
            <p className="text-muted-foreground text-sm font-semibold leading-relaxed">{noteTitle}</p>
          </div>

          {/* Score Card */}
          <div className="memoria-card-static relative overflow-hidden p-6 mb-8 shadow-[var(--shadow-card)] animate-memoria-fade-in stagger-1">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-blue)]" />
            <div className="flex justify-around items-center gap-4 py-4 flex-wrap sm:flex-nowrap">
              <div className="text-center">
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block mb-1">
                  Score
                </span>
                <span className="text-3xl font-extrabold text-foreground">
                  {correctCount}
                  <span className="text-muted-foreground/50 text-xl font-medium"> / {questions.length}</span>
                </span>
              </div>
              <div className="hidden sm:block w-px h-12 bg-border/50" />
              <div className="text-center">
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block mb-1">
                  Percentage
                </span>
                <span className={`text-3xl font-extrabold ${isPassing ? "text-[var(--accent-green)]" : "text-foreground"}`}>
                  {percentage}%
                </span>
              </div>
              <div className="hidden sm:block w-px h-12 bg-border/50" />
              <div className="text-center">
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block mb-1">
                  Time Taken
                </span>
                <span className="text-3xl font-extrabold text-foreground">
                  {Math.floor(timeTaken / 60)}:
                  {String(timeTaken % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-10 animate-memoria-fade-in stagger-2">
            <button
              onClick={handleRetake}
              className="flex items-center justify-center gap-1.5 px-5 py-3 bg-secondary hover:bg-muted border border-border/40 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer flex-1"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
            <Link
              href="/quiz"
              className="flex items-center justify-center gap-1.5 px-5 py-3 bg-[var(--accent-blue)]/15 hover:bg-[var(--accent-blue)]/25 text-[#1A5FA0] border border-[var(--accent-blue)]/40 rounded-full text-xs font-bold transition-all flex-1 shadow-sm text-center"
            >
              <BookOpen className="w-4 h-4" />
              Quiz Library
            </Link>
          </div>

          {/* Question Review */}
          <div className="space-y-4 animate-memoria-fade-in stagger-3">
            <h3 className="text-foreground font-bold text-lg mb-2">Review Questions</h3>
            {questions.map((q, idx) => {
              const userAnswer = selectedAnswers[idx]
              const isCorrect = userAnswer === q.correct_answer
              const isOpen = !!expandedQuestions[idx]

              return (
                <div
                  key={idx}
                  className={`rounded-[18px] border transition-all ${
                    isCorrect
                      ? "bg-[rgba(76,175,125,0.08)] border-[rgba(76,175,125,0.25)]"
                      : userAnswer === ""
                      ? "bg-secondary border-border/50"
                      : "bg-[rgba(224,75,56,0.08)] border-[rgba(224,75,56,0.25)]"
                  }`}
                >
                  <button
                    onClick={() => toggleExpand(idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-foreground/90 hover:text-foreground cursor-pointer"
                  >
                    <div className="flex items-start gap-3 pr-4">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)] mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[var(--accent-coral)] mt-0.5 flex-shrink-0" />
                      )}
                      <span>
                        <span className="text-muted-foreground mr-1.5 font-bold">Q{idx + 1}.</span>
                        {q.question}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/40 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2 mb-4">
                        {q.options.map((opt) => {
                          const isCorrectOpt = opt === q.correct_answer
                          const isSelectedOpt = opt === userAnswer

                          return (
                            <div
                              key={opt}
                              className={`p-3 rounded-full border text-xs leading-relaxed ${
                                isCorrectOpt
                                  ? "bg-[rgba(76,175,125,0.12)] border-[rgba(76,175,125,0.35)] text-[rgb(20,100,55)] font-bold"
                                  : isSelectedOpt
                                  ? "bg-[rgba(224,75,56,0.12)] border-[rgba(224,75,56,0.35)] text-[rgb(180,40,30)] font-bold"
                                  : "bg-secondary/60 border-border text-muted-foreground"
                              }`}
                            >
                              {opt}
                              {isCorrectOpt && " (Correct)"}
                              {isSelectedOpt && !isCorrectOpt && " (You)"}
                            </div>
                          )
                        })}
                      </div>
                      {q.explanation && (
                        <div className="p-4 bg-secondary rounded-[16px] text-muted-foreground border border-border/40 leading-relaxed text-xs">
                          <span className="font-bold text-foreground block mb-1">Explanation</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIdx]
  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100)

  // Timer Bar Color
  const getTimerColor = () => {
    if (timeLeft > 15) return "bg-[var(--accent-green)]"
    if (timeLeft > 7) return "bg-[var(--accent-yellow)]"
    return "bg-[var(--accent-coral)] animate-pulse"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-2xl flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-memoria-fade-in">
          <Link
            href="/quiz"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Quit Quiz
          </Link>
          <div className="flex items-center gap-1.5 bg-card border border-border px-4 py-2 rounded-full text-xs font-bold text-foreground shadow-sm">
            <TimerIcon className="w-4 h-4 text-[var(--accent-blue)]" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 animate-memoria-fade-in stagger-1">
          <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase mb-2">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-secondary border border-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-blue)] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Active Question Panel */}
        <div className="flex-1 flex flex-col justify-center animate-memoria-fade-in stagger-2">
          {/* Timer countdown bar */}
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden mb-8">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${getTimerColor()}`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>

          <div className="mb-8">
            <h2 className="text-foreground tracking-tight leading-snug font-bold">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3.5 mb-8">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedAnswers[currentIdx] === opt
              const hasAnswered = selectedAnswers[currentIdx] !== undefined

              return (
                <button
                  key={opt}
                  disabled={hasAnswered}
                  onClick={() => handleSelectAnswer(opt)}
                  className={`p-5 rounded-[20px] text-left border text-sm font-semibold transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-[rgba(58,143,214,0.12)] border-[var(--accent-blue)] text-[#1A5FA0] font-bold"
                      : hasAnswered
                      ? "bg-secondary/40 border-border/40 text-muted-foreground/60"
                      : "bg-card border-border hover:border-[var(--accent-blue)] text-foreground hover:bg-[rgba(58,143,214,0.06)] cursor-pointer shadow-sm"
                  }`}
                >
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-end animate-memoria-fade-in stagger-3">
          <button
            onClick={() => handleNext(false)}
            disabled={selectedAnswers[currentIdx] === undefined}
            className="px-6 py-3 bg-[var(--accent-blue)] text-white disabled:bg-secondary disabled:text-muted-foreground/40 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md disabled:shadow-none"
          >
            {currentIdx < questions.length - 1 ? "Next Question" : "Finish Quiz"}
          </button>
        </div>
      </div>
    </div>
  )
}
