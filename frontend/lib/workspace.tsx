"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"
import { useSubscription } from "@/lib/subscription"
import type { Workspace, WorkspaceMember, WorkspaceListResponse } from "@/lib/types"

interface WorkspaceContextType {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  error: string | null
  selectWorkspace: (id: string | null) => void
  createWorkspace: (name: string) => Promise<Workspace>
  inviteMember: (email: string, role: string) => Promise<WorkspaceMember>
  members: WorkspaceMember[]
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  loading: true,
  error: null,
  selectWorkspace: () => {},
  createWorkspace: async () => ({} as Workspace),
  inviteMember: async () => ({} as WorkspaceMember),
  members: [],
  refreshWorkspaces: async () => {},
})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await apiFetch<WorkspaceListResponse>("/api/workspaces").catch(() => ({ workspaces: [] }))
      setWorkspaces(data.workspaces || [])
    } catch (e) {
      setError("Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }, [user])

  // Reload workspaces when user changes
  useEffect(() => {
    refreshWorkspaces()
  }, [refreshWorkspaces])

  // Load members when current workspace changes
  useEffect(() => {
    if (!currentWorkspace) {
      setMembers([])
      return
    }

    apiFetch<WorkspaceMember[]>(`/api/workspaces/${currentWorkspace.id}/members`)
      .then((data) => setMembers(data || []))
      .catch(() => {})
  }, [currentWorkspace])

  const selectWorkspace = useCallback((id: string | null) => {
    if (!id) {
      setCurrentWorkspace(null)
      return
    }
    const found = workspaces.find((w) => w.id === id)
    if (found) {
      setCurrentWorkspace(found)
    }
  }, [workspaces])

  const createWorkspace = useCallback(async (name: string): Promise<Workspace> => {
    const data = await apiFetch<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    setWorkspaces((prev) => [...prev, data])
    setCurrentWorkspace(data)
    return data
  }, [])

  const inviteMember = useCallback(async (email: string, role: string): Promise<WorkspaceMember> => {
    if (!currentWorkspace) throw new Error("No active workspace")
    const data = await apiFetch<WorkspaceMember>(`/api/workspaces/${currentWorkspace.id}/invite`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    })
    setMembers((prev) => [...prev, data])
    return data
  }, [currentWorkspace])

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        error,
        selectWorkspace,
        createWorkspace,
        inviteMember,
        members,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
