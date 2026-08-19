import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, CheckCircle2, Clock3, Scale, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardHeading, Panel, StatCard, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/data/auth";
import { getAdminOverview } from "@/data/admin";

const actionIcon = { dispute: AlertTriangle, verification: UserCheck, payout: Banknote, order: Clock3 } as const;

function timeAgoLabel(iso: string) {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default async function AdminDashboard() {
  const account = await requireRole("admin");
  const isDemo = "demo" in account;
  const overview = isDemo
    ? {
        grossVolumeThisMonthKobo: 0,
        grossVolumeChangePct: null,
        activeOrderCount: 0,
        dueThisWeekCount: 0,
        overdueOrderCount: 0,
        tailorsOnlineCount: 0,
        tailorsAwaitingReviewCount: 0,
        openDisputeCount: 0,
        disputesDueTodayCount: 0,
        protectedFundsKobo: 0,
        eligiblePayoutKobo: 0,
        frozenByDisputesKobo: 0,
        actionQueue: [],
        lastWebhookAt: null,
        fxCache: { available: false, fetchedAt: new Date().toISOString(), source: "unconfigured" },
        lastPayoutAt: null,
      }
    : await getAdminOverview();

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardHeading
        eyebrow="Marketplace operations"
        title="Control room"
        description="Live risk, verification, order and payout signals."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Gross volume · ${monthLabel}`}
          value={formatMoney(overview.grossVolumeThisMonthKobo, "NGN")}
          detail={overview.grossVolumeChangePct === null ? "No prior month to compare" : `${overview.grossVolumeChangePct > 0 ? "+" : ""}${overview.grossVolumeChangePct}% vs last month`}
          trend={overview.grossVolumeChangePct === null || overview.grossVolumeChangePct >= 0 ? "up" : "down"}
        />
        <StatCard label="Active orders" value={String(overview.activeOrderCount)} detail={`${overview.dueThisWeekCount} due this week`} trend="neutral" />
        <StatCard label="Tailors published" value={String(overview.tailorsOnlineCount)} detail={`${overview.tailorsAwaitingReviewCount} awaiting review`} trend="neutral" />
        <StatCard
          label="Open disputes"
          value={String(overview.openDisputeCount)}
          detail={`${overview.disputesDueTodayCount} response deadlines today`}
          trend={overview.openDisputeCount > 0 ? "down" : "neutral"}
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h2 className="font-display text-2xl font-semibold">Action queue</h2>
              <p className="text-xs text-muted">Highest-risk items first</p>
            </div>
            <span className="rounded-full bg-red-800 px-2.5 py-1 text-[10px] font-bold text-white">{overview.actionQueue.length} OPEN</span>
          </div>
          <div className="divide-y divide-line">
            {overview.actionQueue.map((item, index) => {
              const Icon = actionIcon[item.kind];
              return (
                <Link href={item.href} key={`${item.kind}-${index}`} className="flex items-center gap-4 p-5 hover:bg-background">
                  <span className="grid size-10 place-items-center rounded-full bg-background text-wine">
                    <Icon size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <StatusPill tone={item.tone}>{item.timeLabel}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted">{item.body}</p>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              );
            })}
            {overview.actionQueue.length === 0 && <p className="p-8 text-center text-sm text-muted">Nothing needs attention right now.</p>}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Protected funds</p>
              <ShieldCheck className="text-sage" size={19} />
            </div>
            <Price kobo={overview.protectedFundsKobo} className="mt-4 block font-display text-4xl font-semibold" />
            <p className="mt-1 text-xs text-muted">Across {overview.activeOrderCount} active orders</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-background p-3">
                <p className="text-muted">Eligible</p>
                <p className="mt-1 font-semibold">{formatMoney(overview.eligiblePayoutKobo, "NGN")}</p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-muted">Frozen</p>
                <p className="mt-1 font-semibold text-wine">{formatMoney(overview.frozenByDisputesKobo, "NGN")}</p>
              </div>
            </div>
          </Panel>
          <Panel className="p-5">
            <p className="font-semibold">Platform health</p>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Paystack webhooks</span>
                <span className="flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} className={overview.lastWebhookAt ? "text-sage" : "text-muted"} />
                  {overview.lastWebhookAt ? `Last ${timeAgoLabel(overview.lastWebhookAt)}` : "None received yet"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">FX rate cache</span>
                <span className="flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} className={overview.fxCache.available ? "text-sage" : "text-muted"} />
                  {overview.fxCache.available ? `${timeAgoLabel(overview.fxCache.fetchedAt)} old` : "Unconfigured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Last payout recorded</span>
                <span className="flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} className={overview.lastPayoutAt ? "text-sage" : "text-muted"} />
                  {overview.lastPayoutAt ? timeAgoLabel(overview.lastPayoutAt) : "None yet"}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Link href="/admin/verification">
          <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <UserCheck className="text-wine" />
            <h2 className="mt-4 font-display text-xl font-semibold">{overview.tailorsAwaitingReviewCount} tailor applications</h2>
            <p className="mt-1 text-xs text-muted">Review the queue</p>
          </Panel>
        </Link>
        <Link href="/admin/disputes">
          <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <Scale className="text-wine" />
            <h2 className="mt-4 font-display text-xl font-semibold">{overview.openDisputeCount} protected disputes</h2>
            <p className="mt-1 text-xs text-muted">{formatMoney(overview.frozenByDisputesKobo, "NGN")} currently frozen</p>
          </Panel>
        </Link>
        <Link href="/admin/payments">
          <Panel className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <Banknote className="text-wine" />
            <h2 className="mt-4 font-display text-xl font-semibold">Payments & payouts</h2>
            <p className="mt-1 text-xs text-muted">{formatMoney(overview.eligiblePayoutKobo, "NGN")} eligible now</p>
          </Panel>
        </Link>
      </div>
    </div>
  );
}
