import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { AdminBalanceActions } from "@/components/admin-balance-actions";
import { Price } from "@/components/price";
import { requireRole } from "@/data/auth";
import { getOrdersOverview } from "@/data/admin";

const statusTone: Record<string, "gold" | "green" | "wine" | "gray"> = {
  pending_payment: "gray",
  pending_deposit: "gray",
  active: "gold",
  awaiting_balance: "wine",
  ready: "gold",
  shipped: "gold",
  delivered: "green",
  completed: "green",
  disputed: "wine",
  cancelled: "gray",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default async function AdminOrdersPage() {
  const account = await requireRole("admin");
  const orders = "demo" in account ? [] : await getOrdersOverview();

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardHeading
        eyebrow="Marketplace ledger"
        title="Orders"
        description="Every order with its stage, payment state and, for orders awaiting a balance payment, a one-click link to settle it."
      />
      <Panel className="overflow-hidden">
        <div className="grid gap-3 p-4">
          {orders.map((order) => (
            <div key={order.id} className="flex flex-col gap-3 rounded-lg bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{order.reference}</p>
                  <StatusPill tone={statusTone[order.status] ?? "gray"}>{statusLabel(order.status)}</StatusPill>
                  {order.balancePaymentStatus === "pending" && <StatusPill tone="gold">Balance link sent</StatusPill>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {order.garmentType} · {order.customerName} → {order.tailorName}
                </p>
                <p className="mt-2 text-xs text-muted">
                  <Price kobo={order.tailoringSubtotalKobo + order.deliveryKobo} showExact={false} className="inline" /> total · due{" "}
                  {new Date(order.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              {order.status === "awaiting_balance" && (
                <AdminBalanceActions orderId={order.id} balancePaymentStatus={order.balancePaymentStatus} />
              )}
            </div>
          ))}
          {orders.length === 0 && <p className="p-8 text-center text-sm text-muted">No orders yet.</p>}
        </div>
      </Panel>
    </div>
  );
}
