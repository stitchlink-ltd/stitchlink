import { CalendarDays, Clock3, Video } from "lucide-react";
import { CancelAppointmentButton } from "@/components/appointment-actions";
import { SectionPlaceholder } from "@/components/section-placeholder";
import { requireRole } from "@/data/auth";
import { getCustomerAppointments } from "@/data/appointments";

export default async function AppointmentsPage() {
  const account = await requireRole("customer");
  const appointments = "demo" in account ? [] : await getCustomerAppointments(account.user.id);

  return (
    <SectionPlaceholder
      eyebrow="Measurement calls"
      title="Appointments"
      description="Times are shown in your local timezone and include an external meeting link."
      action={{ label: "Schedule call", href: "/customer/appointments/new" }}
    >
      {appointments.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line p-8 text-center">
          <CalendarDays className="text-muted" />
          <p className="mt-3 text-sm font-semibold">No appointments yet</p>
          <p className="mt-1 text-xs text-muted">Book from an active request or order.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="rounded-2xl border border-wine/25 bg-wine/5 p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-full bg-wine text-white"><Video size={17} /></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sage">{appointment.status}</span>
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Fit review with {appointment.tailorName}</h2>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted"><Clock3 size={13} /> {new Date(appointment.startsAt).toLocaleString()}</p>
              {appointment.meetingUrl ? (
                <a href={appointment.meetingUrl} target="_blank" rel="noreferrer" className="mt-5 block rounded-full border border-line bg-paper px-4 py-2 text-center text-xs font-semibold">Join Google Meet</a>
              ) : (
                <p className="mt-5 text-xs text-muted">Not synced to a calendar yet.</p>
              )}
              <CancelAppointmentButton appointmentId={appointment.id} />
            </article>
          ))}
        </div>
      )}
    </SectionPlaceholder>
  );
}
