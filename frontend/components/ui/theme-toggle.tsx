"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-xl p-2
        bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground
        transition-all duration-300 ${className}`}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
      )}
    </button>
  )
}
