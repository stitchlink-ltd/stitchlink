import "server-only";
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { dispatchNotification } from "@/lib/notification-dispatch";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken,
  updateCalendarEvent,
} from "@/lib/google-calendar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  sync_milestones: boolean;
};

async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: token } = await admin
    .from("google_calendar_tokens")
    .select("access_token,refresh_token,expires_at,sync_milestones")
    .eq("user_id", userId)
    .maybeSingle();
  const row = token as TokenRow | null;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return row.access_token;
  const refreshed = await refreshAccessToken(row.refresh_token);
  await admin
    .from("google_calendar_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);
  return refreshed.access_token;
}

type AppointmentRow = {
  id: string;
  customer_id: string;
  tailor_id: string;
  starts_at: string;
  ends_at: string;
  google_event_id: string | null;
  calendar_owner_id: string | null;
};

async function loadAppointment(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  appointmentId: string
) {
  const { data } = await admin
    .from("appointments")
    .select("id,customer_id,tailor_id,starts_at,ends_at,google_event_id,calendar_owner_id")
    .eq("id", appointmentId)
    .single();
  return data as AppointmentRow | null;
}

async function profileEmailAndTimezone(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string
) {
  const [{ data: profile }, { data: userData }] = await Promise.all([
    admin.from("profiles").select("timezone").eq("id", userId).single(),
    admin.auth.admin.getUserById(userId),
  ]);
  return {
    email: userData.user?.email ?? undefined,
    timezone: (profile as { timezone?: string } | null)?.timezone ?? "UTC",
  };
}

export async function syncAppointmentToCalendar(appointmentId: string) {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const appointment = await loadAppointment(admin, appointmentId);
    if (!appointment) return;

    const tailorToken = await getValidAccessToken(appointment.tailor_id);
    const customerToken = tailorToken ? null : await getValidAccessToken(appointment.customer_id);
    const calendarOwnerId = tailorToken
      ? appointment.tailor_id
      : customerToken
        ? appointment.customer_id
        : null;
    if (!calendarOwnerId) return;
    const accessToken = tailorToken ?? customerToken!;

    const [customer, tailor] = await Promise.all([
      profileEmailAndTimezone(admin, appointment.customer_id),
      profileEmailAndTimezone(admin, appointment.tailor_id),
    ]);
    const owner = calendarOwnerId === appointment.tailor_id ? tailor : customer;

    const event = await createCalendarEvent({
      accessToken,
      summary: "Fitting call — StitchLink",
      description: "Measurement/fitting call booked through StitchLink.",
      startIso: appointment.starts_at,
      endIso: appointment.ends_at,
      timeZone: owner.timezone,
      attendees: [customer.email, tailor.email].filter((email): email is string => Boolean(email)),
      withMeet: true,
      requestId: appointment.id,
      reminders: [{ method: "popup", minutes: 60 }],
    });

    await admin
      .from("appointments")
      .update({
        google_event_id: event.id,
        calendar_owner_id: calendarOwnerId,
        meeting_url: event.hangoutLink ?? null,
      })
      .eq("id", appointmentId);
    dispatchNotification({
      userId: calendarOwnerId,
      title: "Synced to Google Calendar",
      body: "Your fitting call now includes a Google Meet link.",
      href: "/customer/appointments",
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "calendar_sync_appointment" },
      extra: { appointmentId },
    });
  }
}

export async function updateAppointmentCalendarEvent(appointmentId: string) {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const appointment = await loadAppointment(admin, appointmentId);
    if (!appointment) return;
    if (!appointment.google_event_id || !appointment.calendar_owner_id) {
      await syncAppointmentToCalendar(appointmentId);
      return;
    }
    const accessToken = await getValidAccessToken(appointment.calendar_owner_id);
    if (!accessToken) return;
    const [customer, tailor] = await Promise.all([
      profileEmailAndTimezone(admin, appointment.customer_id),
      profileEmailAndTimezone(admin, appointment.tailor_id),
    ]);
    const owner = appointment.calendar_owner_id === appointment.tailor_id ? tailor : customer;
    const event = await updateCalendarEvent({
      accessToken,
      eventId: appointment.google_event_id,
      summary: "Fitting call — StitchLink",
      startIso: appointment.starts_at,
      endIso: appointment.ends_at,
      timeZone: owner.timezone,
      attendees: [customer.email, tailor.email].filter((email): email is string => Boolean(email)),
      withMeet: true,
      requestId: appointment.id,
      reminders: [{ method: "popup", minutes: 60 }],
    });
    await admin
      .from("appointments")
      .update({ meeting_url: event.hangoutLink ?? null })
      .eq("id", appointmentId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "calendar_sync_appointment_update" },
      extra: { appointmentId },
    });
  }
}

