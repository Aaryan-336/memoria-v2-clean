"use client"
import { useState } from "react"
import { Search, Loader2, FileText } from "lucide-react"
import Link from "next/link"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}&user_id=user_demo`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">Search</h1>
      <p className="text-zinc-500 mb-8">Search across all your notes.</p>

      <div className="flex gap-3 mb-8">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 transition-all">
          <Search className="w-4 h-4 text-zinc-600 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Search notes…"
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm" />
        </div>
        <button onClick={search} disabled={loading || !query.trim()}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <FileText className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No results found for "{query}"</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {results.map((note: any) => (
          <Link key={note.id} href={`/notes/${note.id}`}
            className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all">
            <h3 className="text-zinc-100 font-semibold mb-2">{note.title}</h3>
            <p className="text-zinc-500 text-sm line-clamp-2">{note.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
