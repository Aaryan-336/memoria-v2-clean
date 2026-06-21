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
