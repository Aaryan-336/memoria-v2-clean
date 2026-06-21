"use client"
import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Mic,
  PlayCircle,
  BookOpen,
  MessageSquare,
  Search,
  LayoutDashboard,
  Layers,
  Timer,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

const dockItems = [
  { icon: LayoutDashboard, label: "Home", href: "/" },
  { icon: Mic, label: "Record", href: "/record" },
  { icon: PlayCircle, label: "YouTube", href: "/youtube" },
  { icon: BookOpen, label: "Notes", href: "/notes" },
  { icon: Layers, label: "Cards", href: "/flashcards" },
  { icon: Timer, label: "Quiz", href: "/quiz" },
  { icon: MessageSquare, label: "Ask AI", href: "/ask" },
  { icon: Search, label: "Search", href: "/search" },
]

import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const DockIconButton = ({ icon: Icon, label, href, active }: {
  icon: React.ElementType
  label: string
  href: string
  active?: boolean
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.15, y: -4 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        href={href}
        className={cn(
          "relative group flex flex-col items-center gap-1 p-3 rounded-xl transition-colors",
          active ? "bg-muted text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={cn(
          "w-5 h-5 transition-colors",
          active ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground group-hover:text-foreground"
        )} />
        <span className={cn(
          "text-[10px] font-medium transition-colors",
          active ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground/80 group-hover:text-foreground"
        )}>
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="dock-active"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400"
          />
        )}
      </Link>
    </motion.div>
  )
}

const DockThemeToggle = () => {
  const { resolvedTheme, toggleTheme } = useTheme()
  const Icon = resolvedTheme === "dark" ? Sun : Moon

  return (
    <motion.div
      whileHover={{ scale: 1.15, y: -4 }}
      whileTap={{ scale: 0.95 }}
    >
      <button
        onClick={toggleTheme}
        className="relative group flex flex-col items-center gap-1 p-3 rounded-xl transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-[10px] font-medium text-muted-foreground/80 group-hover:text-foreground transition-colors">
          Theme
        </span>
      </button>
    </motion.div>
  )
}

const MemoriaDock = () => {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "pointer-events-auto",
          "flex items-center gap-1 px-3 py-2 rounded-2xl",
          "bg-card/85 backdrop-blur-xl border border-border",
          "shadow-xl shadow-black/10 dark:shadow-black/40"
        )}
      >
        {dockItems.map((item) => (
          <DockIconButton
            key={item.label}
            {...item}
            active={pathname === item.href}
          />
        ))}
        <div className="w-px h-6 bg-border mx-1 self-center" />
        <DockThemeToggle />
      </motion.div>
    </div>
  )
}

export { MemoriaDock }
