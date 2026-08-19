"use client";

import { useActionState, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { appointmentInitialState, bookAppointment } from "@/app/appointments/actions";
import type { CustomerEngagement } from "@/data/marketplace";

type Props = {
  tailorId?: string;
  requestId?: string;
  orderId?: string;
  calendlyUrl?: string;
  engagements?: CustomerEngagement[];
};

export function BookAppointmentForm({ tailorId, requestId, orderId, calendlyUrl, engagements = [] }: Props) {
  const [state, action, pending] = useActionState(bookAppointment, appointmentInitialState);
  const [ids, setIds] = useState({
    tailorId: tailorId ?? "",
    requestId: requestId ?? "",
    orderId: orderId ?? "",
  });
  const [selectedCalendlyUrl, setSelectedCalendlyUrl] = useState(calendlyUrl ?? "");
  // Starts as "UTC" during SSR/hydration (server doesn't know the browser's zone),
  // then corrected to the real zone right after mount — the datetime-local value is
  // meaningless without knowing which timezone it was picked in.
  const [timeZone, setTimeZone] = useState("UTC");
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  function selectEngagement(event: React.ChangeEvent<HTMLSelectElement>) {
    const engagement = engagements[Number(event.target.value)];
    if (!engagement) return;
    setIds({
      tailorId: engagement.tailorId,
      requestId: engagement.requestId,
      orderId: engagement.orderId ?? "",
    });
    setSelectedCalendlyUrl(engagement.calendlyUrl ?? "");
  }

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="timeZone" value={timeZone} />
      <input type="hidden" name="tailorId" value={ids.tailorId} />
      <input type="hidden" name="requestId" value={ids.requestId} />
      <input type="hidden" name="orderId" value={ids.orderId} />
      {engagements.length > 0 ? (
        <label className="text-xs text-muted sm:col-span-2">
          Book with
          <select
            defaultValue=""
            onChange={selectEngagement}
            className="mt-1 min-h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Choose a tailor &amp; outfit
            </option>
            {engagements.map((engagement, index) => (
              <option key={engagement.requestId} value={index}>
                {engagement.tailorName} — {engagement.garmentType}
              </option>
            ))}
          </select>
        </label>
      ) : !ids.tailorId ? (
        <p className="text-xs text-muted sm:col-span-2">
          You don&apos;t have an active tailor request yet — book from an accepted request or order.
        </p>
      ) : null}
      {selectedCalendlyUrl && (
        <div className="sm:col-span-2 rounded-xl border border-line bg-background p-4">
          <p className="text-xs font-semibold">Prefer to see real-time availability?</p>
          <a
            href={selectedCalendlyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-wine"
          >
            View available times on Calendly <ExternalLink size={12} />
          </a>
          <p className="mt-2 text-xs text-muted">Or pick a time below and we&apos;ll confirm it directly.</p>
        </div>
      )}
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
      <button
        disabled={pending || !ids.tailorId}
        className="sm:col-span-2 rounded-full bg-wine px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Booking…" : "Book fitting call"}
      </button>
    </form>
  );
}
