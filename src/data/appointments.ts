import "server-only";

import * as Sentry from "@sentry/nextjs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Appointment, AppointmentStatus } from "@/lib/types";

// Hinted by column name (not the auto-generated FK constraint name) — more robust
// since it only depends on column names we control, not Postgres's naming convention.
const appointmentColumns =
  "id,request_id,order_id,customer_id,tailor_id,starts_at,ends_at,meeting_url,status,profiles!customer_id(display_name),tailor_profiles!tailor_id(profiles(display_name))";

function mapAppointmentRow(row: Record<string, unknown>): Appointment {
  const customer = row.profiles as Record<string, unknown> | null;
  const tailorProfile = row.tailor_profiles as Record<string, unknown> | null;
  const tailor = tailorProfile?.profiles as Record<string, unknown> | null;
  return {
    id: String(row.id),
    requestId: row.request_id ? String(row.request_id) : null,
    orderId: row.order_id ? String(row.order_id) : null,
    customerId: String(row.customer_id),
    customerName: String(customer?.display_name ?? "Customer"),
    tailorId: String(row.tailor_id),
    tailorName: String(tailor?.display_name ?? "Tailor"),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    meetingUrl: row.meeting_url ? String(row.meeting_url) : null,
    status: row.status as AppointmentStatus,
  };
}

function reportQueryError(area: string, error: { message: string } | null) {
  if (error) Sentry.captureException(new Error(error.message), { tags: { area } });
}

export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("appointments").select(appointmentColumns).eq("customer_id", customerId).neq("status", "cancelled").order("starts_at");
  reportQueryError("appointments_customer_query", error);
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapAppointmentRow);
}

export async function getTailorAppointments(tailorId: string): Promise<Appointment[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("appointments").select(appointmentColumns).eq("tailor_id", tailorId).neq("status", "cancelled").order("starts_at");
  reportQueryError("appointments_tailor_query", error);
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapAppointmentRow);
}

export async function getAppointmentsForOrder(orderId: string): Promise<Appointment[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("appointments").select(appointmentColumns).eq("order_id", orderId).order("starts_at");
  reportQueryError("appointments_order_query", error);
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapAppointmentRow);
}
