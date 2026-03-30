"use client"
import { useEffect, useState } from "react"
import { BookOpen, Mic, PlayCircle, FileText, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("http://localhost:8000/api/notes/user_demo")
      .then(r => r.json())
      .then(d => { setNotes(d.notes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const sourceIcon = (type: string) => {
    if (type === "audio") return <Mic className="w-3 h-3" />
    if (type === "youtube") return <PlayCircle className="w-3 h-3" />
    return <FileText className="w-3 h-3" />
  }

  const sourceColor = (type: string) => {
    if (type === "audio") return "text-blue-400 bg-blue-400/10"
    if (type === "youtube") return "text-red-400 bg-red-400/10"
    return "text-green-400 bg-green-400/10"
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Notes Library</h1>
          <p className="text-zinc-500">{notes.length} notes saved</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No notes yet. Record audio or import a YouTube video.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {notes.map((note: any) => (
          <Link key={note.id} href={`/notes/${note.id}`}
            className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-zinc-100 font-semibold group-hover:text-white transition-colors">{note.title}</h3>
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${sourceColor(note.source_type)}`}>
                {sourceIcon(note.source_type)}
                {note.source_type}
              </span>
            </div>
            <p className="text-zinc-500 text-sm line-clamp-2 mb-3">{note.summary}</p>
            <div className="flex flex-wrap gap-2">
              {(note.topics || []).slice(0, 3).map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
