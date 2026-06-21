// ─── Memoria AI — API Client Configuration ─────────────────
// Centralized API base URL and fetch helpers.
// Replaces hardcoded "http://localhost:8000" across all pages.

/**
 * Base URL for the Memoria backend API.
 *
 * Uses NEXT_PUBLIC_API_URL env var in production (set in Vercel),
 * falls back to localhost for local development.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Construct a full API URL from a relative path.
 *
 * @example
 *   apiUrl("/api/notes/user_demo")
 *   // => "http://localhost:8000/api/notes/user_demo"
 */
export function apiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

import { createClient as createBrowserClient } from "@/lib/supabase/client";

/**
 * Retrieve the active Supabase authentication token.
 * Only resolves in the browser to avoid server-side dependency issues.
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (e) {
    console.error("Error getting session token:", e);
    return null;
  }
}

/**
 * Default headers for API requests.
 * Now injects dynamic Authorization headers for verified requests.
 */
export async function getHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Typed fetch wrapper for API calls.
 * Handles JSON parsing and basic error handling.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = apiUrl(path);
  const authHeaders = await getHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      (errorData as { detail?: string }).detail || response.statusText
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Structured API error with status code.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
