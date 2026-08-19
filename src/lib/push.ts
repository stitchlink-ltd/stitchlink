import "server-only";

import webPush from "web-push";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PushPayload = { title: string; body: string; url?: string };

function vapidConfigured() {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidConfigured()) return { sent: 0 as const };
  webPush.setVapidDetails(
    env.VAPID_SUBJECT!,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!
  );

  const admin = createSupabaseAdminClient();
  if (!admin) return { sent: 0 as const };

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,subscription")
    .eq("user_id", userId);
  if (!subscriptions?.length) return { sent: 0 as const };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webPush.sendNotification(row.subscription as webPush.PushSubscription, body);
        sent += 1;
      } catch (error) {
        const statusCode = error instanceof webPush.WebPushError ? error.statusCode : null;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
          return;
        }
        Sentry.captureException(error, {
          tags: { area: "push_send" },
          extra: { userId, endpoint: row.endpoint },
        });
      }
    })
  );
  return { sent };
}
