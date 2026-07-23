"use client";

import { useCurrency } from "./currency-provider";
import { formatMoney, ngnKoboToUsdCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  kobo,
  className,
  showExact = true,
}: {
  kobo: number;
  className?: string;
  showExact?: boolean;
}) {
  const { currency, ngnPerUsd } = useCurrency();
  const usd = formatMoney(ngnKoboToUsdCents(kobo, ngnPerUsd), "USD");
  const ngn = formatMoney(kobo, "NGN");

  if (currency === "NGN") return <span className={className}>{ngn}</span>;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span>{usd}</span>
      {showExact && <span className="text-[.68em] font-medium text-muted">est. · exact {ngn}</span>}
    </span>
  );
}

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex rounded-full border border-line bg-paper p-0.5" aria-label="Display currency">
      {(["USD", "NGN"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setCurrency(item)}
          className={cn(
            "rounded-full font-semibold transition",
            compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
            currency === item ? "bg-wine text-white" : "text-muted hover:text-ink",
          )}
          aria-pressed={currency === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
