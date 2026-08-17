"use client";

import { useActionState } from "react";
import { addProgress } from "@/app/marketplace/actions";
import { marketplaceInitialState } from "@/lib/marketplace-state";

const stages = ["design", "materials", "cutting", "sewing", "fitting", "finishing", "ready"] as const;

export function UpdateStageForm({ orderId, currentStage }: { orderId: string; currentStage: string }) {
  const [state, action, pending] = useActionState(addProgress, marketplaceInitialState);
  return (
    <form action={action} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[140px_1fr_auto] sm:items-start">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="imagePaths" value="[]" />
      <select name="stage" defaultValue={currentStage} className="min-h-10 rounded-lg border border-line bg-background px-3 text-sm">
        {stages.map((stage) => (
          <option key={stage} value={stage}>
            {stage}
          </option>
        ))}
      </select>
      <input name="note" required minLength={3} maxLength={2000} placeholder="What changed for the client?" className="min-h-10 rounded-lg border border-line bg-background px-3 text-sm" />
      <button disabled={pending} className="min-h-10 rounded-full bg-wine px-4 text-xs font-semibold text-white disabled:opacity-60">
        {pending ? "Updating…" : "Update stage"}
      </button>
      {state.message && <p className={`sm:col-span-3 text-xs ${state.status === "error" ? "text-wine" : "text-sage"}`}>{state.message}</p>}
    </form>
  );
}
