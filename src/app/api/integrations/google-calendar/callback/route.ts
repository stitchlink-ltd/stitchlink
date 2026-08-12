import { cookies } from "next/headers";
import { exchangeCodeForTokens, fetchGoogleUserEmail, googleCalendarConfigured } from "@/lib/google-calendar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GOOGLE_CALENDAR_STATE_COOKIE } from "../connect/route";

export async function GET(request: Request) {
  const redirectTo = (path: string) => Response.redirect(new URL(path, request.url));
  if (!googleCalendarConfigured()) return redirectTo("/account?calendar=error");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_CALENDAR_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_CALENDAR_STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) return redirectTo("/account?calendar=error");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return redirectTo("/account?calendar=error");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectTo("/sign-in");

  const admin = createSupabaseAdminClient();
  if (!admin) return redirectTo("/account?calendar=error");

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleEmail = await fetchGoogleUserEmail(tokens.access_token);
    const { error } = await admin.from("google_calendar_tokens").upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        google_email: googleEmail,
      },
      { onConflict: "user_id" },
    );
    if (error) return redirectTo("/account?calendar=error");
    return redirectTo("/account?calendar=connected");
  } catch {
    return redirectTo("/account?calendar=error");
  }
}
