import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  PAYSTACK_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().startsWith("sk_").optional()),
  PAYSTACK_PUBLIC_KEY: z.preprocess(emptyToUndefined, z.string().startsWith("pk_").optional()),
  OPEN_EXCHANGE_RATES_APP_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(24).optional()),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  RESEND_FROM_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
  UPSTASH_REDIS_REST_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  DEMO_MODE: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false")),
});

export const env = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
  OPEN_EXCHANGE_RATES_APP_ID: process.env.OPEN_EXCHANGE_RATES_APP_ID,
  CRON_SECRET: process.env.CRON_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  DEMO_MODE: process.env.DEMO_MODE,
});

if (process.env.NODE_ENV === "production" && env.DEMO_MODE === "true") {
  throw new Error("DEMO_MODE must never be enabled in production.");
}
