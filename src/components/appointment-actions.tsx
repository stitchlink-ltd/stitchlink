"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment } from "@/app/appointments/actions";

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointment(appointmentId);
      if (result.status === "error") {
        setError(result.message ?? "Could not cancel this appointment.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button onClick={cancel} disabled={pending} className="mt-3 w-full rounded-full border border-line px-4 py-2 text-xs font-semibold disabled:opacity-50">
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {error && <p className="mt-2 text-[11px] text-wine">{error}</p>}
    </div>
  );
}
