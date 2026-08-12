import "server-only";

import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { sendMarketplaceEmail } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotifyInput = { userId: string; title: string; body: string; href?: string };

async function deliver(input: NotifyInput) {
  try {
    const admin = createSupabaseAdminClient();
    const emailLookup = admin ? admin.auth.admin.getUserById(input.userId) : null;
    await sendPushToUser(input.userId, { title: input.title, body: input.body, url: input.href });
    const email = (await emailLookup)?.data.user?.email;
    if (email) await sendMarketplaceEmail({ to: email, subject: input.title, text: input.body });
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "notification_dispatch" }, extra: { userId: input.userId, title: input.title } });
  }
}

/** Sends push + email for a notification already written to public.notifications via notify_user(). Fire-and-forget: runs after the response is sent. */
export function dispatchNotification(input: NotifyInput) {
  after(() => deliver(input));
}
