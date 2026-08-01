import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Check, ChevronLeft, MapPin, MessageCircle, Scissors, ShieldCheck, Star } from "lucide-react";
import { GradeBadge } from "@/components/grade-badge";
import { Price } from "@/components/price";
import { PublicShell } from "@/components/public-shell";
import { TailorCard } from "@/components/tailor-card";
import { ButtonLink } from "@/components/ui/button";
import { getPublishedTailorDirectory, getPublishedTailorProfile } from "@/data/marketplace";

export async function generateMetadata({ params }: PageProps<"/tailors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tailor = await getPublishedTailorProfile(slug);
  return { title: tailor?.studio ?? "Tailor", description: tailor?.bio };
}

export default async function TailorProfilePage({ params }: PageProps<"/tailors/[slug]">) {
  const { slug } = await params;
  const tailor = await getPublishedTailorProfile(slug);
  if (!tailor) notFound();
  const directory = await getPublishedTailorDirectory();
  return (
    <PublicShell>
      <section className="container-shell py-5"><Link href="/tailors" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-wine"><ChevronLeft size={14} /> All tailors</Link></section>
      <section className="container-shell grid gap-8 pb-16 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] bg-[#d9ccbc] sm:min-h-[650px]"><Image src="/stitchlink-hero.png" alt={`${tailor.studio} portfolio`} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" style={{ objectPosition: tailor.imagePosition }} /><div className="absolute left-5 top-5"><GradeBadge grade={tailor.grade} /></div></div>
        <div className="flex flex-col lg:py-7">
          <div className="flex items-center gap-2 text-xs font-semibold text-sage"><ShieldCheck size={15} /> Identity and portfolio verified</div>
          <h1 className="mt-5 font-display text-5xl font-semibold sm:text-6xl">{tailor.studio}</h1>
          <p className="mt-2 text-muted">by {tailor.name}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-1"><Star size={15} className="fill-gold text-gold" /> <strong>{tailor.rating}</strong> ({tailor.reviews} reviews)</span><span className="flex items-center gap-1 text-muted"><MapPin size={15} /> {tailor.location}</span></div>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">{tailor.bio}</p>
          <div className="mt-7 flex flex-wrap gap-2">{tailor.specialties.map((item) => <span key={item} className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs">{item}</span>)}</div>
          <div className="mt-8 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-paper p-5 text-center"><div><p className="font-display text-2xl font-semibold">{tailor.completedJobs}</p><p className="text-[10px] uppercase tracking-wider text-muted">Jobs</p></div><div><p className="font-display text-2xl font-semibold">{tailor.onTimeRate}%</p><p className="text-[10px] uppercase tracking-wider text-muted">On time</p></div><div><p className="font-display text-2xl font-semibold">{tailor.capacity-tailor.activeJobs}</p><p className="text-[10px] uppercase tracking-wider text-muted">Open slots</p></div></div>
          <div className="mt-auto pt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs text-muted">Projects from</p><Price kobo={tailor.startingPriceKobo} className="font-display text-3xl font-semibold" /></div><p className="flex items-center gap-1 text-xs text-muted"><CalendarClock size={14} /> {tailor.turnaround}</p></div><div className="grid gap-3 sm:grid-cols-2"><ButtonLink href={`/request?tailor=${tailor.slug}`} className="w-full">Request a quote</ButtonLink><ButtonLink href="/sign-in" variant="secondary" className="w-full"><MessageCircle size={16} /> Message atelier</ButtonLink></div></div>
        </div>
      </section>
      <section className="border-y border-line bg-paper py-20"><div className="container-shell"><div className="flex items-end justify-between"><div><p className="eyebrow text-wine">Selected work</p><h2 className="mt-2 font-display text-4xl">The atelier portfolio</h2></div><span className="hidden text-xs text-muted sm:block">Portfolio reviewed by StitchLink</span></div><div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{["31% center","57% center","75% center","92% center"].map((position,index)=><div key={position} className={`relative overflow-hidden rounded-2xl bg-[#ded0bf] ${index===0?"col-span-2 row-span-2 aspect-square":"aspect-square"}`}><Image src="/stitchlink-hero.png" alt={`Portfolio look ${index+1}`} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-700 hover:scale-105" style={{objectPosition:position}} /></div>)}</div></div></section>
      <section className="container-shell grid gap-8 py-20 lg:grid-cols-2"><div><p className="eyebrow text-wine">What working together feels like</p><h2 className="mt-2 font-display text-4xl">Clear expectations, from first sketch to final stitch.</h2><div className="mt-7 space-y-4">{[[Scissors,"A deliberate process","Every milestone includes a note or image, so you always know where your piece stands."],[ShieldCheck,"Protected funds","Your payment becomes payable only after delivery approval or the protection window closes."],[Check,"Capacity you can trust",`Grade ${tailor.grade} limits this atelier to ${tailor.capacity} active commissions.`]].map(([Icon,title,body])=>{const InfoIcon=Icon as typeof Scissors;return <div key={title as string} className="flex gap-4 rounded-2xl border border-line bg-paper p-5"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0e2d0] text-wine"><InfoIcon size={18} /></span><div><h3 className="font-semibold">{title as string}</h3><p className="mt-1 text-sm leading-6 text-muted">{body as string}</p></div></div>})}</div></div><div className="rounded-[2rem] bg-background p-7 sm:p-10"><div className="flex gap-1 text-gold">{Array.from({length:5}).map((_,i)=><Star key={i} size={15} className="fill-current" />)}</div><blockquote className="mt-5 font-display text-3xl leading-tight">“The updates were so thoughtful that I never felt the distance. The piece arrived exactly as we agreed — and somehow felt even more special in person.”</blockquote><p className="mt-7 text-sm font-semibold">Chioma E. <span className="font-normal text-muted">· New York, USA</span></p></div></section>
      <section className="container-shell pb-20"><div className="rounded-[2rem] bg-wine px-6 py-14 text-center text-white"><p className="eyebrow text-[#e3c59b]">Begin a conversation</p><h2 className="mx-auto mt-3 max-w-2xl font-display text-4xl">Have something in mind for {tailor.studio}?</h2><ButtonLink href={`/request?tailor=${tailor.slug}`} className="mt-6 bg-white text-ink hover:bg-[#f5ede2]">Request a custom quote</ButtonLink></div></section>
      <section className="container-shell pb-20"><h2 className="font-display text-3xl">You may also like</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{directory.filter((item)=>item.id!==tailor.id).slice(0,3).map((item)=><TailorCard key={item.id} tailor={item} />)}</div></section>
    </PublicShell>
  );
}
