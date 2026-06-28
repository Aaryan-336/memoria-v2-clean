// ─── Memoria AI — Shared TypeScript Types ───────────────────
// Central type definitions for all frontend components.
// These replace the `any` types scattered across pages.

// ─── Notes ──────────────────────────────────────────────────

export interface Note {
  id: string;
  user_id: string;
  title: string;
  transcript: string;
  summary: string;
  notes: string;
  key_points: string[];
  topics: string[];
  action_items: ActionItem[];
  exam_questions: string[];
  reminders: Reminder[];
  mermaid_diagram: string;
  source_type: SourceType;
  youtube_url?: string;
  created_at: string;
}

export type SourceType = "audio" | "youtube" | "manual" | "pdf" | "ppt" | "image";

export interface ActionItem {
  task: string;
  due: string | null;
  priority: "low" | "medium" | "high";
}

export interface Reminder {
  text: string;
  when: string | null;
}

// ─── AI Response ────────────────────────────────────────────

export interface AIResult {
  title: string;
  summary: string;
  key_points: string[];
  notes: string;
  topics: string[];
  exam_questions: string[];
  action_items: ActionItem[];
  reminders: Reminder[];
  mermaid_diagram: string;
}

export interface GenerateNotesResponse {
  success: boolean;
  note: Note;
  ai: AIResult;
}

export interface YouTubeResponse {
  success: boolean;
  note: Note;
  ai: AIResult;
}

// ─── Chat / Ask ─────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskResponse {
  answer: string;
}

// ─── Search ─────────────────────────────────────────────────

export interface SearchResponse {
  results: Note[];
}

// ─── Notes List ─────────────────────────────────────────────

export interface NotesListResponse {
  notes: Note[];
}

// ─── Flashcards ─────────────────────────────────────────────

export interface Flashcard {
  id: string;
  note_id: string;
  user_id: string;
  topic: string;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  sort_order: number;
  created_at: string;
}

export interface FlashcardsResponse {
  flashcards: Flashcard[];
}

export interface GenerateFlashcardsResponse {
  success: boolean;
  flashcards: Flashcard[];
}

// ─── Quiz ───────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface QuizResponse {
  success: boolean;
  note_title: string;
  questions: QuizQuestion[];
  num_questions: number;
  time_per_question: number;
}

// ─── Subscription Plans ─────────────────────────────────────

export type PlanName = "free" | "pro" | "premium" | "team";
export type BillingInterval = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing" | "paused";

export interface Plan {
  id: string;
  name: PlanName;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_memories: number | null;
  max_storage_mb: number | null;
  max_ai_queries_daily: number | null;
  max_workspaces: number | null;
  max_youtube_daily: number | null;
  features: Record<string, boolean | number | null>;
  sort_order: number;
}

export interface PlanListResponse {
  plans: Plan[];
}

export interface UserSubscription {
  plan: Plan;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
  student_discount: boolean;
}

// ─── Usage ──────────────────────────────────────────────────

export interface Usage {
  ai_queries: number;
  youtube_imports: number;
  notes_created: number;
  flashcards_generated: number;
  quizzes_generated: number;
  storage_used_mb: number;
}

export interface UsageLimits {
  usage: Usage;
  limits: Plan;
  memories_count: number;
}

export interface UsageHistoryItem {
  date: string;
  ai_queries: number;
  youtube_imports: number;
  notes_created: number;
}

export interface UsageHistoryResponse {
  history: UsageHistoryItem[];
}

// ─── Billing ────────────────────────────────────────────────

export interface CheckoutResponse {
  checkout_url: string;
}

export interface PortalResponse {
  portal_url: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
}

// ─── Quota Error ────────────────────────────────────────────

export interface QuotaError {
  error: "quota_exceeded" | "feature_locked" | "memory_limit_reached";
  message: string;
  metric?: string;
  limit?: number;
  current?: number;
  feature?: string;
  plan: PlanName;
  upgrade_url: string;
}


// ─── Workspaces ──────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  user_email: string | null;
  role: "owner" | "admin" | "editor" | "viewer";
  created_at: string;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
}

export interface MoveNoteResponse {
  success: boolean;
  note_id: string;
  workspace_id: string | null;
}
