"use client"
import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Home,
  Search,
  MessageSquare,
  BookOpen,
  User,
  Layers,
  Timer,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

/* ── Navigation Items ── */

interface NavItemType {
  icon: React.ElementType
  label: string
  href: string
  color?: string
}

const navItems: NavItemType[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: MessageSquare, label: "AI", href: "/ask" },
  { icon: BookOpen, label: "Notes", href: "/notes" },
  { icon: User, label: "Profile", href: "/settings/billing" },
]

/* ── Bottom Nav Item ── */

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  color,
  noteId,
}: {
  icon: React.ElementType
  label: string
  href: string
  active: boolean
  color?: string
  noteId?: string | null
}) {
  const displayColor = color || "var(--accent-forest)"
  const [showPill, setShowPill] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!showPill) return
    const handleClickOutside = (event: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(event.target as Node)) {
        setShowPill(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showPill])

  const handleQuizClick = (e: React.MouseEvent) => {
    if (label === "Quiz" && noteId) {
      e.preventDefault()
      e.stopPropagation()
      setShowPill(!showPill)
    }
  }

  return (
    <div className="relative flex-1 flex justify-center min-w-0" ref={pillRef}>
      <Link
        href={href}
        onClick={handleQuizClick}
        className={cn(
          "relative flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all duration-200 w-full"
        )}
        style={{
          color: active ? displayColor : color || "var(--muted-foreground)",
          opacity: active ? 1 : color ? 0.75 : 0.65
        }}
      >
        <Icon
          className="w-5 h-5 transition-colors"
          style={{ color: active ? displayColor : color || undefined }}
        />
        <span
          className="text-[10px] font-semibold transition-colors"
        >
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="dock-active-indicator"
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-[var(--accent-forest)]"
            style={{ backgroundColor: displayColor }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </Link>

      {/* Pill configuration popup above the button */}
      <AnimatePresence>
        {label === "Quiz" && showPill && noteId && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
            className="absolute bottom-[72px] left-1/2 bg-card border border-[var(--border)] rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-[var(--shadow-elevated)] z-50 pointer-events-auto min-w-[200px] justify-between"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider pl-2 pr-1">
              Length:
            </span>
            <div className="flex gap-1">
              {[5, 10, 15, 20].map((q) => (
                <button
                  key={q}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPill(false)
                    router.push(`/quiz/${noteId}?questions=${q}`)
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-border/40 hover:bg-[var(--accent-blue)]/10 text-muted-foreground hover:text-[#1A5FA0] hover:border-[var(--accent-blue)]/30 transition-all cursor-pointer"
                >
                  {q}Q
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Bottom Dock Navigation (All Screens) ── */

function BottomDock() {
  const pathname = usePathname()

  // Hide on auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return null
  }

  // Detect if we are currently viewing a note
  const match = pathname.match(/^\/notes\/([^\/]+)/)
  const noteId = match ? match[1] : null

  const items = [...navItems]
  if (noteId) {
    // Insert Flashcards (red/coral) and Quiz (blue) before the Notes tab
    items.splice(3, 0,
      { icon: Layers, label: "Flashcards", href: `/flashcards/${noteId}`, color: "var(--accent-coral)" },
      { icon: Timer, label: "Quiz", href: `/quiz/${noteId}`, color: "var(--accent-blue)" }
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-4 flex justify-center">
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "pointer-events-auto",
          "flex items-center justify-around px-2 py-2",
          "rounded-[28px] h-[68px]",
          noteId ? "w-full max-w-xl" : "w-full max-w-md",
          "bg-background border border-[var(--border)]",
        )}
        style={{ boxShadow: "var(--shadow-nav)" }}
      >
        {items.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            noteId={noteId}
            active={
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            }
          />
        ))}
      </motion.nav>
    </div>
  )
}

/* ── Combined Navigation Export ── */

const MemoriaDock = () => {
  return <BottomDock />
}

export { MemoriaDock }
