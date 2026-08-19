"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { recordRefund } from "@/app/marketplace/actions";

export function AdminRefundActions({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  function record() {
    setError(null);
    startTransition(async () => {
      const result = await recordRefund(refundId, reference.trim());
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRecording(false);
      router.refresh();
    });
  }

  if (recording) {
    return (
      <div className="w-full space-y-2 sm:w-64">
        <input
          autoFocus
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Provider reference (bank/Paystack refund ID)…"
          className="w-full rounded-md border border-line bg-background p-2 text-xs outline-none"
        />
        {error && <p className="text-[11px] text-wine">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setRecording(false);
              setError(null);
            }}
            className="text-xs text-muted"
          >
            Cancel
          </button>
          <button
            disabled={pending || !reference.trim()}
            onClick={record}
            className="rounded-full bg-wine px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm refunded
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() => setRecording(true)}
        className="flex items-center gap-1 rounded-full bg-wine px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Undo2 size={13} /> Record refund sent
      </button>
      {error && <p className="text-[11px] text-wine">{error}</p>}
    </div>
  );
}
