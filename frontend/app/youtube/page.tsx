"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlayCircle, Loader2, CheckCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"

export default function YouTubePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const process = async () => {
    if (!url) return
    setLoading(true)
    setError("")
    try {
      const data = await apiFetch<any>("/api/youtube", {
        method: "POST",
        body: JSON.stringify({ url })
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message || "Failed to process video")
    }
    setLoading(false)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">YouTube Import</h1>
      <p className="text-zinc-500 mb-10">Paste any YouTube URL to extract and summarize.</p>

      <div className="flex gap-3 mb-8">
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm" />
        <button onClick={process} disabled={loading || !url}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Process
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">{error}</div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-zinc-500 text-sm">Fetching transcript and generating notes…</p>
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
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Topics</h3>
            <div className="flex flex-wrap gap-2">
              {result.ai?.topics?.map((t: string) => (
                <span key={t} className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs">{t}</span>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            ✓ Note saved to your library
          </div>
        </div>
      )}
    </div>
  )
}
