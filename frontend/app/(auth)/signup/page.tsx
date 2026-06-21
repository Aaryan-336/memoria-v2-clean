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
          <CheckCircle className="w-12 h-12 text-emerald-550 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Check your email
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          We sent a confirmation link to{" "}
          <span className="text-card-foreground font-semibold">{email}</span>. Click it to activate
          your account.
        </p>
        <Link
          href="/login"
          className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm font-medium transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground text-center mb-2">
        Create an account
      </h1>
      <p className="text-muted-foreground text-sm text-center mb-8">
        Start building your second brain
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="signup-email"
            className="block text-muted-foreground text-sm mb-1.5"
          >
            Email
          </label>
          <input
            id="signup-email"
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
            htmlFor="signup-password"
            className="block text-muted-foreground text-sm mb-1.5"
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
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border/80 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="signup-confirm"
            className="block text-muted-foreground text-sm mb-1.5"
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
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border/80 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password || !confirmPassword}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 mt-2 shadow-sm shadow-blue-600/10"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Create Account
        </button>
      </form>

      <p className="text-muted-foreground text-sm text-center mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
