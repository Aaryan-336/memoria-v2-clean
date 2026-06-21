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
        <Loader2 className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">
          {generating ? "AI is generating your custom quiz..." : "Loading quiz..."}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 max-w-xl mx-auto flex flex-col justify-center items-center text-center gap-6">
        <XCircle className="w-16 h-16 text-red-500 opacity-80" />
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Quiz Generation Failed</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <button
          onClick={handleRetake}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white rounded-xl text-sm font-medium transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
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
      <div className="min-h-screen bg-background px-6 py-12 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-card border border-border rounded-full mb-4 shadow-sm">
            <Award className={`w-12 h-12 ${isPassing ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Quiz Completed!</h1>
          <p className="text-muted-foreground text-sm font-medium">{noteTitle}</p>
        </div>

        {/* Score Card */}
        <div className="p-6 rounded-2xl bg-card border border-border text-center mb-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          <div className="flex justify-around items-center gap-4 py-4">
            <div>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider block mb-1">
                Score
              </span>
              <span className="text-4xl font-extrabold text-foreground">
                {correctCount}
                <span className="text-muted-foreground/50 text-2xl"> / {questions.length}</span>
              </span>
            </div>
            <div className="w-px h-12 bg-border" />
            <div>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider block mb-1">
                Percentage
              </span>
              <span className={`text-4xl font-extrabold ${isPassing ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {percentage}%
              </span>
            </div>
            <div className="w-px h-12 bg-border" />
            <div>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider block mb-1">
                Time Taken
              </span>
              <span className="text-4xl font-extrabold text-foreground">
                {Math.floor(timeTaken / 60)}:
                {String(timeTaken % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-10">
          <button
            onClick={handleRetake}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-muted hover:bg-accent border border-border text-foreground hover:text-accent-foreground rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1"
          >
            <RotateCcw className="w-4 h-4" />
            Retake Quiz
          </button>
          <Link
            href="/quiz"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white rounded-xl text-sm font-semibold transition-all flex-1 shadow-sm shadow-cyan-600/10"
          >
            <BookOpen className="w-4 h-4" />
            Back to Quiz List
          </Link>
        </div>

        {/* Question Review */}
        <div className="space-y-4">
          <h3 className="text-muted-foreground font-semibold text-lg mb-2">Review Questions</h3>
          {questions.map((q, idx) => {
            const userAnswer = selectedAnswers[idx];
            const isCorrect = userAnswer === q.correct_answer;
            const isOpen = !!expandedQuestions[idx];

            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all ${
                  isCorrect
                    ? "bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-900/30"
                    : userAnswer === ""
                    ? "bg-muted/55 border-border"
                    : "bg-red-500/10 dark:bg-red-950/20 border-red-500/20 dark:border-red-900/30"
                }`}
              >
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-foreground/90 hover:text-foreground"
                >
                  <div className="flex items-start gap-3 pr-4">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <span>
                      <span className="text-muted-foreground mr-1.5 font-semibold">Q{idx + 1}.</span>
                      {q.question}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/50 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 mb-4">
                      {q.options.map((opt) => {
                        const isCorrectOpt = opt === q.correct_answer;
                        const isSelectedOpt = opt === userAnswer;

                        return (
                          <div
                            key={opt}
                            className={`p-2.5 rounded-lg border text-xs ${
                              isCorrectOpt
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : isSelectedOpt
                                ? "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300 font-semibold"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {opt}
                            {isCorrectOpt && " (Correct Answer)"}
                            {isSelectedOpt && !isCorrectOpt && " (Your Answer)"}
                          </div>
                        )
                      })}
                    </div>
                    {q.explanation && (
                      <div className="p-3 bg-muted rounded-lg text-muted-foreground border border-border/80">
                        <span className="font-semibold text-foreground block mb-1">Explanation</span>
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
    )
  }

  const currentQuestion = questions[currentIdx]
  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100)

  // Timer Bar Color
  const getTimerColor = () => {
    if (timeLeft > 15) return "bg-emerald-500"
    if (timeLeft > 7) return "bg-amber-500"
    return "bg-red-500 animate-pulse"
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 max-w-2xl mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/quiz"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Quit Quiz
        </Link>
        <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-xl text-sm font-semibold text-card-foreground shadow-sm">
          <TimerIcon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase mb-2">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-muted border border-border rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active Question Panel */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Timer countdown bar */}
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-8">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${getTimerColor()}`}
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground leading-snug">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 mb-8">
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedAnswers[currentIdx] === opt
            const hasAnswered = selectedAnswers[currentIdx] !== undefined

            return (
              <button
                key={opt}
                disabled={hasAnswered}
                onClick={() => handleSelectAnswer(opt)}
                className={`p-5 rounded-2xl text-left border text-sm font-medium transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-cyan-500/10 dark:bg-cyan-950/20 border-cyan-500 text-cyan-700 dark:text-cyan-300"
                    : hasAnswered
                    ? "bg-muted/40 border-border text-muted-foreground/60"
                    : "bg-card border-border hover:border-border/80 text-card-foreground hover:bg-muted/50 cursor-pointer shadow-sm"
                }`}
              >
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => handleNext(false)}
          disabled={selectedAnswers[currentIdx] === undefined}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-700 dark:hover:bg-cyan-600 disabled:bg-muted disabled:text-muted-foreground/50 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm shadow-cyan-600/10"
        >
          {currentIdx < questions.length - 1 ? "Next Question" : "Finish Quiz"}
        </button>
      </div>
    </div>
  )
}
