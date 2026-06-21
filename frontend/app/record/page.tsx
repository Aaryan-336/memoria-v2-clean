"use client"
import { useState, useRef, useEffect } from "react"
import { Mic, Square, Loader2, CheckCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function RecordPage() {
  const { user, loading: authLoading } = useAuth()
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
        body: JSON.stringify({ transcript, source_type: "audio" })
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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">Live Recording</h1>
      <p className="text-zinc-500 mb-10">Record audio and generate AI notes instantly.</p>

      <div className="flex flex-col items-center gap-6 mb-10">
        <div className={`relative flex items-center justify-center w-28 h-28 rounded-full cursor-pointer transition-all
          ${recording ? "bg-red-500/20 border-2 border-red-500" : "bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-500"}`}
          onClick={recording ? stopRecording : startRecording}>
          {recording
            ? <Square className="w-10 h-10 text-red-400" />
            : <Mic className="w-10 h-10 text-zinc-300" />}
          {recording && <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30" />}
        </div>
        <div className="font-mono text-3xl text-zinc-300">{fmt(timer)}</div>
        <p className="text-zinc-500 text-sm">{recording ? "Recording… tap to stop" : "Tap to start recording"}</p>
      </div>

      {transcript && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-zinc-300 font-semibold">Transcript</h2>
            <button onClick={generateNotes} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Generate Notes
            </button>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm leading-relaxed">
            {transcript}
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">Title</h3>
            <p className="text-zinc-100 font-semibold">{result.ai?.title}</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">Summary</h3>
            <p className="text-zinc-300 text-sm leading-relaxed">{result.ai?.summary}</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Key Points</h3>
            <ul className="flex flex-col gap-2">
              {result.ai?.key_points?.map((p: string, i: number) => (
                <li key={i} className="flex gap-3 text-zinc-300 text-sm">
                  <span className="text-blue-400 font-mono">{String(i+1).padStart(2,'0')}</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            ✓ Note saved to your library
          </div>
        </div>
      )}
    </div>
  )
}
