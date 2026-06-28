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
      <h1 className="text-2xl font-black text-foreground text-center mb-1.5 tracking-tight">
        Welcome back
      </h1>
      <p className="text-muted-foreground text-xs text-center mb-8 font-semibold">
        Sign in to your Memoria account
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3.5 rounded-full bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/20 text-[var(--accent-coral)] text-xs font-bold text-center leading-relaxed">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="login-email"
            className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
          >
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-full border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--accent-forest)] transition-colors text-xs font-semibold"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
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
            className="w-full px-4 py-3 rounded-full border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--accent-forest)] transition-colors text-xs font-semibold"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-[var(--accent-forest)] text-white hover:opacity-90 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 mt-2 shadow-sm cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          Sign In
        </button>
      </form>

      <p className="text-muted-foreground text-xs text-center mt-6 font-semibold">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[var(--accent-forest)] hover:opacity-80 transition-opacity font-bold"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
