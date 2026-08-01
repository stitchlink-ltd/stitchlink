"use client";
import { useActionState } from "react";
import { updateDisplayName } from "@/app/auth/actions";
import { initialAuthState } from "@/lib/auth/rules";

export function UpdateDisplayNameForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayName, initialAuthState);
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        name="displayName"
        defaultValue={defaultValue}
        required
        minLength={2}
        maxLength={100}
        className="min-h-10 flex-1 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-wine"
      />
      <button
        disabled={pending}
        className="min-h-10 shrink-0 rounded-full border border-line px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save name"}
      </button>
      {state.fieldErrors?.displayName?.[0] && (
        <p className="text-xs text-wine sm:basis-full">{state.fieldErrors.displayName[0]}</p>
      )}
      {state.message && (
        <p className={`text-xs sm:basis-full ${state.status === "error" ? "text-wine" : "text-sage"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
