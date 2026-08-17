import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { requireRole } from "@/data/auth";
import { getTailorActiveJobs } from "@/data/marketplace";
import { stageIcon, stageIconClasses } from "@/lib/stage-color";
import { DemoJobBoard } from "@/components/demo-job-board";
import { UpdateStageForm } from "@/components/update-stage-form";
import { TryOnReadyToggle } from "@/components/try-on-ready-toggle";

export default async function TailorJobsPage() {
  const account = await requireRole("tailor");
  if ("demo" in account) return <DemoJobBoard />;

  const jobs = await getTailorActiveJobs(account.user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <DashboardHeading eyebrow="In production" title="Active job board" description="Real paid orders, ordered by closest due date." />
      <Panel className="overflow-hidden">
        {jobs.map((job) => {
          const Icon = stageIcon(job.stage);
          return (
            <div key={job.id} className="border-b border-line p-5 last:border-0">
              <div className="flex items-center gap-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${stageIconClasses(job.stage)}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{job.title}</p>
                    <StatusPill>{job.stage}</StatusPill>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {job.customerName} · {job.reference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">{job.dueDate}</p>
                  <p className="text-[10px] text-muted">due date</p>
                </div>
              </div>
              {job.status !== "shipped" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <TryOnReadyToggle orderId={job.id} ready={job.tryOnReady} />
                </div>
              )}
              {job.status !== "shipped" && <UpdateStageForm orderId={job.id} currentStage={job.stage} />}
            </div>
          );
        })}
        {jobs.length === 0 && <p className="p-8 text-center text-sm text-muted">No active jobs yet.</p>}
      </Panel>
    </div>
  );
}
