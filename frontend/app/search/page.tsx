"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, FileText } from "lucide-react"
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
    <div className="min-h-screen bg-background px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Search</h1>
      <p className="text-muted-foreground mb-8">Search across all your notes.</p>

      <div className="flex gap-3 mb-8">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border focus-within:border-accent transition-all">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Search notes…"
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm" />
        </div>
        <button onClick={search} disabled={loading || !query.trim()}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No results found for &quot;{query}&quot;</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {results.map((note: any) => (
          <Link key={note.id} href={`/notes/${note.id}`}
            className="p-5 rounded-2xl bg-card border border-border hover:border-accent transition-all">
            <h3 className="text-foreground font-semibold mb-2">{note.title}</h3>
            <p className="text-muted-foreground text-sm line-clamp-2">{note.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
