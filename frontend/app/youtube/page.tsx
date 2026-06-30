"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlayCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher"

export default function YouTubePage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace } = useWorkspace()
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
      // Step 1: Fetch transcript via Vercel serverless function
      // (Vercel's IPs are not blocked by YouTube, unlike Render's)
      let transcript = ""
      try {
        const transcriptRes = await fetch("/api/youtube-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const transcriptData = await transcriptRes.json()
        if (transcriptRes.ok && transcriptData.transcript) {
          transcript = transcriptData.transcript
        }
      } catch {
        // If Vercel transcript fetch fails, let the backend try its own fetch
        console.warn("Frontend transcript fetch failed, falling back to backend")
      }

      // Step 2: Send URL + transcript to the backend for AI processing
      const data = await apiFetch<any>("/api/youtube", {
        method: "POST",
        body: JSON.stringify({
          url,
          workspace_id: currentWorkspace?.id || null,
          transcript: transcript || null,
        })
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message || "Failed to process video")
    }
    setLoading(false)
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
      <div className="memoria-container py-8 lg:py-12 max-w-2xl">
        {/* Header */}
        <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 animate-memoria-fade-in">
          <div>
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-foreground mb-2">YouTube Import</h1>
            <p className="text-muted-foreground">Paste a YouTube video URL to automatically transcribe and summarize it.</p>
          </div>
          <div className="flex items-center">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Input area */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-memoria-fade-in stagger-1">
          <div
            className="flex-1 flex items-center gap-3 px-5 rounded-[28px] bg-card border border-border focus-within:border-[var(--accent-forest)] focus-within:shadow-[0_0_0_3px_rgba(45,106,79,0.08)] transition-all"
            style={{ height: "56px" }}
          >
            <PlayCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
            />
            {url && (
              <button
                onClick={() => setUrl("")}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={process}
            disabled={loading || !url}
            className="px-6 rounded-[28px] text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            style={{
              height: "56px",
              background: "var(--accent-forest)",
              color: "#FFFFFF",
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Import
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-full bg-[rgba(232,93,74,0.08)] border border-[rgba(232,93,74,0.2)] text-[var(--destructive)] text-sm font-semibold text-center mb-6 animate-memoria-fade-in">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-16 animate-memoria-fade-in">
            <Loader2 className="w-8 h-8 text-[var(--accent-forest)] animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Fetching transcripts and generating AI insights…</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-6 animate-memoria-fade-in stagger-2">
            <div className="p-4 rounded-full bg-[var(--accent-mint)] border border-[rgba(212,237,218,0.5)] text-[var(--accent-forest)] text-sm font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Video processed and saved to your library
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

            <div className="memoria-card-static">
              <h3 className="text-[var(--accent-forest)] text-xs font-bold uppercase tracking-wider mb-3">
                Topics & Keywords
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.ai?.topics?.map((t: string) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border/40"
                  >
                    {t}
                  </span>
                ))}
                {(!result.ai?.topics || result.ai.topics.length === 0) && (
                  <span className="text-xs text-muted-foreground italic">No topics extracted</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
