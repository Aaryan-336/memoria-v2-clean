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
          active ? "bg-white/10" : "hover:bg-white/5"
        )}
      >
        <Icon className={cn(
          "w-5 h-5",
          active ? "text-blue-400" : "text-zinc-400 group-hover:text-zinc-200"
        )} />
        <span className={cn(
          "text-[10px] font-medium",
          active ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"
        )}>
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="dock-active"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"
          />
        )}
      </Link>
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
          "bg-zinc-900/80 backdrop-blur-xl",
          "border border-zinc-800/80",
          "shadow-xl shadow-black/40"
        )}
      >
        {dockItems.map((item) => (
          <DockIconButton
            key={item.label}
            {...item}
            active={pathname === item.href}
          />
        ))}
      </motion.div>
    </div>
  )
}

export { MemoriaDock }