export async function cancelAppointmentCalendarEvent(appointmentId: string) {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const appointment = await loadAppointment(admin, appointmentId);
    if (!appointment?.google_event_id || !appointment.calendar_owner_id) return;
    const accessToken = await getValidAccessToken(appointment.calendar_owner_id);
    if (accessToken)
      await deleteCalendarEvent({
        accessToken,
        eventId: appointment.google_event_id,
        notifyAttendees: true,
      });
    await admin
      .from("appointments")
      .update({ google_event_id: null, calendar_owner_id: null })
      .eq("id", appointmentId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "calendar_sync_appointment_cancel" },
      extra: { appointmentId },
    });
  }
}

type OrderRow = {
  id: string;
  reference: string;
  customer_id: string;
  tailor_id: string;
  due_date: string;
};

function addDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// We don't track a carrier-confirmed delivery timestamp (only shipment time and the
// customer's own confirm-delivery click), so this is a deliberately generous estimate
// of international transit time — not a precise ETA. Kept separate from
// payoutReleaseAt() in orders.ts, which answers a different question (when a tailor's
// payout auto-releases after delivery) and is far too soon to double as a delivery estimate.
const ESTIMATED_TRANSIT_MS = 5 * 24 * 60 * 60 * 1000;

async function syncOrderMilestoneToCalendar(
  orderId: string,
  milestoneType: "due_date" | "delivery_reminder"
) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { data: order } = await admin
    .from("orders")
    .select("id,reference,customer_id,tailor_id,due_date")
    .eq("id", orderId)
    .single();
  const row = order as OrderRow | null;
  if (!row) return;

  let eventInputBase: { summary: string; description?: string } & (
    | { allDay: true; startDate: string; endDate: string }
    | { allDay?: false; startIso: string; endIso: string }
  );
  if (milestoneType === "due_date") {
    eventInputBase = {
      summary: `Order due: ${row.reference}`,
      allDay: true,
      startDate: row.due_date,
      endDate: addDays(row.due_date, 1),
    };
  } else {
    const { data: delivery } = await admin
      .from("deliveries")
      .select("shipped_at")
      .eq("order_id", orderId)
      .single();
    const shippedAt = (delivery as { shipped_at: string | null } | null)?.shipped_at;
    if (!shippedAt) return;
    const startIso = new Date(new Date(shippedAt).getTime() + ESTIMATED_TRANSIT_MS).toISOString();
    const endIso = new Date(new Date(startIso).getTime() + 30 * 60 * 1000).toISOString();
    eventInputBase = {
      summary: `Check delivery: ${row.reference}`,
      description:
        "Estimated arrival based on shipment date — if it hasn't arrived yet, no action needed.",
      startIso,
      endIso,
    };
  }

  for (const userId of [row.customer_id, row.tailor_id]) {
    try {
      const { data: token } = await admin
        .from("google_calendar_tokens")
        .select("sync_milestones")
        .eq("user_id", userId)
        .maybeSingle();
      if (!(token as { sync_milestones: boolean } | null)?.sync_milestones) continue;
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) continue;
      const { timezone } = await profileEmailAndTimezone(admin, userId);

      const { data: existing } = await admin
        .from("order_calendar_events")
        .select("google_event_id")
        .eq("order_id", orderId)
        .eq("user_id", userId)
        .eq("milestone_type", milestoneType)
        .maybeSingle();

      const eventInput = eventInputBase.allDay
        ? { accessToken, ...eventInputBase }
        : {
            accessToken,
            ...eventInputBase,
            timeZone: timezone,
            reminders: [{ method: "popup" as const, minutes: 60 }],
          };
      const event = existing
        ? await updateCalendarEvent({
            ...eventInput,
            eventId: (existing as { google_event_id: string }).google_event_id,
          })
        : await createCalendarEvent(eventInput);

      await admin.from("order_calendar_events").upsert(
        {
          order_id: orderId,
          user_id: userId,
          milestone_type: milestoneType,
          google_event_id: event.id,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "order_id,user_id,milestone_type" }
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: "calendar_sync_order_milestone" },
        extra: { orderId, userId, milestoneType },
      });
    }
  }
}

export function scheduleOrderMilestoneSync(
  orderId: string,
  milestoneType: "due_date" | "delivery_reminder"
) {
  after(() => syncOrderMilestoneToCalendar(orderId, milestoneType));
}

export function scheduleAppointmentSync(appointmentId: string) {
  after(() => syncAppointmentToCalendar(appointmentId));
}

export function scheduleAppointmentUpdate(appointmentId: string) {
  after(() => updateAppointmentCalendarEvent(appointmentId));
}

export function scheduleAppointmentCancel(appointmentId: string) {
  after(() => cancelAppointmentCalendarEvent(appointmentId));
}
