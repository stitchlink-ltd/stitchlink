import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "./env";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";

export function googleCalendarConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

export function buildGoogleAuthUrl(state: string) {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope: string };

export async function exchangeCodeForTokens(code: string) {
  if (!googleCalendarConfigured()) throw new Error("Google Calendar is not configured");
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: env.GOOGLE_REDIRECT_URI!, grant_type: "authorization_code" }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description ?? "Google token exchange failed");
  return payload as TokenResponse & { refresh_token: string };
}

export async function refreshAccessToken(refreshToken: string) {
  if (!googleCalendarConfigured()) throw new Error("Google Calendar is not configured");
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description ?? "Google token refresh failed");
  return payload as { access_token: string; expires_in: number };
}

export async function revokeGoogleToken(token: string) {
  await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, { method: "POST", cache: "no-store" });
}

export async function fetchGoogleUserEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json();
  return typeof payload.email === "string" ? payload.email : null;
}

type ReminderOverride = { method: "popup" | "email"; minutes: number };

type TimedEventInput = { allDay?: false; startIso: string; endIso: string; timeZone: string };
type AllDayEventInput = { allDay: true; startDate: string; endDate: string };

type EventInput = {
  accessToken: string;
  calendarId?: string;
  summary: string;
  description?: string;
  attendees?: string[];
  withMeet?: boolean;
  requestId?: string;
  reminders?: ReminderOverride[];
} & (TimedEventInput | AllDayEventInput);

type CalendarEvent = { id: string; htmlLink: string; hangoutLink?: string };

function eventBody(input: EventInput) {
  return {
    summary: input.summary,
    description: input.description,
    start: input.allDay ? { date: input.startDate } : { dateTime: input.startIso, timeZone: input.timeZone },
    end: input.allDay ? { date: input.endDate } : { dateTime: input.endIso, timeZone: input.timeZone },
    attendees: input.attendees?.map((email) => ({ email })),
    conferenceData: input.withMeet ? { createRequest: { requestId: input.requestId ?? randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } } : undefined,
    reminders: input.reminders ? { useDefault: false, overrides: input.reminders } : { useDefault: true },
  };
}

function eventUrl(input: EventInput, eventId?: string) {
  const calendarId = input.calendarId ?? "primary";
  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ""}`);
  if (input.withMeet) url.searchParams.set("conferenceDataVersion", "1");
  if (input.attendees?.length) url.searchParams.set("sendUpdates", "all");
  return url.toString();
}

export async function createCalendarEvent(input: EventInput): Promise<CalendarEvent> {
  const response = await fetch(eventUrl(input), {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody(input)),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Failed to create calendar event");
  return { id: payload.id, htmlLink: payload.htmlLink, hangoutLink: payload.hangoutLink };
}

export async function updateCalendarEvent(input: EventInput & { eventId: string }): Promise<CalendarEvent> {
  const response = await fetch(eventUrl(input, input.eventId), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody(input)),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Failed to update calendar event");
  return { id: payload.id, htmlLink: payload.htmlLink, hangoutLink: payload.hangoutLink };
}

export async function deleteCalendarEvent(input: { accessToken: string; calendarId?: string; eventId: string; notifyAttendees?: boolean }): Promise<void> {
  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId ?? "primary")}/events/${encodeURIComponent(input.eventId)}`);
  if (input.notifyAttendees) url.searchParams.set("sendUpdates", "all");
  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to delete calendar event");
  }
}
