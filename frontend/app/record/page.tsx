"use client"
import { useState, useRef, useEffect } from "react"
import { Mic, Square, Loader2, CheckCircle, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher"

export default function RecordPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [timer, setTimer] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef = useRef("") // accumulate interim+final parts

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = async () => {
    setTranscript("")
    transcriptRef.current = ""
    setResult(null)
    setTimer(0)

    // --- Real-time speech recognition ---
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = "en-US"
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let finalSoFar = ""
        let interim = ""
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalSoFar += event.results[i][0].transcript + " "
          } else {
            interim += event.results[i][0].transcript
          }
        }
        transcriptRef.current = finalSoFar
        setTranscript((finalSoFar + interim).trim())
      }

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error)
      }

      recognitionRef.current = recognition
      recognition.start()
    } else {
      // Fallback: browser doesn't support Web Speech API
      setTranscript("(Your browser doesn't support live transcription. Speak and then generate notes.)")
    }

    // --- Keep mic stream open so browser shows recording indicator ---
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch {
      // mic denied — recognition may still work via its own permission
    }

    setRecording(true)
    intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  const stopRecording = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    // Stop mic stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    // Stop timer
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setRecording(false)
  }

  const generateNotes = async () => {
    if (!transcript) return
    setLoading(true)
    try {
      const data = await apiFetch<any>("/api/generate-notes", {
        method: "POST",
        body: JSON.stringify({
          transcript,
          source_type: "audio",
          workspace_id: currentWorkspace?.id || null
        })
      })
      setResult(data)
    } catch (e: any) {
      alert("Error generating notes: " + (e.message || e))
    }
    setLoading(false)
  }

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-2xl">
        {/* Header */}
        <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 animate-memoria-fade-in">
          <div>
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-foreground mb-2">Live Recording</h1>
            <p className="text-muted-foreground">Capture audio and let AI generate study materials instantly.</p>
          </div>
          <div className="flex items-center">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Recording Center Panel */}
        <div className="memoria-card-static flex flex-col items-center gap-6 p-8 mb-10 animate-memoria-fade-in stagger-1">
          <div 
            onClick={recording ? stopRecording : startRecording}
            className={`relative flex items-center justify-center w-28 h-28 rounded-full cursor-pointer transition-all duration-300 shadow-[var(--shadow-card)]
              ${recording 
                ? "bg-[rgba(232,93,74,0.1)] border-2 border-[var(--destructive)] text-[var(--destructive)]" 
                : "bg-secondary border border-border hover:border-[var(--accent-forest)] text-foreground"}`}
          >
            {recording
              ? <Square className="w-8 h-8 text-[var(--destructive)] fill-[var(--destructive)]" />
              : <Mic className="w-9 h-9" />}
            {recording && (
              <div className="absolute inset-0 rounded-full border-2 border-[var(--destructive)] animate-ping opacity-35" />
            )}
          </div>

          <div className="font-mono text-4xl text-foreground font-semibold tracking-tight">{fmt(timer)}</div>
          <div className="flex flex-col items-center gap-1">
            <span className={`text-sm font-semibold uppercase tracking-wider ${recording ? "text-[var(--destructive)] animate-pulse" : "text-muted-foreground"}`}>
              {recording ? "Recording Live" : "Microphone Ready"}
            </span>
            <p className="text-muted-foreground text-xs">{recording ? "Tap circle to stop recording" : "Tap circle to begin recording"}</p>
          </div>
        </div>

        {/* Live Transcript Input / Output */}
        {transcript && (
          <div className="mb-10 animate-memoria-fade-in stagger-2">
            <div className="flex items-center justify-between mb-4 gap-4">
              <h3 className="text-foreground text-lg font-semibold">Live Transcript</h3>
              <button 
                onClick={generateNotes} 
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-forest)] text-white rounded-full text-sm font-semibold transition-all disabled:opacity-50 shadow-md cursor-pointer hover:opacity-90"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Generate AI Notes
              </button>
            </div>
            <div className="p-6 rounded-[20px] bg-card border border-border text-foreground text-sm leading-relaxed whitespace-pre-wrap min-h-[120px] max-h-[300px] overflow-y-auto font-sans shadow-[var(--shadow-card)]">
              {transcript}
            </div>
          </div>
        )}

        {/* AI Processing Results */}
        {result && (
          <div className="flex flex-col gap-6 animate-memoria-fade-in stagger-3">
            <div className="p-4 rounded-full bg-[var(--accent-mint)] border border-[rgba(212,237,218,0.5)] text-[var(--accent-forest)] text-sm font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Note generated and saved to your library
            </div>

            <div className="memoria-card-static">
              <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-2">
                Title
              </h3>
              <p className="text-foreground font-bold text-lg">{result.ai?.title}</p>
            </div>

            <div className="memoria-card-static">
              <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-2">
                Summary
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{result.ai?.summary}</p>
            </div>

            <div className="memoria-card-static">
              <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-4 border-b border-border/40 pb-2">
                Key Points
              </h3>
              <ul className="flex flex-col gap-3">
                {result.ai?.key_points?.map((p: string, i: number) => (
                  <li key={i} className="flex gap-3 text-foreground text-sm leading-relaxed">
                    <span className="text-[var(--accent-forest)] font-mono font-bold flex-shrink-0">
                      {String(i+1).padStart(2,'0')}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
