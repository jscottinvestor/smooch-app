"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase/browser";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const nextParam = useSearchParams().get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSucceeded, setSignupSucceeded] = useState(false);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getBrowserSupabase();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`,
        },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setSignupSucceeded(true);
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace(nextParam);
    router.refresh();
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success, the browser redirects to Google — no further code runs.
  }

  if (signupSucceeded) {
    return (
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <MailCheck className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Check your email</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click
          it to finish creating your account.
        </p>
        <p className="text-xs text-muted-foreground">
          Already confirmed?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onEmailSubmit}
      className="w-full max-w-sm rounded-lg border bg-card p-6 space-y-5"
    >
      <div>
        <h1
          className="font-display text-2xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          COTTAGE BAKING BUDDY
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "login" ? "Sign in to your account." : "Create your account."}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
        disabled={busy}
      >
        <GoogleIcon className="w-4 h-4" />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        or with email
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          disabled={busy}
        />
        {mode === "signup" && (
          <p className="text-[11px] text-muted-foreground">
            At least 8 characters.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.3 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.3 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
