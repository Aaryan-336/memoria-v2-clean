"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError("");

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground text-center mb-2">
        Welcome back
      </h1>
      <p className="text-muted-foreground text-sm text-center mb-8">
        Sign in to your Memoria account
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="login-email"
            className="block text-muted-foreground text-sm mb-1.5"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border/80 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-muted-foreground text-sm mb-1.5"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border/80 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 mt-2 shadow-sm shadow-blue-600/10"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          Sign In
        </button>
      </form>

      <p className="text-muted-foreground text-sm text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
