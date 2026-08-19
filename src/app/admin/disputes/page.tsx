import { LockKeyhole, Scale } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { AdminDisputeActions } from "@/components/admin-dispute-actions";
import { AdminRefundActions } from "@/components/admin-refund-actions";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getOpenDisputes, getPendingRefunds } from "@/data/admin";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default async function DisputesPage() {
  const account = await requireRole("admin");
  const isDemo = "demo" in account;
  const [disputes, refunds] = isDemo ? [[], []] : await Promise.all([getOpenDisputes(), getPendingRefunds()]);

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Protected cases"
        title="Disputes"
        description="Opening a case freezes every unreleased order ledger entry until an audited decision."
      />
      <Panel className="overflow-hidden">
        {disputes.map((dispute, index) => (
          <div
            key={dispute.id}
            className="grid gap-4 border-b border-line p-5 last:border-0 md:grid-cols-[auto_1fr_auto_auto] md:items-center"
          >
            <span className="grid size-11 place-items-center rounded-full bg-blue/10 text-blue">
              <Scale size={18} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{dispute.reference}</p>
                <StatusPill tone={index === 0 ? "wine" : "gold"}>{statusLabel(dispute.status)}</StatusPill>
              </div>
              <p className="mt-1 text-sm">{dispute.reason}</p>
              <p className="mt-1 text-xs text-muted">
                Order {dispute.orderReference} · {dispute.customerName} vs {dispute.tailorName}
              </p>
              <p className="mt-2 text-xs text-muted">{dispute.description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-wine">
              <LockKeyhole size={13} /> <Price kobo={dispute.frozenAmountKobo} showExact={false} />
            </div>
            <AdminDisputeActions disputeId={dispute.id} frozenAmountKobo={dispute.frozenAmountKobo} />
          </div>
        ))}
        {disputes.length === 0 && <p className="p-8 text-center text-sm text-muted">No open disputes.</p>}
      </Panel>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Refunds to send</h2>
        <p className="mt-1 text-sm text-muted">
          A resolved dispute with a refund creates a record here. Send the refund yourself, then record it with the
          provider reference.
        </p>
        <Panel className="mt-4 overflow-hidden">
          <div className="grid gap-3 p-4">
            {refunds.map((refund) => (
              <div key={refund.id} className="flex flex-col gap-3 rounded-lg bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{refund.orderReference}</p>
                  <p className="mt-1 text-xs text-muted">{refund.reason}</p>
                  <p className="mt-2 text-xs text-muted">
                    <Price kobo={refund.amountKobo} showExact={false} className="inline" /> · {statusLabel(refund.status)}
                  </p>
                </div>
                <AdminRefundActions refundId={refund.id} />
              </div>
            ))}
            {refunds.length === 0 && <p className="p-8 text-center text-sm text-muted">No refunds are pending.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
