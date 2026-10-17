"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { signIn, signInWithGoogle, signUp } from "../actions";

const FIELD = "min-h-12 w-full rounded-xl border bg-surface px-4 text-lg placeholder:text-ink-muted";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);
  const signingUp = mode === "signup";
  const state = signingUp ? upState : inState;
  const pending = signingUp ? upPending : inPending;
  const error = state?.error ?? (params.get("error") === "oauth" ? "Google sign-in didn't complete. Please try again." : null);

  return (
    <div className="w-full max-w-[26rem]">
      <h1 className="text-m">{signingUp ? "Create your account" : "Sign in to Jiran"}</h1>
      <p className="mt-3 text-ink-muted">
        {signingUp ? "For residents of City of Elmina." : "Residents, resident administration and guards all sign in here."}
      </p>

      <form action={signInWithGoogle} className="mt-10">
        <button className="press flex min-h-12 w-full items-center justify-center gap-3 rounded-full border bg-surface px-6 font-semibold transition-colors duration-200 hover:bg-surface-2">
          <GoogleMark />
          Continue with Google
        </button>
      </form>

      <p className="mt-8 text-sm text-ink-muted">Or with your email</p>

      <form action={signingUp ? upAction : inAction} className="mt-3 space-y-4" key={mode}>
        {signingUp && (
          <label className="block space-y-1.5">
            <span className="block text-sm font-semibold">Full name</span>
            <input name="full_name" autoComplete="name" required className={FIELD} />
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold">Email</span>
          <input name="email" type="email" autoComplete="email" required className={FIELD} />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={signingUp ? "new-password" : "current-password"}
            minLength={signingUp ? 8 : undefined}
            required
            className={FIELD}
          />
          {signingUp && <span className="block text-sm text-ink-muted">At least 8 characters.</span>}
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        )}
        {state?.message && (
          <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success-ink">
            {state.message}
          </p>
        )}
        <button
          disabled={pending}
          className="press mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-6 text-lg font-semibold text-white transition-colors duration-200 hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? (signingUp ? "Creating account…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-8">
        {signingUp ? "Already on Jiran? " : "New to Jiran? "}
        <button type="button" onClick={() => setMode(signingUp ? "signin" : "signup")} className="link font-semibold text-brand">
          {signingUp ? "Sign in" : "Create an account"}
        </button>
      </p>
      <p className="mt-6 text-sm text-ink-muted">
        Resident administration and guard accounts are set up by the RA office. Sign in with the email they registered for you.
      </p>
      <p className="mt-10 text-sm">
        <Link href="/" className="link">
          Back to the Jiran home page
        </Link>
      </p>
    </div>
  );
}
