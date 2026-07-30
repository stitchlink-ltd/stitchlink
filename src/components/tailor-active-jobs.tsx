"use client";
import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";
import { StatusPill } from "@/components/dashboard-ui";
import { useBoardJobs } from "@/lib/mock-board";

export function TailorActiveJobs() {
  const { jobs } = useBoardJobs();
  const sorted = [...jobs].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="divide-y divide-line">
      {sorted.map((job) => (
        <Link href="/tailor/jobs" key={job.id} className="flex items-center gap-4 p-5 hover:bg-background">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background text-wine">
            <Scissors size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{job.title}</p>
              <StatusPill>{job.stage}</StatusPill>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {job.owner} · {job.code}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-wine" style={{ width: `${job.progress}%` }} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">{job.dueDate}</p>
            <p className="text-[10px] text-muted">due date</p>
          </div>
          <ArrowRight size={15} />
        </Link>
      ))}
    </div>
  );
}
