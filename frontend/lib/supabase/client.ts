import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in browser/Client Components.
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * environment variables.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing!");
    return createBrowserClient(
      url || "https://placeholder-project.supabase.co",
      anonKey || "placeholder-anon-key"
    );
  }

  return createBrowserClient(url, anonKey);
}
