import { CalendarDays, Clock3 } from "lucide-react";
import { CancelAppointmentButton } from "@/components/appointment-actions";
import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/data/auth";
import { getTailorAppointments } from "@/data/appointments";

export default async function TailorAppointmentsPage() {
  const account = await requireRole("tailor");
  const appointments = "demo" in account ? [] : await getTailorAppointments(account.user.id);

  return (
    <SectionPlaceholder eyebrow="Fit calendar" title="Appointments" description="Measurement and fitting calls with timezone-aware customer times.">
      {appointments.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line p-8 text-center">
          <CalendarDays className="text-muted" />
          <p className="mt-3 text-sm font-semibold">No appointments yet</p>
          <p className="mt-1 text-xs text-muted">Customers can book a fitting call from an active request or order.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="rounded-xl border border-line bg-background p-4 text-sm font-semibold">
              <div className="flex items-center gap-1 text-xs font-normal text-muted"><Clock3 size={13} /> {new Date(appointment.startsAt).toLocaleString()}</div>
              <p className="mt-1">{appointment.customerName}</p>
              <p className="mt-1 text-xs font-normal text-muted">{appointment.meetingUrl ? "Google Meet link confirmed" : "Not synced to a calendar yet"}</p>
              <CancelAppointmentButton appointmentId={appointment.id} />
            </div>
          ))}
        </div>
      )}
    </SectionPlaceholder>
  );
}
