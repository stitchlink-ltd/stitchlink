import Link from "next/link";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="StitchLink home">
      <span
        className={`relative grid size-8 place-items-center rounded-full border ${inverted ? "border-white/35" : "border-wine/30"}`}
      >
        <span className={`h-4 w-px rotate-45 ${inverted ? "bg-white" : "bg-wine"}`} />
        <span className={`absolute h-4 w-px -rotate-45 ${inverted ? "bg-white" : "bg-wine"}`} />
      </span>
      <span className={`font-display text-2xl font-semibold tracking-tight ${inverted ? "text-white" : "text-ink"}`}>
        StitchLink
      </span>
    </Link>
  );
}
