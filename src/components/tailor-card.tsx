import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import type { Tailor } from "@/lib/types";
import { GradeBadge } from "./grade-badge";
import { Price } from "./price";

export function TailorCard({ tailor, priority = false }: { tailor: Tailor; priority?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-[1.4rem] border border-line bg-paper transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
      <Link href={`/tailors/${tailor.slug}`} className="relative block aspect-[4/4.5] overflow-hidden bg-[#dccfc0]">
        <Image
          src="/stitchlink-hero.png"
          alt={`${tailor.studio} portfolio`}
          fill
          priority={priority}
          sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 300px"
          className="object-cover transition duration-700 group-hover:scale-[1.035]"
          style={{ objectPosition: tailor.imagePosition }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-4 top-4"><GradeBadge grade={tailor.grade} /></div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <p className="text-xs text-white/75">{tailor.name}</p>
            <h2 className="font-display text-2xl font-semibold">{tailor.studio}</h2>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-white text-ink"><ArrowUpRight size={17} /></span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><MapPin size={13} /> {tailor.location}</span>
          <span className="flex items-center gap-1 font-semibold text-ink"><Star className="fill-gold text-gold" size={13} /> {tailor.rating} <span className="font-normal text-muted">({tailor.reviews})</span></span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tailor.specialties.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-[#f0eae1] px-2.5 py-1 text-[11px] text-muted">{item}</span>)}
        </div>
        <div className="flex items-end justify-between border-t border-line pt-3">
          <div><p className="text-[10px] uppercase tracking-wider text-muted">From</p><Price kobo={tailor.startingPriceKobo} className="font-semibold" /></div>
          <p className="text-xs text-muted">{tailor.turnaround}</p>
        </div>
      </div>
    </article>
  );
}
