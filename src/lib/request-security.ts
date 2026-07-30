import "server-only";

import { env } from "@/lib/env";

export function isSameSiteRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(env.NEXT_PUBLIC_SITE_URL).origin; } catch { return false; }
}

export function forbiddenResponse() {
  return Response.json({ error: "Invalid request origin" }, { status: 403 });
}
