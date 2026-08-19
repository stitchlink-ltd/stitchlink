import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { AdminBalanceActions } from "@/components/admin-balance-actions";
import { AdminPayoutActions } from "@/components/admin-payout-actions";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getEligiblePayouts, getOrdersOverview, getPaymentsStats } from "@/data/admin";

export default async function AdminPaymentsPage() {
  const account = await requireRole("admin");
  const isDemo = "demo" in account;
  const [orders, stats, payouts] = isDemo
    ? [[], { unreconciledCount: 0, eligiblePayoutKobo: 0, frozenByDisputesKobo: 0 }, []]
    : await Promise.all([getOrdersOverview(), getPaymentsStats(), getEligiblePayouts()]);

  const awaitingBalance = orders.filter((order) => order.status === "awaiting_balance");

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Money operations"
        title="Payments & payouts"
        description="Paystack reconciliation, protected balances and dual-controlled payout batches."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Unreconciled", String(stats.unreconciledCount)],
          ["Eligible payout", <Price key="payout" kobo={stats.eligiblePayoutKobo} showExact={false} />],
          ["Frozen by disputes", <Price key="frozen" kobo={stats.frozenByDisputesKobo} showExact={false} />],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-background p-5">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Balance payments due</h2>
        <p className="mt-1 text-sm text-muted">
          These orders have finished the deposit stage and are waiting on their remaining 50% balance. Send the customer a
          Paystack link to settle it.
        </p>
        <Panel className="mt-4 overflow-hidden">
          <div className="grid gap-3 p-4">
            {awaitingBalance.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 rounded-lg bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{order.reference}</p>
                  <p className="mt-1 text-xs text-muted">
                    {order.garmentType} · {order.customerName} → {order.tailorName}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Balance due <Price kobo={Math.ceil((order.tailoringSubtotalKobo + order.deliveryKobo) / 2)} showExact={false} className="inline" />
                    {order.balancePaymentStatus === "pending" && " · link sent, awaiting customer"}
                  </p>
                </div>
                <AdminBalanceActions orderId={order.id} balancePaymentStatus={order.balancePaymentStatus} />
              </div>
            ))}
            {awaitingBalance.length === 0 && (
              <p className="p-8 text-center text-sm text-muted">No orders are currently awaiting a balance payment.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Eligible payouts</h2>
        <p className="mt-1 text-sm text-muted">
          Send the transfer to the tailor&apos;s bank account yourself, then record it here with the provider reference.
        </p>
        <Panel className="mt-4 overflow-hidden">
          <div className="grid gap-3 p-4">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex flex-col gap-3 rounded-lg bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{payout.orderReference}</p>
                    <StatusPill tone={payout.releasePhase === "initial" ? "gold" : "green"}>
                      {payout.releasePhase === "initial" ? "Initial 50%" : "Final release"}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-muted">{payout.tailorName}</p>
                  <p className="mt-2 text-xs text-muted">
                    <Price kobo={payout.amountKobo} showExact={false} className="inline" /> eligible since{" "}
                    {new Date(payout.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <AdminPayoutActions payoutId={payout.id} />
              </div>
            ))}
            {payouts.length === 0 && <p className="p-8 text-center text-sm text-muted">No payouts are currently eligible.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
