import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BookAppointmentForm } from "@/components/book-appointment-form";
import { DashboardHeading, Panel } from "@/components/dashboard-ui";
import { requireRole } from "@/data/auth";

export default async function NewAppointmentPage({ searchParams }: PageProps<"/customer/appointments/new">) {
  await requireRole("customer");
  const { tailorId, orderId, requestId } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/customer/appointments" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-muted">
        <ChevronLeft size={14} /> Appointments
      </Link>
      <DashboardHeading eyebrow="Measurement calls" title="Schedule a fitting call" description="Pick a time with your tailor. If you've connected Google Calendar, we'll add a Meet link automatically." />
      <Panel className="p-6 sm:p-8">
        <BookAppointmentForm
          tailorId={typeof tailorId === "string" ? tailorId : undefined}
          orderId={typeof orderId === "string" ? orderId : undefined}
          requestId={typeof requestId === "string" ? requestId : undefined}
        />
      </Panel>
    </div>
  );
}
