"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const { error: signUpError } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-[var(--accent-green)]" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-1.5 tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed mb-6 font-semibold">
          We sent a confirmation link to{" "}
          <span className="text-foreground font-bold">{email}</span>. Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="text-[var(--accent-forest)] hover:opacity-80 transition-opacity text-xs font-bold uppercase tracking-wider"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-foreground text-center mb-1.5 tracking-tight">
        Create an account
      </h1>
      <p className="text-muted-foreground text-xs text-center mb-8 font-semibold">
        Start building your second brain
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3.5 rounded-full bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/20 text-[var(--accent-coral)] text-xs font-bold text-center leading-relaxed">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="signup-email"
            className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
          >
            Email Address
          </label>
          <input
            id="signup-email"
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
            htmlFor="signup-password"
            className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-full border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--accent-forest)] transition-colors text-xs font-semibold"
          />
        </div>

        <div>
          <label
            htmlFor="signup-confirm"
            className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
          >
            Confirm Password
          </label>
          <input
            id="signup-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-full border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--accent-forest)] transition-colors text-xs font-semibold"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password || !confirmPassword}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-[var(--accent-forest)] text-white hover:opacity-90 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 mt-2 shadow-sm cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Create Account
        </button>
      </form>

      <p className="text-muted-foreground text-xs text-center mt-6 font-semibold">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--accent-forest)] hover:opacity-80 transition-opacity font-bold"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
