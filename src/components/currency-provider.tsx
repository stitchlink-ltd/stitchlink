"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Currency } from "@/lib/types";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  ngnPerUsd: number;
  rateTimestamp: string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const currency = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("stitchlink:currency", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("stitchlink:currency", onStoreChange);
      };
    },
    () => {
      const stored = window.localStorage.getItem("stitchlink-currency");
      return stored === "NGN" ? "NGN" : "USD";
    },
    () => "USD" as Currency,
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency(next: Currency) {
        window.localStorage.setItem("stitchlink-currency", next);
        window.dispatchEvent(new Event("stitchlink:currency"));
      },
      ngnPerUsd: Number(process.env.NEXT_PUBLIC_DEMO_NGN_PER_USD ?? 1600),
      rateTimestamp: "indicative rate",
    }),
    [currency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider");
  return context;
}
