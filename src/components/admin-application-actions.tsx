"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { reviewApplication } from "@/app/marketplace/actions";

export function AdminApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function review(approved: boolean, note = "") {
    setError(null);
    startTransition(async () => {
      const result = await reviewApplication(applicationId, approved, note);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRejecting(false);
      router.refresh();
    });
  }

  if (rejecting) {
    return (
      <div className="w-full space-y-2 sm:w-64">
        <textarea
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for rejection (shown to the tailor)…"
          rows={2}
          className="w-full resize-none rounded-md border border-line bg-background p-2 text-xs outline-none"
        />
        {error && <p className="text-[11px] text-wine">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setRejecting(false);
              setError(null);
            }}
            className="text-xs text-muted"
          >
            Cancel
          </button>
          <button
            disabled={pending || !reason.trim()}
            onClick={() => review(false, reason.trim())}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm reject
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => setRejecting(true)}
          className="flex items-center gap-1 rounded-full border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={13} /> Reject
        </button>
        <button
          disabled={pending}
          onClick={() => review(true)}
          className="flex items-center gap-1 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={13} /> Approve
        </button>
      </div>
      {error && <p className="text-[11px] text-wine">{error}</p>}
    </div>
  );
}
