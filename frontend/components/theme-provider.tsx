"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "memoria-theme"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return getSystemTheme()
  return theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark")

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initial = stored || "dark"
    setThemeState(initial)
    const resolved = resolveTheme(initial)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const resolved = getSystemTheme()
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [theme])

  function applyTheme(resolved: ResolvedTheme) {
    const root = document.documentElement
    if (resolved === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    const resolved = resolveTheme(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }

  function toggleTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
