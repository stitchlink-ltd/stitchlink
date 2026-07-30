import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
  : null;

const limiters = new Map<string, Ratelimit>();

function limiter(name: string, limit: number) {
  if (!redis) return null;
  const existing = limiters.get(name);
  if (existing) return existing;
  const created = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, "1 m"), analytics: false, prefix: `stitchlink:${name}` });
  limiters.set(name, created);
  return created;
}

export async function enforceRateLimit(name: string, identifier: string, limit = 10) {
  const active = limiter(name, limit);
  if (!active) return { success: true, retryAfter: 0 };
  const result = await active.limit(identifier);
  return { success: result.success, retryAfter: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)) };
}

export function requestIdentifier(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
}
