"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, FileText, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await apiFetch<any>(`/api/search?q=${encodeURIComponent(query)}`)
      setResults(data.results || [])
    } catch {
      setResults([])
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
      <div className="memoria-container py-8 lg:py-12 max-w-3xl">

        {/* Header */}
        <div className="mb-8 animate-memoria-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-[var(--accent-forest)]" />
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              Search
            </span>
          </div>
          <h1 className="text-foreground mb-2">Search Memories</h1>
          <p className="text-muted-foreground text-sm">
            Find anything across all your notes and memories.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3 mb-8 animate-memoria-fade-in stagger-1">
          <div
            className="flex-1 flex items-center gap-3 px-5 rounded-[28px] bg-card border border-border focus-within:border-[var(--accent-forest)] focus-within:shadow-[0_0_0_3px_rgba(45,106,79,0.08)] transition-all"
            style={{ height: "56px" }}
          >
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search your memories..."
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="px-6 rounded-[28px] text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
            style={{
              height: "56px",
              background: "var(--accent-forest)",
              color: "#FFFFFF",
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {/* Empty / No Results */}
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-20 animate-memoria-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-5">
              <FileText className="w-7 h-7 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-foreground font-semibold mb-2" style={{ fontSize: '1.125rem' }}>
              No results found
            </h3>
            <p className="text-muted-foreground text-sm">
              No memories match &quot;{query}&quot;. Try a different search term.
            </p>
          </div>
        )}

        {/* Results */}
        <div className="flex flex-col gap-3">
          {results.map((note: any, idx: number) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className={`memoria-card group flex items-start gap-4 p-6 animate-memoria-fade-in stagger-${Math.min(idx + 1, 6)}`}
            >
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-mint)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-[var(--accent-forest)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-semibold mb-1.5 group-hover:text-[var(--accent-forest)] transition-colors" style={{ fontSize: '1rem' }}>
                  {note.title}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2">{note.summary}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Idle State (before search) */}
        {!searched && (
          <div className="text-center py-16 animate-memoria-fade-in stagger-2">
            <div className="w-16 h-16 rounded-3xl bg-[var(--accent-mint)] flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-7 h-7 text-[var(--accent-forest)] opacity-60" />
            </div>
            <h3 className="text-foreground font-semibold mb-2" style={{ fontSize: '1.125rem' }}>
              Search your knowledge
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Type a query above to find notes, memories, and insights across your entire library.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
