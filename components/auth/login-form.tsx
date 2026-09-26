"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const fieldClassName =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

type LoginFormProps = {
  nextPath: string;
  initialError?: string;
};

function messageFor(error: string) {
  const normalized = error.toLowerCase();

  if (normalized.includes("provider") || normalized.includes("unsupported")) {
    return "Prijava z Google trenutno ni na voljo.";
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Preveč poskusov. Počakajte minuto in poskusite znova.";
  }

  return "Prijava ni uspela. Poskusite znova.";
}

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState<"google" | "email" | null>(null);

  function callbackUrl() {
    document.cookie = `booking_next=${encodeURIComponent(nextPath)}; Path=/; Max-Age=600; SameSite=Lax`;
    return `${window.location.origin}/auth/callback`;
  }

  async function signInWithGoogle() {
    setError("");
    setPending("google");

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(),
          skipBrowserRedirect: true,
        },
      });

      if (signInError || !data.url) {
        setError(messageFor(signInError?.message ?? ""));
        setPending(null);
        return;
      }

      // Keep the original address, including the phone's host. Rebuilding the
      // query in a form can drop it, and Supabase then falls back to localhost.
      const link = document.createElement("a");
      link.href = data.url;
      link.target = "_self";
      document.body.appendChild(link);
      link.click();
    } catch {
      setError("Prijava ni uspela. Poskusite znova.");
      setPending(null);
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending("email");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setPending(null);

    if (signInError) {
      setError(messageFor(signInError.message));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm leading-6 text-muted-foreground" role="status">
        Preverite e-pošto. Poslali smo vam povezavo za prijavo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-full"
        onClick={signInWithGoogle}
        disabled={pending !== null}
      >
        {pending === "google" ? "Preusmerjam…" : "Nadaljuj z Google"}
      </Button>
      <div className="flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        ali
        <span className="h-px flex-1 bg-border" />
      </div>
      <form className="flex flex-col gap-3" onSubmit={signInWithEmail}>
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          E-pošta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClassName}
        />
        <Button type="submit" className="h-11 rounded-full" disabled={pending !== null}>
          {pending === "email" ? "Pošiljam…" : "Pošlji povezavo za prijavo"}
        </Button>
      </form>
    </div>
  );
}
