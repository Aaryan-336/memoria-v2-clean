"use client"

import { useState } from "react"
import { useWorkspace } from "@/lib/workspace"
import { useSubscription } from "@/lib/subscription"
import { Users, UserPlus, Shield, Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function WorkspaceMembers() {
  const { planName } = useSubscription()
  const isTeam = planName === "team"

  const {
    workspaces,
    currentWorkspace,
    selectWorkspace,
    inviteMember,
    members,
    loading: workspacesLoading,
  } = useWorkspace()

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("editor")
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || submitting) return

    setSubmitting(true)
    setSuccessMsg("")
    setErrorMsg("")

    try {
      await inviteMember(inviteEmail.trim().toLowerCase(), inviteRole)
      setSuccessMsg(`Successfully invited ${inviteEmail.trim()} as ${inviteRole}!`)
      setInviteEmail("")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to invite member. Please verify permissions.")
    } finally {
      setSubmitting(false)
    }
  }

  // --- Render Non-Team Locked State ---
  if (!isTeam) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/80 bg-card p-6 mb-8 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              Team Workspaces & Collaboration
              <span className="text-[9px] uppercase bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] font-bold px-2.5 py-0.5 rounded-full tracking-wider">
                Team Feature
              </span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              Create shared brains to collaborate with other team members. Assign granular Role-Based Access Control (RBAC) like Admin, Editor, and Viewer to control permissions.
            </p>
            <div className="pt-2">
              <span className="text-xs text-[var(--accent-yellow)] font-bold">
                Upgrade to the Team Plan to unlock collaborative collections.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="memoria-card-static shadow-[var(--shadow-card)] mb-8 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-[var(--accent-blue)]" />
        <h3 className="text-lg font-bold text-foreground">Team Collaboration</h3>
      </div>

      {workspacesLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-[24px]">
          <Users className="w-8 h-8 text-muted-foreground/35 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-semibold">
            No workspaces created yet. Use the selector in Notes or Ask to create a Workspace first!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspace Switcher/Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Selected Workspace
            </label>
            <select
              value={currentWorkspace?.id || ""}
              onChange={(e) => selectWorkspace(e.target.value || null)}
              className="w-full max-w-xs px-4 py-2.5 rounded-full bg-secondary/50 border border-border/80 text-foreground focus:outline-none focus:border-[var(--accent-forest)] text-xs font-bold transition-colors"
            >
              <option value="">-- Personal Brain --</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {!currentWorkspace && (
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                Select a shared workspace to manage team members and invites.
              </p>
            )}
          </div>

          {currentWorkspace && (
            <>
              {/* Invite Form */}
              <div className="border-t border-border/40 pt-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground">
                  <UserPlus className="w-4 h-4 text-[var(--accent-blue)]" />
                  <span>Invite Collaborator</span>
                </div>
                
                <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="email"
                    placeholder="collaborator@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="md:col-span-1.5 px-4 py-2.5 text-xs rounded-full bg-secondary/50 border border-border/80 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--accent-forest)] font-semibold transition-colors"
                    required
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-4 py-2.5 text-xs rounded-full bg-secondary/50 border border-border/80 text-foreground focus:outline-none focus:border-[var(--accent-forest)] font-semibold transition-colors"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={submitting || !inviteEmail.trim()}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[var(--accent-forest)] hover:opacity-90 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    <span>Send Invite</span>
                  </button>
                </form>

                {successMsg && (
                  <div className="text-xs text-[var(--accent-green)] bg-[var(--accent-green)]/10 px-4 py-2.5 rounded-full flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
                  </div>
                )}
                {errorMsg && (
                  <div className="text-xs text-[var(--accent-coral)] bg-[var(--accent-coral)]/10 px-4 py-2.5 rounded-full flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> {errorMsg}
                  </div>
                )}
              </div>

              {/* Members List */}
              <div className="border-t border-border/40 pt-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground">
                  <Shield className="w-4 h-4 text-[var(--accent-blue)]" />
                  <span>Workspace Members ({members.length})</span>
                </div>

                <div className="rounded-[24px] border border-border/85 overflow-hidden bg-card shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/80">
                        <th className="p-4 font-bold text-muted-foreground">User / Email</th>
                        <th className="p-4 font-bold text-muted-foreground text-right">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="p-4 text-foreground font-semibold">
                            {member.user_email || `User (ID: ${member.user_id.slice(0, 8)}...)`}
                          </td>
                          <td className="p-4 text-right">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                                member.role === "owner" && "bg-[var(--accent-mint)] text-[var(--accent-forest)] border-[rgba(45,106,79,0.15)]",
                                member.role === "admin" && "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20",
                                member.role === "editor" && "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20",
                                member.role === "viewer" && "bg-muted/15 text-muted-foreground border-border/40"
                              )}
                            >
                              {member.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
