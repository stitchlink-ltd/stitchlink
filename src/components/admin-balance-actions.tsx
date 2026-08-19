"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";
import { createBalanceLink } from "@/app/marketplace/actions";

export function AdminBalanceActions({
  orderId,
  balancePaymentStatus,
}: {
  orderId: string;
  balancePaymentStatus: "pending" | "successful" | "failed" | "refunded" | "partially_refunded" | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await createBalanceLink(orderId);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setSent(true);
      router.refresh();
    });
  }

  if (balancePaymentStatus === "successful") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-sage">
        <Check size={13} /> Balance settled
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={send}
        className="flex items-center gap-1 rounded-full bg-wine px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send size={13} /> {balancePaymentStatus === "pending" || sent ? "Resend balance link" : "Send balance link"}
      </button>
      {error && <p className="text-[11px] text-wine">{error}</p>}
    </div>
  );
}
