import "server-only";

import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { env } from "@/lib/env";

type MarketplaceEmail = { to?: string | null; subject: string; text: string };

export async function sendMarketplaceEmail({ to, subject, text }: MarketplaceEmail) {
  if (!to || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return { sent: false as const };
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: env.RESEND_FROM_EMAIL, to, subject, text });
    if (result.error) throw new Error(result.error.message);
    return { sent: true as const, id: result.data?.id };
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "marketplace_email" }, extra: { recipient: to, subject } });
    return { sent: false as const };
  }
}
