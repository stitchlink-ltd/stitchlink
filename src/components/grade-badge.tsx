import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function GradeBadge({ grade, compact = false }: { grade: number; compact?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/35 font-semibold text-white backdrop-blur",
      compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs",
    )}>
      <ShieldCheck size={compact ? 11 : 13} /> Grade {grade}
    </span>
  );
}
