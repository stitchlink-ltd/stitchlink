import { DashboardHeading, Panel, StatCard, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/data/auth";
import { getTailorEarnings } from "@/data/marketplace";

const statusTone: Record<string, "gold" | "green" | "wine" | "gray"> = {
  eligible: "gold",
  approved: "gold",
  processing: "gold",
  paid: "green",
  failed: "wine",
  cancelled: "gray",
};

export default async function EarningsPage() {
  const account = await requireRole("tailor");
  const earnings =
    "demo" in account
      ? { availableKobo: 0, protectedKobo: 0, paidThisYearKobo: 0, payouts: [] }
      : await getTailorEarnings(account.user.id);

  const paidCount = earnings.payouts.filter((payout) => payout.status === "paid").length;

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="NGN earnings"
        title="Earnings and payouts"
        description="Tailor payable is shown after the 10% platform commission, Paystack fees, refunds and adjustments."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available" value={formatMoney(earnings.availableKobo, "NGN")} detail="Eligible for next batch" />
        <StatCard label="Protected" value={formatMoney(earnings.protectedKobo, "NGN")} detail="Awaiting order completion" />
        <StatCard label="Paid this year" value={formatMoney(earnings.paidThisYearKobo, "NGN")} detail={`${paidCount} completed payouts`} />
      </div>
      <Panel className="mt-4 overflow-hidden">
        <div className="border-b border-line p-5 font-display text-xl font-semibold">Payout ledger</div>
        {earnings.payouts.map((payout) => (
          <div key={payout.id} className="flex items-center gap-4 border-b border-line p-5 last:border-0">
            <div className="flex-1">
              <p className="text-sm font-semibold">{payout.orderReference}</p>
              <p className="text-xs text-muted">
                {payout.releasePhase === "initial" ? "Initial 50% release" : "Final release"}
                {payout.providerReference && ` · ${payout.providerReference}`}
              </p>
            </div>
            <StatusPill tone={statusTone[payout.status] ?? "gray"}>{payout.status}</StatusPill>
            <Price kobo={payout.amountKobo} className="font-semibold" />
          </div>
        ))}
        {earnings.payouts.length === 0 && <p className="p-8 text-center text-sm text-muted">No payouts yet.</p>}
      </Panel>
    </div>
  );
}
