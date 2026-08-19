import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const PAYSTACK_API = "https://api.paystack.co";

type InitializeInput = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
};

export async function initializePaystackTransaction(input: InitializeInput) {
  if (!env.PAYSTACK_SECRET_KEY) throw new Error("Paystack is not configured");
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok || !payload.status)
    throw new Error(payload.message ?? "Paystack initialization failed");
  return payload.data as { authorization_url: string; access_code: string; reference: string };
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!env.PAYSTACK_SECRET_KEY || !signature) return false;
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function verifyPaystackTransaction(reference: string) {
  if (!env.PAYSTACK_SECRET_KEY) throw new Error("Paystack is not configured");
  const response = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` }, cache: "no-store" }
  );
  const payload = await response.json();
  if (!response.ok || !payload.status)
    throw new Error(payload.message ?? "Paystack verification failed");
  return payload.data as {
    status: string;
    amount: number;
    currency: string;
    reference: string;
    fees: number;
    paid_at: string;
  };
}
