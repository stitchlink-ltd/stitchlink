import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, googleCalendarConfigured } from "@/lib/google-calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const GOOGLE_CALENDAR_STATE_COOKIE = "stitchlink_gcal_state";

export async function GET(request: Request) {
  if (!googleCalendarConfigured()) return Response.json({ error: "Google Calendar is not configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "Not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.redirect(new URL("/sign-in", request.url));

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_CALENDAR_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });

  return Response.redirect(buildGoogleAuthUrl(state));
}
