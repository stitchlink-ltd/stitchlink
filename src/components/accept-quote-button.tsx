"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { acceptQuote } from "@/app/marketplace/actions";

export function AcceptQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptQuote(quoteId);
      if (result.status === "error") {
        setError(result.message ?? "Unable to accept this quote.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={accept}
        className="flex items-center gap-1.5 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
        Accept quote
      </button>
      {error && <p className="mt-1.5 text-[11px] text-wine">{error}</p>}
    </div>
  );
}
