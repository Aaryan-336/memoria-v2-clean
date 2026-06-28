-- ═══════════════════════════════════════════════════════════════
-- Memoria AI — Collaborative Workspaces Migration
-- ═══════════════════════════════════════════════════════════════

-- 1. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. WORKSPACE MEMBERS TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'viewer',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- 3. ASSOCIATE NOTES WITH WORKSPACES
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
