import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getAuditEvents, getLedgerAccountBalances, getLedgerEntries } from "@/data/admin";

const entryTone: Record<string, "gold" | "green" | "wine" | "gray"> = {
  payment_received: "gold",
  provider_fee: "gray",
  platform_commission: "green",
  tailor_payable: "gold",
  refund: "wine",
  payout: "green",
  adjustment: "gray",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function AdminLedgerPage() {
  const account = await requireRole("admin");
  const isDemo = "demo" in account;
  const [balances, entries, auditEvents] = isDemo
    ? [[], [], []]
    : await Promise.all([getLedgerAccountBalances(), getLedgerEntries(100), getAuditEvents(100)]);

  const netKobo = balances.reduce((sum, balance) => sum + balance.balanceKobo, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Reconciliation"
        title="Ledger & audit trail"
        description="The immutable double-entry records behind every payment, commission and payout, and who triggered each admin action."
      />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Account balances</h2>
        <StatusPill tone={netKobo === 0 ? "green" : "wine"}>
          {netKobo === 0 ? "Books balance to ₦0" : "Books do not balance"}
        </StatusPill>
      </div>
      <p className="mt-1 text-sm text-muted">
        Every entry debits one account and credits another for the same amount, so the net across all accounts should always be zero.
      </p>
      <Panel className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="p-4">Account</th>
                <th className="pr-4 text-right">Net balance</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => (
                <tr key={balance.account} className="border-t border-line">
                  <td className="p-4 font-mono text-xs">{balance.account}</td>
                  <td className="pr-4 text-right font-semibold">
                    <Price kobo={Math.abs(balance.balanceKobo)} showExact={false} className="inline" />
                    {balance.balanceKobo < 0 && <span className="text-wine"> (debit)</span>}
                  </td>
                </tr>
              ))}
              {balances.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-muted">
                    No ledger activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Recent ledger entries</h2>
        <p className="mt-1 text-sm text-muted">Most recent {entries.length} entries, newest first. This table is append-only.</p>
        <Panel className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="p-4">When</th>
                  <th>Order</th>
                  <th>Type</th>
                  <th>Debit → Credit</th>
                  <th className="pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-line align-top">
                    <td className="p-4 whitespace-nowrap text-xs text-muted">{formatDateTime(entry.createdAt)}</td>
                    <td className="text-xs font-semibold">{entry.orderReference}</td>
                    <td>
                      <StatusPill tone={entryTone[entry.entryType] ?? "gray"}>{entry.entryType.replace(/_/g, " ")}</StatusPill>
                    </td>
                    <td className="font-mono text-[11px] text-muted">
                      {entry.debitAccount} → {entry.creditAccount}
                    </td>
                    <td className="pr-4 text-right font-semibold">
                      <Price kobo={entry.amountKobo} showExact={false} className="inline" />
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      No ledger entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Recent admin activity</h2>
        <p className="mt-1 text-sm text-muted">Every admin-triggered mutation, with who did it and when.</p>
        <Panel className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="p-4">When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th className="pr-4">Entity</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((event) => (
                  <tr key={event.id} className="border-t border-line align-top">
                    <td className="p-4 whitespace-nowrap text-xs text-muted">{formatDateTime(event.createdAt)}</td>
                    <td className="text-xs font-semibold">{event.actorName ?? "System"}</td>
                    <td className="text-xs">{event.action}</td>
                    <td className="pr-4 font-mono text-[11px] text-muted">
                      {event.entityType}
                      {event.entityId && `:${event.entityId.slice(0, 8)}`}
                    </td>
                  </tr>
                ))}
                {auditEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted">
                      No admin activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
