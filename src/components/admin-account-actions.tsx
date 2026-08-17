"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { updateAccountStatus } from "@/app/marketplace/actions";

export function AdminAccountActions({
  userId,
  role,
  accountStatus,
}: {
  userId: string;
  role: "customer" | "tailor" | "admin";
  accountStatus: "active" | "suspended";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply(nextStatus: "active" | "suspended", note = "") {
    setError(null);
    startTransition(async () => {
      const result = await updateAccountStatus(userId, role, nextStatus, note);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setSuspending(false);
      router.refresh();
    });
  }

  if (suspending) {
    return (
      <div className="w-full space-y-2 sm:w-64">
        <textarea
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for suspension (shown to the account holder)…"
          rows={2}
          className="w-full resize-none rounded-md border border-line bg-background p-2 text-xs outline-none"
        />
        {error && <p className="text-[11px] text-wine">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setSuspending(false);
              setError(null);
            }}
            className="text-xs text-muted"
          >
            Cancel
          </button>
          <button
            disabled={pending || !reason.trim()}
            onClick={() => apply("suspended", reason.trim())}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm suspend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {accountStatus === "suspended" ? (
        <button
          disabled={pending}
          onClick={() => apply("active")}
          className="flex items-center gap-1 rounded-full border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck size={13} /> Reactivate
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => setSuspending(true)}
          className="flex items-center gap-1 rounded-full border border-line px-3 py-2 text-xs font-semibold text-wine disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldOff size={13} /> Suspend
        </button>
      )}
      {error && <p className="text-[11px] text-wine">{error}</p>}
    </div>
  );
}
