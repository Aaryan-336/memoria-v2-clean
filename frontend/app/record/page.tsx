"use client"
import { useState, useRef } from "react"
import { Mic, Square, Loader2, CheckCircle } from "lucide-react"

export default function RecordPage() {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [timer, setTimer] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<any>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      mr.start()
      setRecording(true)
      setTimer(0)
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000)
      // Demo transcript after 3s
      setTimeout(() => {
        setTranscript("Machine learning is a subset of artificial intelligence that enables systems to learn from data. Neural networks are inspired by the human brain and consist of layers of interconnected nodes. Deep learning uses multiple layers to extract features automatically. Key algorithms include gradient descent, backpropagation, and attention mechanisms.")
      }, 3000)
    } catch {
      setTranscript("Microphone access denied. Using demo transcript instead.")
      setRecording(true)
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    clearInterval(intervalRef.current)
    setRecording(false)
  }

  const generateNotes = async () => {
    if (!transcript) return
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, user_id: "user_demo", source_type: "audio" })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      alert("Error connecting to backend")
    }
    setLoading(false)
  }

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

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
