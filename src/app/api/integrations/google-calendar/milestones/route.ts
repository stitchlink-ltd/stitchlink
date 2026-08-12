import { z } from "zod";
import { enforceRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { forbiddenResponse, isSameSiteRequest } from "@/lib/request-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ enabled: z.boolean() });

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return forbiddenResponse();
  const rate = await enforceRateLimit("gcal-milestones", requestIdentifier(request), 20);
  if (!rate.success) return Response.json({ error: "Too many attempts" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "Not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  const { error } = await supabase.rpc("set_calendar_milestone_sync", { p_enabled: parsed.data.enabled });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
