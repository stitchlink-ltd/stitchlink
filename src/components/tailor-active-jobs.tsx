import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusPill } from "@/components/dashboard-ui";
import { requireRole } from "@/data/auth";
import { getTailorActiveJobs } from "@/data/marketplace";
import { stageIcon, stageIconClasses } from "@/lib/stage-color";
import { DemoTailorActiveJobs } from "./demo-tailor-active-jobs";

export async function TailorActiveJobs() {
  const account = await requireRole("tailor");
  if ("demo" in account) return <DemoTailorActiveJobs />;

  const jobs = await getTailorActiveJobs(account.user.id);
  if (jobs.length === 0) return <p className="p-5 text-sm text-muted">No active jobs yet.</p>;

  return (
    <div className="divide-y divide-line">
      {jobs.map((job) => {
        const Icon = stageIcon(job.stage);
        return (
          <Link href="/tailor/jobs" key={job.id} className="flex items-center gap-4 p-5 hover:bg-background">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${stageIconClasses(job.stage)}`}>
              <Icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
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
            <ArrowRight size={15} />
          </Link>
        );
      })}
    </div>
  );
}
