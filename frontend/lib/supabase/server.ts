import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client for use in Server Components,
 * Server Actions, and Route Handlers.
 *
 * Must be called with `await` since cookies() is async in Next.js 15+.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Server-side: Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing!");
  }

  return createServerClient(
    url || "https://placeholder-project.supabase.co",
    anonKey || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
