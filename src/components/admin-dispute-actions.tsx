"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";
import { resolveDispute } from "@/app/marketplace/actions";

type ResolutionStatus = "resolved_refund" | "resolved_partial" | "resolved_no_refund" | "closed";

export function AdminDisputeActions({ disputeId, frozenAmountKobo }: { disputeId: string; frozenAmountKobo: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resolving, setResolving] = useState(false);
  const [status, setStatus] = useState<ResolutionStatus>("resolved_no_refund");
  const [notes, setNotes] = useState("");
  const [refundNgn, setRefundNgn] = useState(String(frozenAmountKobo / 100));
  const [error, setError] = useState<string | null>(null);

  const needsRefundAmount = status === "resolved_refund" || status === "resolved_partial";

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await resolveDispute(disputeId, status, notes.trim(), needsRefundAmount ? Number(refundNgn) : 0);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setResolving(false);
      router.refresh();
    });
  }

  if (resolving) {
    return (
      <div className="w-full space-y-2 sm:w-72">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ResolutionStatus)}
          className="w-full rounded-md border border-line bg-background p-2 text-xs outline-none"
        >
          <option value="resolved_no_refund">No refund — dismiss</option>
          <option value="resolved_partial">Partial refund</option>
          <option value="resolved_refund">Full refund</option>
          <option value="closed">Close case, no action</option>
        </select>
        {needsRefundAmount && (
          <input
            type="number"
            min={0}
            step="any"
            value={refundNgn}
            onChange={(event) => setRefundNgn(event.target.value)}
            placeholder="Refund amount (NGN)"
            className="w-full rounded-md border border-line bg-background p-2 text-xs outline-none"
          />
        )}
        <textarea
          autoFocus
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Resolution notes (shown to the customer)…"
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-background p-2 text-xs outline-none"
        />
        {error && <p className="text-[11px] text-wine">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setResolving(false);
              setError(null);
            }}
            className="text-xs text-muted"
          >
            Cancel
          </button>
          <button
            disabled={pending || notes.trim().length < 3}
            onClick={submit}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm resolution
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() => setResolving(true)}
        className="flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Gavel size={13} /> Review case
      </button>
      {error && <p className="text-[11px] text-wine">{error}</p>}
    </div>
  );
}
