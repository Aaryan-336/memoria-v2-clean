"use client"
import * as React from "react"
import { motion } from "framer-motion"
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
import { usePathname } from "next/navigation"
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
}: {
  icon: React.ElementType
  label: string
  href: string
  active: boolean
  color?: string
}) {
  const displayColor = color || "var(--accent-forest)"

  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all duration-200 flex-1 min-w-0"
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
    // Insert Flashcards (yellow) and Quiz (blue) before the Notes tab
    items.splice(3, 0,
      { icon: Layers, label: "Flashcards", href: `/flashcards/${noteId}`, color: "var(--accent-yellow)" },
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
