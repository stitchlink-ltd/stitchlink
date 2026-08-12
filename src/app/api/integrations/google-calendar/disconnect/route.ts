import { revokeGoogleToken } from "@/lib/google-calendar";
import { enforceRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { forbiddenResponse, isSameSiteRequest } from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return forbiddenResponse();
  const rate = await enforceRateLimit("gcal-disconnect", requestIdentifier(request), 10);
  if (!rate.success) return Response.json({ error: "Too many attempts" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "Not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ error: "Not configured" }, { status: 503 });
  const { data: token } = await admin.from("google_calendar_tokens").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (token) {
    try { await revokeGoogleToken((token as { refresh_token: string }).refresh_token); } catch { /* token may already be invalid */ }
    await admin.from("google_calendar_tokens").delete().eq("user_id", user.id);
  }
  return Response.json({ ok: true });
}
