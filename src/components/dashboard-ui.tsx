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
    gold: { bg: "bg-blue/10", text: "text-blue", dot: "bg-blue", border: "border-blue/25" },
    green: { bg: "bg-sage/10", text: "text-sage", dot: "bg-sage", border: "border-sage/25" },
    wine: { bg: "bg-wine/10", text: "text-wine", dot: "bg-wine", border: "border-wine/25" },
    gray: { bg: "bg-muted/10", text: "text-muted", dot: "bg-muted", border: "border-muted/25" },
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        colors[tone].bg,
        colors[tone].text,
        colors[tone].border
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", colors[tone].dot)} />
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
