import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { DashboardHeading, Panel, StatCard, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl">
      <DashboardHeading
        eyebrow="Marketplace operations"
        title="Control room"
        description="Live risk, verification, order and payout signals."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross volume · July" value="₦18.6m" detail="+14.2% vs June" />
        <StatCard label="Active orders" value="146" detail="12 due this week" />
        <StatCard label="Tailors online" value="118" detail="6 awaiting review" />
        <StatCard
          label="Open disputes"
          value="4"
          detail="2 response deadlines today"
          trend="down"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h2 className="font-display text-2xl font-semibold">Action queue</h2>
              <p className="text-xs text-muted">Highest-risk items first</p>
            </div>
            <span className="rounded-full bg-red-800 px-2.5 py-1 text-[10px] font-bold text-white">
              12 OPEN
            </span>
          </div>
          <div className="divide-y divide-line">
            {[
              [
                AlertTriangle,
                "Dispute response due",
                "STL-2314 · Customer evidence received",
                "27 min",
                "wine",
              ],
              [
                UserCheck,
                "Tailor verification",
                "Moyo Stitches · 4 documents ready",
                "2 hr",
                "gold",
              ],
              [Banknote, "Payout review", "Batch PAY-0722 · ₦2.14m", "Today", "green"],
              [Clock3, "Late production update", "STL-2298 · 48 hours overdue", "Today", "gray"],
            ].map(([Icon, title, body, time, tone]) => {
              const RowIcon = Icon as typeof AlertTriangle;
              return (
                <Link
                  href="/admin/disputes"
                  key={title as string}
                  className="flex items-center gap-4 p-5 hover:bg-background"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-background text-wine">
                    <RowIcon size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{title as string}</p>
                      <StatusPill tone={tone as "wine" | "gold" | "green" | "gray"}>
                        {time as string}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted">{body as string}</p>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              );
            })}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Protected funds</p>
              <ShieldCheck className="text-sage" size={19} />
            </div>
            <Price kobo={2468000000} className="mt-4 block font-display text-4xl font-semibold" />
            <p className="mt-1 text-xs text-muted">Across 146 active orders</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-background p-3">
                <p className="text-muted">Eligible</p>
                <p className="mt-1 font-semibold">₦2.14m</p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-muted">Frozen</p>
                <p className="mt-1 font-semibold text-wine">₦384k</p>
              </div>
            </div>
          </Panel>
          <Panel className="p-5">
            <p className="font-semibold">Platform health</p>
            <div className="mt-4 space-y-3 text-xs">
              {[
                ["Paystack webhooks", "Healthy"],
                ["FX rate cache", "12 min old"],
                ["Realtime messages", "Healthy"],
                ["Last reconciliation", "06:15 WAT"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted">{label}</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={12} className="text-sage" />
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Link href="/admin/verification">
          <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <UserCheck className="text-wine" />
            <h2 className="mt-4 font-display text-xl font-semibold">6 tailor applications</h2>
            <p className="mt-1 text-xs text-muted">Oldest waiting 31 hours</p>
          </Panel>
        </Link>
        <Link href="/admin/disputes">
          <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <Scale className="text-wine" />
            <h2 className="mt-4 font-display text-xl font-semibold">4 protected disputes</h2>
            <p className="mt-1 text-xs text-muted">₦384,000 currently frozen</p>
          </Panel>
        </Link>
        <Link href="/admin/payments">
          <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <Banknote className="text-wine" />
            <h2 className="mt-4 font-display text-xl font-semibold">Next payout batch</h2>
            <p className="mt-1 text-xs text-muted">Review scheduled for 3:00 PM</p>
          </Panel>
        </Link>
      </div>
    </div>
  );
}
