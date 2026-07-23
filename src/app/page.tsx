import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, CreditCard, Globe2, MessageCircle, Ruler, Search, ShieldCheck, Sparkles, Star, WandSparkles } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { TailorCard } from "@/components/tailor-card";
import { ButtonLink } from "@/components/ui/button";
import { tailors, testimonials } from "@/lib/demo-data";

export default function Home() {
  return (
    <PublicShell>
      <section className="relative min-h-[720px] overflow-hidden bg-ink text-white lg:min-h-[760px]">
        <Image src="/stitchlink-hero.png" alt="Models wearing bespoke Nigerian pieces in a Lagos atelier" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#241715]/95 via-[#301b19]/55 to-black/5" />
        <div className="absolute inset-x-0 top-0 border-b border-white/15 bg-black/15 py-2 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-white/75 backdrop-blur-sm sm:text-xs">
          Made in Nigeria · Worn everywhere
        </div>
        <div className="container-shell relative flex min-h-[720px] items-center pb-16 pt-24 lg:min-h-[760px]">
          <div className="max-w-[660px]">
            <p className="eyebrow mb-5 flex items-center gap-2 text-[#e2c18f]"><span className="h-px w-8 bg-[#e2c18f]" /> Bespoke, without borders</p>
            <h1 className="font-display text-[clamp(3.5rem,7vw,6.8rem)] font-medium leading-[.9] tracking-[-.055em]">
              Made for you.<br /><em className="font-normal text-[#e3caa6]">Made to matter.</em>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Meet Nigeria&apos;s most trusted tailors. Share your vision, agree every detail, and follow the making of a piece that is unmistakably yours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/tailors" className="bg-[#f4eee5] text-ink hover:bg-white" arrow>Find your tailor</ButtonLink>
              <ButtonLink href="/join" variant="ghost" className="border-white/30 text-white hover:bg-white/10">Join as a tailor</ButtonLink>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/65">
              {["Manually verified", "Protected payments", "Progress you can see"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check size={14} className="text-[#e2c18f]" /> {item}</span>)}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 hidden w-[38%] border-l border-t border-white/20 bg-black/25 p-5 backdrop-blur-lg lg:block">
          <div className="flex items-center justify-between">
            <div><p className="eyebrow text-[#e2c18f]">Featured atelier</p><p className="mt-1 font-display text-xl">Adaobi Atelier</p></div>
            <Link href="/tailors/adaobi-atelier" className="grid size-11 place-items-center rounded-full border border-white/25 hover:bg-white hover:text-ink" aria-label="View Adaobi Atelier"><ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="container-shell -translate-y-7 rounded-2xl border border-line bg-paper p-3 soft-shadow">
          <form action="/tailors" className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-background"><Search size={18} className="text-wine" /><span><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">I&apos;m looking for</span><input name="specialty" className="w-full bg-transparent text-sm font-medium outline-none" placeholder="Agbada, bridal, suits…" /></span></label>
            <label className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-background"><Globe2 size={18} className="text-wine" /><span><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Location</span><input name="location" className="w-full bg-transparent text-sm font-medium outline-none" placeholder="Anywhere in Nigeria" /></span></label>
            <label className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-background"><CalendarClock size={18} className="text-wine" /><span><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Needed by</span><input name="date" type="date" className="w-full bg-transparent text-sm font-medium outline-none" /></span></label>
            <button className="rounded-xl bg-wine px-7 py-4 text-sm font-semibold text-white transition hover:bg-wine-dark">Search tailors</button>
          </form>
        </div>
        <div className="container-shell grid grid-cols-2 gap-6 pb-14 pt-4 text-center md:grid-cols-4">
          {[["120+", "verified ateliers"], ["2,400+", "pieces completed"], ["4.8 / 5", "average rating"], ["96%", "delivered on time"]].map(([value,label]) => <div key={label}><p className="font-display text-3xl font-semibold text-wine">{value}</p><p className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</p></div>)}
        </div>
      </section>

      <section className="container-shell py-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="eyebrow text-wine">Curated for craft</p><h2 className="mt-3 max-w-xl font-display text-4xl leading-tight sm:text-5xl">Meet tailors with a reputation worth wearing.</h2></div>
          <ButtonLink href="/tailors" variant="secondary" arrow>Explore all tailors</ButtonLink>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tailors.map((tailor, index) => <TailorCard key={tailor.id} tailor={tailor} priority={index < 2} />)}
        </div>
      </section>

      <section id="how-it-works" className="paper-grid border-y border-line bg-[#eee6da] py-24">
        <div className="container-shell">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div className="lg:sticky lg:top-28 lg:self-start"><p className="eyebrow text-wine">From idea to arrival</p><h2 className="mt-3 font-display text-5xl leading-[1.03]">One thoughtful process. No anxious guessing.</h2><p className="mt-5 max-w-md leading-7 text-muted">Every decision, measurement, payment and update lives in one protected place.</p><ButtonLink href="/request" className="mt-7" arrow>Start your first request</ButtonLink></div>
            <div className="space-y-3">
              {[
                ["01", Search, "Discover your maker", "Browse verified portfolios, specialities, ratings and real availability."],
                ["02", MessageCircle, "Shape the brief together", "Share inspiration, negotiate details and accept a clear, versioned quote."],
                ["03", Ruler, "Share measurements securely", "Use guided templates or book a video call, then approve the exact measurements shared."],
                ["04", Sparkles, "Watch it come to life", "Receive photo updates through every production stage and preview the concept virtually."],
              ].map(([number, Icon, title, body]) => {
                const StepIcon = Icon as typeof Search;
                return <article key={number as string} className="group grid gap-4 rounded-2xl border border-line bg-paper p-6 transition hover:border-wine/35 sm:grid-cols-[52px_1fr_auto] sm:items-center"><span className="font-display text-3xl text-wine/45">{number as string}</span><div><h3 className="font-display text-2xl font-semibold">{title as string}</h3><p className="mt-1 text-sm leading-6 text-muted">{body as string}</p></div><span className="grid size-11 place-items-center rounded-full bg-[#f0e2d0] text-wine"><StepIcon size={20} /></span></article>;
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="overflow-hidden bg-wine-dark py-24 text-white">
        <div className="container-shell grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-[#d8b17e]">Designed for distance</p>
            <h2 className="mt-3 max-w-xl font-display text-5xl leading-[1.02]">Pay from abroad.<br />Stay close to the craft.</h2>
            <p className="mt-6 max-w-lg leading-7 text-white/65">See an estimated USD price while every quote, payment and refund remains exact in naira. Your card issuer handles conversion; StitchLink keeps the work and the money trail clear.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[[CreditCard,"50/50 protected payments"],[ShieldCheck,"Dispute protection"],[Globe2,"International cards"],[WandSparkles,"Concept try-on previews"]].map(([Icon,label]) => { const FeatureIcon = Icon as typeof CreditCard; return <div key={label as string} className="flex items-center gap-3 rounded-xl border border-white/15 p-4 text-sm"><FeatureIcon size={18} className="text-[#d8b17e]" />{label as string}</div>; })}
            </div>
          </div>
          <div className="relative rounded-[2rem] border border-white/15 bg-white/7 p-6 sm:p-9">
            <div className="flex items-center justify-between border-b border-white/15 pb-5"><div><p className="text-xs text-white/50">Custom order</p><p className="mt-1 font-display text-2xl">Hand-embroidered agbada</p></div><span className="rounded-full bg-[#d8b17e] px-3 py-1 text-xs font-bold text-ink">Quote ready</span></div>
            <div className="space-y-4 py-6 text-sm"><div className="flex justify-between"><span className="text-white/55">Tailoring</span><span>₦240,000</span></div><div className="flex justify-between"><span className="text-white/55">Estimated display</span><span>≈ $150.00 USD</span></div><div className="flex justify-between"><span className="text-white/55">Deposit due today</span><span>₦120,000</span></div></div>
            <div className="rounded-xl bg-white/10 p-4 text-xs leading-5 text-white/60">Your checkout charge is exactly ₦120,000. Your bank determines the final amount shown in USD and may add conversion fees.</div>
            <button className="mt-5 w-full rounded-full bg-[#f1ddbf] py-3 text-sm font-bold text-ink">Accept quote & pay deposit</button>
          </div>
        </div>
      </section>

      <section className="container-shell py-24">
        <div className="text-center"><p className="eyebrow text-wine">Stories stitched across borders</p><h2 className="mt-3 font-display text-4xl sm:text-5xl">Made in Lagos. Loved everywhere.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {testimonials.map((item) => <figure key={item.author} className="rounded-2xl border border-line bg-paper p-7 sm:p-9"><div className="flex gap-1 text-gold">{Array.from({length:5}).map((_,i)=><Star key={i} size={14} className="fill-current" />)}</div><blockquote className="mt-5 font-display text-2xl leading-9">“{item.quote}”</blockquote><figcaption className="mt-6 text-sm font-semibold">{item.author}<span className="ml-2 font-normal text-muted">{item.location}</span></figcaption></figure>)}
        </div>
      </section>

      <section className="container-shell pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#d8b17e] px-6 py-16 text-center sm:px-12">
          <div className="absolute -left-16 -top-16 size-52 rounded-full border border-ink/10" /><div className="absolute -bottom-24 -right-16 size-72 rounded-full border border-ink/10" />
          <p className="eyebrow">Your piece starts with a conversation</p><h2 className="relative mx-auto mt-4 max-w-2xl font-display text-5xl leading-none">Find the hands that understand your vision.</h2><div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row"><ButtonLink href="/tailors" variant="dark" arrow>Explore verified tailors</ButtonLink><ButtonLink href="/request" variant="secondary">Post a custom request</ButtonLink></div>
        </div>
      </section>
    </PublicShell>
  );
}
