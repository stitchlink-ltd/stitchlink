import "server-only";
import { env } from "./env";

export type FxQuote = { available: boolean; ngnPerUsd?: number; fetchedAt: string; source: string };

export async function getNgnPerUsd(): Promise<FxQuote> {
  if (!env.OPEN_EXCHANGE_RATES_APP_ID)
    return { available: false, fetchedAt: new Date().toISOString(), source: "unconfigured" };
  try {
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(env.OPEN_EXCHANGE_RATES_APP_ID)}&symbols=NGN`,
      { next: { revalidate: 900 } }
    );
    if (!response.ok) throw new Error(`FX provider returned ${response.status}`);
    const payload = (await response.json()) as { rates?: { NGN?: number }; timestamp?: number };
    if (!payload.rates?.NGN) throw new Error("FX provider returned no NGN rate");
    return {
      available: true,
      ngnPerUsd: payload.rates.NGN,
      fetchedAt: new Date((payload.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
      source: "Open Exchange Rates",
    };
  } catch {
    return { available: false, fetchedAt: new Date().toISOString(), source: "unavailable" };
  }
}
