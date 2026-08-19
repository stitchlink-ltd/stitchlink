"use client";
import { useActionState } from "react";
import { updateCalendlyUrl } from "@/app/auth/actions";
import { initialAuthState } from "@/lib/auth/rules";

export function CalendlyLinkForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, pending] = useActionState(updateCalendlyUrl, initialAuthState);
  return (
    <div className="mt-5 rounded-2xl bg-background p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Calendly</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Optional — share your Calendly scheduling link so customers can see your real availability
        when booking a fitting call.
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="calendlyUrl"
          type="url"
          defaultValue={defaultValue}
          placeholder="https://calendly.com/your-name"
          maxLength={300}
          className="min-h-10 flex-1 rounded-tl-lg rounded-bl-lg border border-line bg-paper px-3 text-sm outline-none focus:border-wine"
        />
        <button
          disabled={pending}
          className="min-h-10 shrink-0 rounded-tr-lg rounded-br-lg border border-line px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save link"}
        </button>
      </form>
      {state.fieldErrors?.calendlyUrl?.[0] && (
        <p className="mt-2 text-xs text-wine">{state.fieldErrors.calendlyUrl[0]}</p>
      )}
      {state.message && (
        <p className={`mt-2 text-xs ${state.status === "error" ? "text-wine" : "text-sage"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
