import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { initializePaystackTransaction } from "@/lib/paystack";
import { enforceRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { forbiddenResponse, isSameSiteRequest } from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ orderId: z.uuid() });

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return forbiddenResponse();
  const rate = await enforceRateLimit("checkout", requestIdentifier(request), 8);
  if (!rate.success)
    return Response.json(
      { error: "Too many checkout attempts" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid payment request" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json(
      { error: "Payments require configured Supabase and Paystack credentials" },
      { status: 503 }
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id,customer_id,tailoring_subtotal_kobo,delivery_kobo,currency,deposit_paid_at,balance_paid_at"
    )
    .eq("id", parsed.data.orderId)
    .eq("customer_id", user.id)
    .single();
  if (error || !order) return Response.json({ error: "Order not found" }, { status: 404 });
  if (order.currency !== "NGN")
    return Response.json(
      { error: "StitchLink checkout supports exact NGN charges only" },
      { status: 409 }
    );
  if (order.deposit_paid_at || order.balance_paid_at)
    return Response.json({ error: "This order has already been paid." }, { status: 409 });
  const admin = createSupabaseAdminClient();
  if (!admin)
    return Response.json(
      { error: "Payments require configured Supabase and Paystack credentials" },
      { status: 503 }
    );
  const amountKobo = order.tailoring_subtotal_kobo + order.delivery_kobo;
  const reference = `STL-FUL-${randomUUID()}`;
  const { data: pending } = await supabase
    .from("payments")
    .select("reference,authorization_url,amount_kobo,initialized_at")
    .eq("order_id", order.id)
    .eq("installment", "full")
    .eq("status", "pending")
    .maybeSingle();
  // Paystack checkout links go dead once opened (or after a short TTL), so only reuse a
  // cached authorization_url while it's still fresh -- otherwise it 404s on Paystack's
  // side with a confusing "could not start this transaction" for the customer.
  const pendingFresh =
    pending?.authorization_url &&
    pending.initialized_at &&
    Date.now() - new Date(pending.initialized_at).getTime() < 10 * 60 * 1000;
  if (pendingFresh)
    return Response.json({
      authorizationUrl: pending!.authorization_url,
      reference: pending!.reference,
      amountKobo: pending!.amount_kobo,
      currency: "NGN",
    });
  // Only the SELECT/INSERT above run on the customer's own RLS-scoped client (ownership
  // already verified via order.customer_id above); these UPDATEs are system bookkeeping
  // with no RLS write policy on `payments` by design, so they go through the admin client.
  if (pending)
    await admin
      .from("payments")
      .update({
        status: "failed",
        initialization_error: "Replaced after an incomplete checkout initialization",
      })
      .eq("reference", pending.reference);
  const { error: insertError } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      customer_id: user.id,
      reference,
      installment: "full",
      amount_kobo: amountKobo,
      currency: "NGN",
      status: "pending",
    });
  if (insertError)
    return Response.json({ error: "Unable to reserve payment reference" }, { status: 500 });
  try {
    const data = await initializePaystackTransaction({
      email: user.email!,
      amountKobo,
      reference,
      callbackUrl: `${env.NEXT_PUBLIC_SITE_URL}/customer/payments?reference=${encodeURIComponent(reference)}`,
      metadata: { order_id: order.id, installment: "full" },
    });
    await admin
      .from("payments")
      .update({
        authorization_url: data.authorization_url,
        initialized_at: new Date().toISOString(),
      })
      .eq("reference", reference);
    return Response.json({
      authorizationUrl: data.authorization_url,
      reference,
      amountKobo,
      currency: "NGN",
    });
  } catch {
    await admin
      .from("payments")
      .update({ status: "failed", initialization_error: "Paystack initialization failed" })
      .eq("reference", reference);
    return Response.json({ error: "Paystack initialization failed" }, { status: 502 });
  }
}
