"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useWorkspace } from "@/lib/workspace"
import { useSubscription } from "@/lib/subscription"
import { ChevronDown, Plus, Brain, Users, Check, Lock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspace,
    selectWorkspace,
    createWorkspace,
    loading
  } = useWorkspace()
  
  const { planName } = useSubscription()
  const hasTeamPlan = planName === "team"

  const [isOpen, setIsOpen] = useState(false)
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [creating, setCreating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCreateInput(false)
        setNewWorkspaceName("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim() || creating) return

    try {
      setCreating(true)
      await createWorkspace(newWorkspaceName.trim())
      setNewWorkspaceName("")
      setShowCreateInput(false)
      setIsOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Switcher Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2.5 px-4.5 py-2.5 rounded-full",
          "bg-card border border-border/80 hover:border-[var(--accent-forest)]/40 hover:bg-muted/30",
          "text-xs font-bold uppercase tracking-wider text-foreground transition-all cursor-pointer shadow-sm shadow-black/5"
        )}
      >
        {currentWorkspace ? (
          <Users className="w-4 h-4 text-[var(--accent-blue)]" />
        ) : (
          <Brain className="w-4 h-4 text-[var(--accent-forest)]" />
        )}
        <span className="truncate max-w-[120px] md:max-w-[180px]">
          {currentWorkspace ? currentWorkspace.name : "Personal Brain"}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute right-0 mt-2 w-72 rounded-[24px] p-2.5",
              "bg-card border border-border/80 shadow-[var(--shadow-elevated)]",
              "flex flex-col gap-1.5 overflow-hidden"
            )}
          >
            {/* Workspaces Label */}
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
              Select Workspace
            </div>

            {/* List Option: Personal Brain */}
            <button
              onClick={() => {
                selectWorkspace(null)
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-full text-left text-xs transition-all hover:bg-muted/65 group",
                !currentWorkspace ? "bg-muted font-bold text-[var(--accent-forest)]" : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Brain className={cn("w-4 h-4", !currentWorkspace ? "text-[var(--accent-forest)]" : "text-muted-foreground group-hover:text-[var(--accent-forest)] transition-colors")} />
                <span>Personal Brain</span>
              </div>
              {!currentWorkspace && <Check className="w-4 h-4 text-[var(--accent-forest)] shrink-0" />}
            </button>

            {/* List Team Workspaces */}
            <div className="flex flex-col gap-1">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
              ) : (
                workspaces.map((w) => {
                  const isSelected = currentWorkspace?.id === w.id
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        selectWorkspace(w.id)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-full text-left text-xs transition-all hover:bg-muted/65 group",
                        isSelected ? "bg-muted font-bold text-[var(--accent-blue)]" : "text-muted-foreground hover:text-foreground font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className={cn("w-4 h-4", isSelected ? "text-[var(--accent-blue)]" : "text-muted-foreground group-hover:text-[var(--accent-blue)] transition-colors")} />
                        <span className="truncate max-w-[180px]">{w.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[var(--accent-blue)] shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Create Workspace Area */}
            <div className="border-t border-border/40 mt-1.5 pt-3">
              {showCreateInput ? (
                <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-2 p-1">
                  <input
                    type="text"
                    placeholder="Workspace Name..."
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-full bg-secondary/50 border border-border text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-[var(--accent-forest)] font-semibold"
                    autoFocus
                    required
                  />
                  <div className="flex gap-2 justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateInput(false)
                        setNewWorkspaceName("")
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newWorkspaceName.trim()}
                      className="flex items-center gap-1 px-4.5 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-forest)] hover:opacity-90 text-white rounded-full transition-all disabled:opacity-50"
                    >
                      {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (hasTeamPlan) {
                      setShowCreateInput(true)
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-full text-left text-xs font-bold transition-all",
                    hasTeamPlan 
                      ? "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer" 
                      : "text-muted-foreground/45 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Plus className="w-4 h-4" />
                    <span>Create Workspace</span>
                  </div>
                  {!hasTeamPlan && (
                    <div className="flex items-center gap-1 text-[9px] text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      <Lock className="w-2.5 h-2.5" /> Team
                    </div>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
