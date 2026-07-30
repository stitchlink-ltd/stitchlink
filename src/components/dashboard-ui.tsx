import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow ">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-4xl font-semibold">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  trend = "up",
}: {
  label: string;
  value: string;
  detail: string;
  trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <article className="rounded-lg  bg-paper p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p
        className={cn(
          "mt-3 flex items-center gap-1 text-[11px]",
          trend === "neutral" ? "text-muted" : trend === "up" ? "text-sage" : "text-wine"
        )}
      >
        {trend !== "neutral" && <TrendIcon size={13} />} {detail}
      </p>
    </article>
  );
}

export function StatusPill({
  children,
  tone = "gold",
}: {
  children: React.ReactNode;
  tone?: "gold" | "green" | "wine" | "gray";
}) {
  const colors = {
    gold: "bg-[#f4e8d5] text-[#755322]",
    green: "bg-[#e3eee8] text-sage",
    wine: "bg-wine/10 text-wine",
    gray: "bg-[#eeeae4] text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        colors[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("rounded-xl  bg-paper", className)} {...rest}>
      {children}
    </section>
  );
}
