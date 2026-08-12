"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccountOrDemo, requireRole } from "@/data/auth";
import { scheduleAppointmentCancel, scheduleAppointmentSync, scheduleAppointmentUpdate } from "@/lib/calendar-sync";
import { dispatchNotification } from "@/lib/notification-dispatch";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zonedDateTimeToUtc } from "@/lib/timezone";

export type AppointmentActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };
export const appointmentInitialState: AppointmentActionState = { status: "idle" };

// "YYYY-MM-DDTHH:mm" from <input type="datetime-local">, deliberately not z.coerce.date():
// that string has no timezone, so it must be resolved against the browser's timeZone
// (submitted alongside it) rather than parsed in the server's own local timezone.
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid date and time.");
const ianaTimeZone = z.string().min(1).max(64);

const bookSchema = z.object({
  tailorId: z.uuid(),
  requestId: z.uuid().optional(),
  orderId: z.uuid().optional(),
  startsAt: localDateTime,
  timeZone: ianaTimeZone,
  durationMinutes: z.enum(["30", "60"]),
});

function errorState(error: unknown): AppointmentActionState {
  return { status: "error", message: error instanceof Error ? error.message : "We could not complete that request." };
}

async function currentSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Appointment services are not configured.");
  return supabase;
}

function revalidateAppointments() {
  revalidatePath("/customer/appointments");
  revalidatePath("/tailor/appointments");
}

export async function bookAppointment(_state: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  const parsed = bookSchema.safeParse({
    tailorId: formData.get("tailorId"),
    requestId: formData.get("requestId") || undefined,
    orderId: formData.get("orderId") || undefined,
    startsAt: formData.get("startsAt"),
    timeZone: formData.get("timeZone") || "UTC",
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!parsed.data.requestId && !parsed.data.orderId) return { status: "error", message: "Choose a request or order for this call." };

  try {
    const account = await requireRole("customer");
    if ("demo" in account) return { status: "success", message: "Demo appointment booked." };
    const supabase = await currentSupabase();
    const startsAt = zonedDateTimeToUtc(parsed.data.startsAt, parsed.data.timeZone);
    const endsAt = new Date(startsAt.getTime() + Number(parsed.data.durationMinutes) * 60 * 1000);
    const { data: appointmentId, error } = await supabase.rpc("book_appointment", {
      p_tailor_id: parsed.data.tailorId,
      p_request_id: parsed.data.requestId ?? null,
      p_order_id: parsed.data.orderId ?? null,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
    });
    if (error) throw new Error(error.message);
    scheduleAppointmentSync(appointmentId as string);
    dispatchNotification({ userId: parsed.data.tailorId, title: "New fitting call booked", body: "A customer booked a fitting call with you.", href: "/tailor/appointments" });
    revalidateAppointments();
    return { status: "success", message: "Fitting call booked." };
  } catch (error) {
    return errorState(error);
  }
}

export async function cancelAppointment(appointmentId: string): Promise<AppointmentActionState> {
  try {
    const account = await requireAccountOrDemo();
    if ("demo" in account) return { status: "success" };
    const supabase = await currentSupabase();
    const { data: appointment } = await supabase.from("appointments").select("customer_id,tailor_id").eq("id", appointmentId).single();
    const { error } = await supabase.rpc("cancel_appointment", { p_appointment_id: appointmentId });
    if (error) throw new Error(error.message);
    scheduleAppointmentCancel(appointmentId);
    if (appointment) {
      const otherParty = account.user.id === appointment.customer_id ? appointment.tailor_id : appointment.customer_id;
      dispatchNotification({ userId: otherParty, title: "A fitting call was cancelled", body: "The other party cancelled a scheduled fitting call.", href: "/customer/appointments" });
    }
    revalidateAppointments();
    return { status: "success", message: "Appointment cancelled." };
  } catch (error) {
    return errorState(error);
  }
}

const rescheduleSchema = z.object({ appointmentId: z.uuid(), startsAt: localDateTime, timeZone: ianaTimeZone, durationMinutes: z.enum(["30", "60"]) });

export async function rescheduleAppointment(_state: AppointmentActionState, formData: FormData): Promise<AppointmentActionState> {
  const parsed = rescheduleSchema.safeParse({ appointmentId: formData.get("appointmentId"), startsAt: formData.get("startsAt"), timeZone: formData.get("timeZone") || "UTC", durationMinutes: formData.get("durationMinutes") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const account = await requireAccountOrDemo();
    if ("demo" in account) return { status: "success" };
    const supabase = await currentSupabase();
    const startsAt = zonedDateTimeToUtc(parsed.data.startsAt, parsed.data.timeZone);
    const endsAt = new Date(startsAt.getTime() + Number(parsed.data.durationMinutes) * 60 * 1000);
    const { data: appointment } = await supabase.from("appointments").select("customer_id,tailor_id").eq("id", parsed.data.appointmentId).single();
    const { error } = await supabase.rpc("reschedule_appointment", { p_appointment_id: parsed.data.appointmentId, p_starts_at: startsAt.toISOString(), p_ends_at: endsAt.toISOString() });
    if (error) throw new Error(error.message);
    scheduleAppointmentUpdate(parsed.data.appointmentId);
    if (appointment) {
      const otherParty = account.user.id === appointment.customer_id ? appointment.tailor_id : appointment.customer_id;
      dispatchNotification({ userId: otherParty, title: "A fitting call was rescheduled", body: "The other party rescheduled a fitting call.", href: "/customer/appointments" });
    }
    revalidateAppointments();
    return { status: "success", message: "Appointment rescheduled." };
  } catch (error) {
    return errorState(error);
  }
}
