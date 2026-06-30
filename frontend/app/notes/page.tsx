"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Mic, PlayCircle, FileText, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher"

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      setLoading(true)
      const url = currentWorkspace 
        ? `/api/notes?workspace_id=${currentWorkspace.id}`
        : `/api/notes?workspace_id=personal`
      apiFetch<{ notes: any[] }>(url)
        .then(d => { setNotes(d.notes || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [user, currentWorkspace])

  const sourceIcon = (type: string) => {
    if (type === "audio") return <Mic className="w-3.5 h-3.5" />
    if (type === "youtube") return <PlayCircle className="w-3.5 h-3.5" />
    return <FileText className="w-3.5 h-3.5" />
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  const sourceColor = (type: string) => {
    if (type === "audio") return "bg-card text-[var(--accent-forest)] border-[rgba(45,106,79,0.25)]"
    if (type === "youtube") return "bg-card text-[#B24C19] border-[rgba(178,76,25,0.25)]"
    return "bg-card text-[#6C5F8B] border-[rgba(108,95,139,0.25)]"
  }

  const sourceCardBg = (type: string) => {
    if (type === "audio") return "bg-[var(--accent-mint)] border-[rgba(45,106,79,0.15)]"
    if (type === "youtube") return "bg-[var(--accent-peach)] border-[rgba(178,76,25,0.15)]"
    return "bg-[var(--accent-lavender)] border-[rgba(108,95,139,0.15)]"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12">
        <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-memoria-fade-in">
          <div>
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-foreground mb-2">Notes Library</h1>
            <p className="text-muted-foreground">{notes.length} notes saved in this workspace</p>
          </div>
          <div className="flex items-center">
            <WorkspaceSwitcher />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-[24px] max-w-xl mx-auto p-8 animate-memoria-fade-in stagger-1 shadow-[var(--shadow-card)]">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-foreground font-semibold mb-2" style={{ fontSize: '1.125rem' }}>No notes yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Record audio or import a YouTube video to generate study materials.</p>
            <div className="flex justify-center gap-3">
              <Link href="/record" className="px-5 py-2.5 bg-[var(--accent-forest)] text-white font-semibold text-xs rounded-full hover:opacity-90 transition-all uppercase tracking-wider">
                Record Audio
              </Link>
              <Link href="/youtube" className="px-5 py-2.5 bg-secondary text-foreground font-semibold text-xs rounded-full hover:bg-secondary/80 transition-colors uppercase tracking-wider">
                YouTube Import
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notes.map((note: any, idx: number) => (
            <Link key={note.id} href={`/notes/${note.id}`}
              className={`memoria-card group flex flex-col justify-between ${sourceCardBg(note.source_type)} animate-memoria-fade-in stagger-${Math.min(idx + 1, 6)}`}>
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-foreground font-bold text-lg group-hover:text-[var(--accent-forest)] transition-colors line-clamp-1 leading-snug">
                    {note.title}
                  </h3>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 border ${sourceColor(note.source_type)}`}>
                    {sourceIcon(note.source_type)}
                    {note.source_type}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-6 leading-relaxed font-medium">
                  {note.summary}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
                <div className="flex flex-wrap gap-1.5 max-w-[85%]">
                  {(note.topics || []).slice(0, 3).map((t: string) => (
                    <span key={t} className="px-2.5 py-0.5 rounded-full bg-card/65 text-foreground text-xs font-semibold border border-border/30">
                      {t}
                    </span>
                  ))}
                  {(note.topics || []).length === 0 && (
                    <span className="text-xs text-muted-foreground italic font-medium">No topics</span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[var(--accent-forest)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
