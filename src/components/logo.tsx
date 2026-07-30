import Link from "next/link";
import Image from "next/image";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="StitchLink home">
      <span className={`grid size-10 place-items-center overflow-hidden rounded-xl ${inverted ? "bg-[#fff9f0] ring-1 ring-white/20" : "bg-paper ring-1 ring-line"}`}>
        <Image src="/stitchlink-mark.png" alt="" width={40} height={40} priority className="size-10 object-contain" />
      </span>
      <span className={`font-display text-2xl font-semibold tracking-tight ${inverted ? "text-white" : "text-foreground"}`}>
        StitchLink
      </span>
    </Link>
  );
}
