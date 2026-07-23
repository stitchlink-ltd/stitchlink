import type { Currency, QuoteBreakdown } from "./types";

export const PLATFORM_FEE_BPS = 1000;

export function formatMoney(minorUnits: number, currency: Currency = "NGN") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(minorUnits / 100);
}

export function ngnKoboToUsdCents(kobo: number, ngnPerUsd: number) {
  if (!Number.isFinite(ngnPerUsd) || ngnPerUsd <= 0) {
    throw new Error("Exchange rate must be a positive number");
  }
  return Math.round(kobo / ngnPerUsd);
}

export function calculatePlatformFee(tailoringSubtotalKobo: number) {
  return Math.round((tailoringSubtotalKobo * PLATFORM_FEE_BPS) / 10_000);
}

export function calculateTailorPayable(input: QuoteBreakdown) {
  const commission = calculatePlatformFee(input.tailoringSubtotalKobo);
  return (
    input.tailoringSubtotalKobo +
    input.deliveryKobo -
    commission -
    input.paystackFeesKobo -
    (input.refundsKobo ?? 0) +
    (input.adjustmentsKobo ?? 0)
  );
}

export function splitInstallments(totalKobo: number) {
  const depositKobo = Math.floor(totalKobo / 2);
  return { depositKobo, balanceKobo: totalKobo - depositKobo };
}
