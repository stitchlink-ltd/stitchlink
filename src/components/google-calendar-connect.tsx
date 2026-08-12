"use client";

import { CalendarCheck, CalendarX } from "lucide-react";
import { useState } from "react";

type Props = { connected: boolean; googleEmail: string | null; syncMilestones: boolean };

export function GoogleCalendarConnect({ connected, googleEmail, syncMilestones }: Props) {
  const [busy, setBusy] = useState(false);
  const [milestones, setMilestones] = useState(syncMilestones);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/integrations/google-calendar/disconnect", { method: "POST" });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function toggleMilestones(next: boolean) {
    setMilestones(next);
    await fetch("/api/integrations/google-calendar/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }) });
  }

  return (
    <div className="mt-5 rounded-2xl bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${connected ? "bg-sage/10 text-sage" : "bg-blue/10 text-blue"}`}>
            {connected ? <CalendarCheck size={18} /> : <CalendarX size={18} />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Google Calendar</p>
            <p className="mt-1 font-semibold">{connected ? googleEmail ?? "Connected" : "Not connected"}</p>
          </div>
        </div>
        {connected ? (
          <button onClick={disconnect} disabled={busy} className="rounded-full border border-line px-4 py-2 text-xs font-semibold disabled:opacity-50">Disconnect</button>
        ) : (
          <a href="/api/integrations/google-calendar/connect" className="rounded-full bg-wine px-4 py-2 text-xs font-semibold text-white">Connect</a>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {connected
          ? "Fitting calls you book automatically sync with a Google Meet link and a calendar invite."
          : "Connect your calendar to get fitting calls synced with an automatic Google Meet link and invite."}
      </p>
      {connected && (
        <label className="mt-4 flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={milestones} onChange={(event) => toggleMilestones(event.target.checked)} className="size-4" />
          Also sync order due dates &amp; delivery reminders
        </label>
      )}
    </div>
  );
}
