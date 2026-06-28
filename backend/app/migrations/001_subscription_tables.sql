-- ═══════════════════════════════════════════════════════════════
-- Memoria AI — Subscription System Migration
-- Run this in Supabase SQL Editor or via migration tool.
-- ═══════════════════════════════════════════════════════════════

-- 1. SUBSCRIPTION PLANS (reference table)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    description     TEXT,
    price_monthly   INTEGER NOT NULL DEFAULT 0,
    price_yearly    INTEGER NOT NULL DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly  TEXT,
    max_memories    INTEGER,
    max_storage_mb  INTEGER,
    max_ai_queries_daily INTEGER,
    max_workspaces  INTEGER,
    max_youtube_daily INTEGER,
    features        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    billing_interval        TEXT NOT NULL DEFAULT 'monthly'
                            CHECK (billing_interval IN ('monthly', 'yearly')),
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
    current_period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    trial_end               TIMESTAMPTZ,
    canceled_at             TIMESTAMPTZ,
    student_discount        BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_active_subscription UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_sub ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);

-- 3. USAGE TRACKING (daily aggregated)
CREATE TABLE IF NOT EXISTS usage_daily (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    ai_queries      INTEGER NOT NULL DEFAULT 0,
    youtube_imports INTEGER NOT NULL DEFAULT 0,
    notes_created   INTEGER NOT NULL DEFAULT 0,
    flashcards_generated INTEGER NOT NULL DEFAULT 0,
    quizzes_generated INTEGER NOT NULL DEFAULT 0,
    storage_used_mb NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_date UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_daily(user_id, usage_date DESC);

-- 4. USAGE EVENTS (granular event log)
CREATE TABLE IF NOT EXISTS usage_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type, created_at DESC);

-- 5. PAYMENT HISTORY
CREATE TABLE IF NOT EXISTS payment_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    stripe_payment_intent_id TEXT,
    stripe_invoice_id        TEXT,
    amount          INTEGER NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'usd',
    status          TEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_history(user_id, created_at DESC);

-- 6. FEATURE ACCESS OVERRIDES
CREATE TABLE IF NOT EXISTS feature_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key     TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    reason          TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_feature UNIQUE (user_id, feature_key)
);

-- 7. UPGRADE PROMPT EVENTS
CREATE TABLE IF NOT EXISTS upgrade_prompt_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_type     TEXT NOT NULL,
    feature_key     TEXT,
    action          TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upgrade_prompts_user ON upgrade_prompt_events(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — Subscription Plans
-- ═══════════════════════════════════════════════════════════════

INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly,
    max_memories, max_storage_mb, max_ai_queries_daily, max_workspaces, max_youtube_daily,
    features, sort_order)
VALUES
    ('free', 'Explorer', 'Start your second brain journey', 0, 0,
     100, 500, 30, 1, 3,
     '{"basic_search": true, "text_notes": true, "pdf_upload": true, "basic_rag": true, "markdown_export": true, "audio_recording": true, "voice_transcription": true, "flashcards_per_note": 3, "quiz_questions_per_note": 5}',
     0),

    ('pro', 'Personal Knowledge System', 'Supercharge your learning', 399, 3192,
     10000, 10240, null, 5, null,
     '{"basic_search": true, "text_notes": true, "pdf_upload": true, "basic_rag": true, "markdown_export": true, "audio_recording": true, "voice_transcription": true, "youtube_unlimited": true, "ai_summaries": true, "smart_tags": true, "collections": true, "timeline_view": true, "daily_recap": true, "priority_indexing": true, "ppt_upload": true, "image_upload": true, "browser_extension": true, "memory_streaks": true, "ai_study_planner": true, "smart_reminders": true, "weekly_reports": true, "knowledge_analytics": true, "ai_memory_coach": true, "context_recommendations": true, "flashcards_per_note": null, "quiz_questions_per_note": null}',
     1),

    ('premium', 'AI Research Assistant', 'Your personal AI research team', 1999, 15992,
     null, 102400, null, null, null,
     '{"basic_search": true, "text_notes": true, "pdf_upload": true, "basic_rag": true, "markdown_export": true, "audio_recording": true, "voice_transcription": true, "youtube_unlimited": true, "ai_summaries": true, "smart_tags": true, "collections": true, "timeline_view": true, "daily_recap": true, "priority_indexing": true, "ppt_upload": true, "image_upload": true, "browser_extension": true, "memory_streaks": true, "ai_study_planner": true, "smart_reminders": true, "weekly_reports": true, "knowledge_analytics": true, "ai_memory_coach": true, "context_recommendations": true, "multi_agent_reasoning": true, "deep_research": true, "cross_document_analysis": true, "ai_insights": true, "knowledge_gap_detection": true, "personal_ai_assistant": true, "custom_ai_personalities": true, "knowledge_graph": true, "automatic_organization": true, "memory_health_score": true, "knowledge_decay_detection": true, "scheduled_quizzes": true, "study_revision_mode": true, "learning_mode": true, "api_access": true, "long_term_retention": true, "ai_writing_assistant": true, "meeting_assistant": true, "smart_workflows": true, "email_ingestion": true, "memory_replay": true, "time_machine": true, "ai_memory_maps": true, "revision_scheduling": true, "mastery_score": true, "ai_goal_tracking": true, "flashcards_per_note": null, "quiz_questions_per_note": null}',
     2),

    ('team', 'Collaborative Intelligence', 'Knowledge for your entire team', 999, 7992,
     null, 102400, null, null, null,
     '{"basic_search": true, "text_notes": true, "pdf_upload": true, "basic_rag": true, "markdown_export": true, "audio_recording": true, "voice_transcription": true, "youtube_unlimited": true, "ai_summaries": true, "smart_tags": true, "collections": true, "timeline_view": true, "daily_recap": true, "priority_indexing": true, "ppt_upload": true, "image_upload": true, "browser_extension": true, "memory_streaks": true, "ai_study_planner": true, "smart_reminders": true, "weekly_reports": true, "knowledge_analytics": true, "ai_memory_coach": true, "context_recommendations": true, "multi_agent_reasoning": true, "deep_research": true, "cross_document_analysis": true, "ai_insights": true, "knowledge_gap_detection": true, "personal_ai_assistant": true, "custom_ai_personalities": true, "knowledge_graph": true, "automatic_organization": true, "shared_workspaces": true, "rbac": true, "team_knowledge_base": true, "activity_logs": true, "workspace_analytics": true, "collaborative_collections": true, "shared_memory_graph": true, "org_search": true, "flashcards_per_note": null, "quiz_questions_per_note": null}',
     3)
ON CONFLICT (name) DO NOTHING;
