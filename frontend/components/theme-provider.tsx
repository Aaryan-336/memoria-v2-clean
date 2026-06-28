"use client"

import { createContext, useContext, type ReactNode } from "react"

/* ── Simplified Theme Provider — Light mode only ── */

interface ThemeContextType {
  resolvedTheme: "light"
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  resolvedTheme: "light",
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider
      value={{
        resolvedTheme: "light",
        toggleTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
