import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BookAppointmentForm } from "@/components/book-appointment-form";
import { DashboardHeading, Panel } from "@/components/dashboard-ui";
import { requireRole } from "@/data/auth";
import { getCustomerEngagements } from "@/data/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewAppointmentPage({ searchParams }: PageProps<"/customer/appointments/new">) {
  const account = await requireRole("customer");
  const { tailorId, orderId, requestId } = await searchParams;
  const resolvedTailorId = typeof tailorId === "string" ? tailorId : undefined;
  const isDemo = "demo" in account;
  const engagements = isDemo ? [] : await getCustomerEngagements(account.user.id);

  let calendlyUrl: string | undefined;
  if (!isDemo && resolvedTailorId && !engagements.some((engagement) => engagement.tailorId === resolvedTailorId)) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("tailor_profiles")
        .select("calendly_url")
        .eq("user_id", resolvedTailorId)
        .maybeSingle();
      calendlyUrl = data?.calendly_url ?? undefined;
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/customer/appointments" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-muted">
        <ChevronLeft size={14} /> Appointments
      </Link>
      <DashboardHeading eyebrow="Measurement calls" title="Schedule a fitting call" description="Pick a time with your tailor. If you've connected Google Calendar, we'll add a Meet link automatically." />
      <Panel className="p-6 sm:p-8">
        <BookAppointmentForm
          engagements={engagements}
          tailorId={resolvedTailorId}
          orderId={typeof orderId === "string" ? orderId : undefined}
          requestId={typeof requestId === "string" ? requestId : undefined}
          calendlyUrl={calendlyUrl}
        />
      </Panel>
    </div>
  );
}
