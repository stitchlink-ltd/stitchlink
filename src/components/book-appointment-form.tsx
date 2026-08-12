"use client";

import { useActionState, useEffect, useState } from "react";
import { appointmentInitialState, bookAppointment } from "@/app/appointments/actions";

type Props = { tailorId?: string; requestId?: string; orderId?: string };

export function BookAppointmentForm({ tailorId, requestId, orderId }: Props) {
  const [state, action, pending] = useActionState(bookAppointment, appointmentInitialState);
  // Starts as "UTC" during SSR/hydration (server doesn't know the browser's zone),
  // then corrected to the real zone right after mount — the datetime-local value is
  // meaningless without knowing which timezone it was picked in.
  const [timeZone, setTimeZone] = useState("UTC");
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="timeZone" value={timeZone} />
      <label className="text-xs text-muted sm:col-span-2">
        Tailor ID
        <input name="tailorId" defaultValue={tailorId} required className="mt-1 min-h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
      </label>
      <label className="text-xs text-muted">
        Request ID (optional)
        <input name="requestId" defaultValue={requestId} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
      </label>
      <label className="text-xs text-muted">
        Order ID (optional)
        <input name="orderId" defaultValue={orderId} className="mt-1 min-h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
      </label>
      <label className="text-xs text-muted">
        Date &amp; time <span className="text-[10px]">({timeZone})</span>
        <input name="startsAt" type="datetime-local" required className="mt-1 min-h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
      </label>
      <label className="text-xs text-muted">
        Duration
        <select name="durationMinutes" defaultValue="30" className="mt-1 min-h-10 w-full rounded-lg border border-line bg-background px-3 text-sm">
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </select>
      </label>
      {state.message && <p className={`sm:col-span-2 text-xs ${state.status === "error" ? "text-wine" : "text-sage"}`}>{state.message}</p>}
      <button disabled={pending} className="sm:col-span-2 rounded-full bg-wine px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Booking…" : "Book fitting call"}
      </button>
    </form>
  );
}
