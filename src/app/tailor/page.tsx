import Link from "next/link";
import { ArrowRight, CalendarClock, MessageCircle, ShieldCheck } from "lucide-react";
import { DashboardHeading, Panel, StatCard } from "@/components/dashboard-ui";
import { TailorActiveJobs } from "@/components/tailor-active-jobs";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/data/auth";
import { getTailorDashboardOverview } from "@/data/marketplace";

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export default async function TailorDashboard() {
  const account = await requireRole("tailor");
  const overview = "demo" in account ? null : await getTailorDashboardOverview(account.user.id);

  if (!overview) {
    return (
      <div className="mx-auto max-w-7xl">
        <DashboardHeading eyebrow="Marketplace" title="The atelier at a glance." description="Complete onboarding to see your dashboard." />
      </div>
    );
  }

  const availableSlots = Math.max(0, overview.capacity - overview.activeJobCount);
  const gradeProgressPct = overview.nextGrade
    ? Math.min(100, Math.round((overview.completedJobCount / overview.nextGrade.minJobs) * 100))
    : 100;

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardHeading
        eyebrow={`${overview.studioName} · Grade ${overview.grade}`}
        title="The atelier at a glance."
        description={`${overview.activeJobCount} of ${overview.capacity} active job slots are currently in use.`}
        action={
          <Link href="/tailor/quotes" className="rounded-full bg-wine px-5 py-3 text-sm font-semibold text-white">
            Review new requests
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active commissions" value={`${overview.activeJobCount} / ${overview.capacity}`} detail={`${availableSlots} slots available`} />
        <StatCard
          label="Due this week"
          value={String(overview.dueThisWeekCount)}
          detail={`${overview.overdueCount} needs attention`}
          trend={overview.overdueCount > 0 ? "down" : "neutral"}
        />
        <StatCard label="Available earnings" value={formatMoney(overview.availablePayoutKobo, "NGN")} detail="Ready for next payout" trend="neutral" />
        <StatCard label="On-time rate" value={`${overview.onTimeRate}%`} detail={`${overview.completedJobCount} jobs completed`} trend="neutral" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h2 className="font-display text-2xl font-semibold">Active jobs</h2>
              <p className="text-xs text-muted">Ordered by closest due date</p>
            </div>
            <Link href="/tailor/jobs" className="text-xs font-semibold text-wine">
              View board
            </Link>
          </div>
          <TailorActiveJobs />
        </Panel>
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Grade progress</p>
              <span className="rounded-full bg-wine px-2.5 py-1 text-[10px] font-bold text-white">GRADE {overview.grade}</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-line">
              <div className="h-full rounded-full bg-gold" style={{ width: `${gradeProgressPct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted">Completed</p>
                <p className="mt-1 font-semibold">
                  {overview.completedJobCount}{overview.nextGrade ? ` / ${overview.nextGrade.minJobs} jobs` : " jobs · top grade"}
                </p>
              </div>
              <div>
                <p className="text-muted">Rating</p>
                <p className="mt-1 font-semibold">{overview.averageRating.toFixed(1)}{overview.nextGrade ? ` / ${overview.nextGrade.minRating}` : ""}</p>
              </div>
              <div>
                <p className="text-muted">On time</p>
                <p className="mt-1 font-semibold">{overview.onTimeRate}%{overview.nextGrade ? ` / ${overview.nextGrade.minOnTime}%` : ""}</p>
              </div>
              <div>
                <p className="text-muted">Disputes lost</p>
                <p className="mt-1 font-semibold">{overview.lostDisputeRate}%{overview.nextGrade ? ` / ${overview.nextGrade.maxLostDisputes}%` : ""}</p>
              </div>
            </div>
            <Link href="/tailor/verification" className="mt-5 flex items-center gap-1 text-xs font-semibold text-wine">
              See grading detail <ArrowRight size={12} />
            </Link>
          </Panel>
          <Panel className="p-5">
            <div className="flex gap-3">
              <MessageCircle className="text-wine" />
              <div>
                <p className="font-semibold">{overview.pendingQuoteRequestCount} quote requests</p>
                <p className="mt-1 text-xs text-muted">
                  {overview.oldestPendingRequestAt ? `Oldest received ${timeAgo(overview.oldestPendingRequestAt)}` : "All caught up"}
                </p>
              </div>
            </div>
            <Link href="/tailor/quotes" className="mt-4 block rounded-full border border-line py-2.5 text-center text-xs font-semibold">
              Review requests
            </Link>
          </Panel>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <p className="eyebrow text-wine">Next appointment</p>
          {overview.nextAppointment ? (
            <>
              <h2 className="mt-2 font-display text-xl">{overview.nextAppointment.customerName}</h2>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                <CalendarClock size={13} /> {formatDateTime(overview.nextAppointment.startsAt)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Nothing scheduled yet.</p>
          )}
        </Panel>
        <Panel className="p-5">
          <p className="eyebrow text-wine">Available now</p>
          <p className="mt-2 block font-display text-2xl font-semibold">{formatMoney(overview.availablePayoutKobo, "NGN")}</p>
          <p className="mt-1 text-xs text-muted">Awaiting an admin-recorded transfer</p>
        </Panel>
        <Panel
          className={`flex items-center gap-4 p-5 text-white ${overview.verificationStatus === "approved" ? "bg-sage" : "bg-ink"}`}
        >
          <ShieldCheck />
          <div>
            <p className="font-semibold">
              {overview.verificationStatus === "approved" ? "Verification current" : "Verification pending"}
            </p>
            <p className="mt-1 text-xs text-white/65 capitalize">{overview.verificationStatus.replace(/_/g, " ")}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
