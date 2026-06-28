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
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

/* ── Navigation Items ── */

const navItems = [
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
}: {
  icon: React.ElementType
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all duration-200 flex-1 min-w-0",
        active
          ? "text-[var(--accent-forest)]"
          : "text-[var(--muted-foreground)]"
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5 transition-colors",
          active ? "text-[var(--accent-forest)]" : ""
        )}
      />
      <span
        className={cn(
          "text-[10px] font-semibold transition-colors",
          active ? "text-[var(--accent-forest)]" : ""
        )}
      >
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="dock-active-indicator"
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-[var(--accent-forest)]"
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
          "w-full max-w-md",
          "bg-background border border-[var(--border)]",
        )}
        style={{ boxShadow: "var(--shadow-nav)" }}
      >
        {navItems.map((item) => (
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
