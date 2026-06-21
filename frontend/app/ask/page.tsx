"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2, Brain } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { apiFetch } from "@/lib/api"

type Message = { role: "user" | "assistant"; content: string }

export default function AskPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput("")
    setMessages(m => [...m, { role: "user", content: q }])
    setLoading(true)
    try {
      const data = await apiFetch<{ answer: string }>("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: q })
      })
      setMessages(m => [...m, { role: "assistant", content: data.answer }])
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Error connecting to backend." }])
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
    <div className="min-h-screen bg-[#09090b] flex flex-col max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">Ask Memory</h1>
      <p className="text-zinc-500 mb-8">Ask anything about your past notes.</p>

      <div className="flex-1 flex flex-col gap-4 mb-6 min-h-[400px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Brain className="w-12 h-12 text-zinc-700" />
            <p className="text-zinc-600 text-sm">Your notes are ready to be queried.</p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {["What topics have I studied?", "Summarize my recent notes", "What are the key concepts?"].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm hover:border-zinc-700 hover:text-zinc-300 transition-all text-left">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${m.role === "user"
                ? "bg-blue-600 text-white rounded-br-sm"
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800">
              <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-3 sticky bottom-28">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about your notes…"
          className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm" />
        <button onClick={send} disabled={loading || !input.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
