"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { setTryOnReady } from "@/app/marketplace/actions";

export function TryOnReadyToggle({ orderId, ready }: { orderId: string; ready: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    setError("");
    startTransition(async () => {
      const result = await setTryOnReady(orderId, !ready);
      if (result.status === "error") {
        setError(result.message ?? "Unable to update try-on status.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
          ready ? "border-sage bg-sage/10 text-sage" : "border-line text-muted hover:bg-background"
        }`}
      >
        {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {ready ? "Ready for try-on" : "Mark ready for try-on"}
      </button>
      {error && <p className="text-xs text-wine">{error}</p>}
    </div>
  );
}
