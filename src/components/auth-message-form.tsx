"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { requestPasswordReset, resendConfirmation, updatePassword } from "@/app/auth/actions";
import { initialAuthState } from "@/lib/auth/rules";
import { TurnstileWidget } from "./auth-panel";

export function EmailActionForm({
  kind,
  defaultEmail = "",
}: {
  kind: "resend" | "reset";
  defaultEmail?: string;
}) {
  const action = kind === "resend" ? resendConfirmation : requestPasswordReset;
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  return (
    <form action={formAction} className="mt-7 space-y-4" noValidate>
      <label className="block text-left">
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">
          Email address
        </span>
        <input
          type="email"
          name="email"
          defaultValue={defaultEmail}
          required
          autoComplete="email"
          className="min-h-12 w-full rounded-xl border border-line bg-background px-4 outline-none focus:border-wine"
        />
        {state.fieldErrors?.email?.[0] && (
          <p className="mt-1 text-xs text-wine" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </label>
      <TurnstileWidget fieldErrors={state.fieldErrors} />
      {state.message && (
        <p
          className={`rounded-xl p-3 text-sm ${state.status === "success" ? "bg-sage/5 text-sage" : "bg-wine/5 text-wine"}`}
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-wine px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle size={15} className="animate-spin" />
            Sending
          </span>
        ) : kind === "resend" ? (
          "Resend confirmation"
        ) : (
          "Send reset instructions"
        )}
      </button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialAuthState);
  const [visible, setVisible] = useState(false);
  return (
    <form action={formAction} className="mt-7 space-y-4" noValidate>
      {[
        ["password", "New password"],
        ["confirmPassword", "Confirm new password"],
      ].map(([name, label]) => (
        <label key={name} className="block text-left">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">
            {label}
          </span>
          <span className="relative block">
            <input
              type={visible ? "text" : "password"}
              name={name}
              required
              minLength={10}
              autoComplete="new-password"
              className="min-h-12 w-full rounded-xl border border-line bg-background px-4 pr-12 outline-none focus:border-wine"
            />
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted"
              aria-label={visible ? "Hide passwords" : "Show passwords"}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          {state.fieldErrors?.[name as "password" | "confirmPassword"]?.[0] && (
            <p className="mt-1 text-xs text-wine" role="alert">
              {state.fieldErrors[name as "password" | "confirmPassword"]?.[0]}
            </p>
          )}
        </label>
      ))}
      {state.message && (
        <p
          className={`rounded-xl p-3 text-sm ${state.status === "success" ? "bg-sage/5 text-sage" : "bg-wine/5 text-wine"}`}
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-wine px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
      {state.status === "success" && (
        <Link href="/sign-in" className="inline-block text-sm font-semibold text-wine">
          Continue to sign in
        </Link>
      )}
    </form>
  );
}
