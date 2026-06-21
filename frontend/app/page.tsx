"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mic, PlayCircle, BookOpen, MessageSquare, Brain, Zap, LogOut, Layers, Timer } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [notes, setNotes] = useState<any[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      apiFetch<{ notes: any[] }>("/api/notes")
        .then(d => setNotes(d.notes || []))
        .catch(() => {})
    }
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Brain className="w-8 h-8 text-blue-400 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-12 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-6 h-6 text-blue-400" />
            <span className="text-zinc-500 text-sm font-medium tracking-widest uppercase">Memoria AI</span>
          </div>
          <h1 className="text-4xl font-bold text-zinc-100 mb-3">Your Second Brain</h1>
          <p className="text-zinc-500 text-lg">Welcome back, {user.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 transition-all text-xs cursor-pointer font-medium mt-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-12">
        {[
          { icon: Mic, label: "Record Audio", desc: "Live transcription", href: "/record", color: "text-blue-400" },
          { icon: PlayCircle, label: "YouTube", desc: "Import any video", href: "/youtube", color: "text-red-400" },
          { icon: BookOpen, label: "My Notes", desc: `${notes.length} saved`, href: "/notes", color: "text-green-400" },
          { icon: MessageSquare, label: "Ask Memory", desc: "RAG-powered Q&A", href: "/ask", color: "text-purple-400" },
          { icon: Layers, label: "Flashcards", desc: "Study cards", href: "/flashcards", color: "text-amber-400" },
          { icon: Timer, label: "Quiz Mode", desc: "Test yourself", href: "/quiz", color: "text-cyan-400" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="group p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all hover:bg-zinc-800/80">
            <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
            <div className="text-zinc-100 font-semibold mb-1">{item.label}</div>
            <div className="text-zinc-500 text-sm">{item.desc}</div>
          </Link>
        ))}
      </div>

      {notes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-300 font-semibold">Recent Notes</h2>
            <Link href="/notes" className="text-blue-400 text-sm hover:text-blue-300">View all</Link>
          </div>
          <div className="flex flex-col gap-3">
            {notes.slice(0, 3).map((note: any) => (
              <Link key={note.id} href={`/notes/${note.id}`}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span className="text-zinc-100 font-medium text-sm">{note.title}</span>
                </div>
                <p className="text-zinc-500 text-sm line-clamp-2">{note.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {notes.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No notes yet. Start by recording or importing a video.</p>
        </div>
      )}
    </div>
  )
}
