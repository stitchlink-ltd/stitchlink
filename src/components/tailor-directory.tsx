"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { Tailor } from "@/lib/types";
import { TailorCard } from "./tailor-card";
import { Button } from "./ui/button";

export function TailorDirectory({ items }: { items: Tailor[] }) {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All specialties");
  const [grade, setGrade] = useState("All grades");
  const [available, setAvailable] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => items.filter((tailor) => {
    const haystack = `${tailor.name} ${tailor.studio} ${tailor.location} ${tailor.specialties.join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) &&
      (specialty === "All specialties" || tailor.specialties.includes(specialty)) &&
      (grade === "All grades" || tailor.grade === Number(grade)) &&
      (!available || tailor.activeJobs < tailor.capacity);
  }), [items, query, specialty, grade, available]);

  const clear = () => { setQuery(""); setSpecialty("All specialties"); setGrade("All grades"); setAvailable(false); };

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3 lg:flex-row lg:items-center">
        <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl bg-background px-4"><Search size={17} className="text-muted" /><input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, style or location" /></label>
        <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={16} /> Filters</Button>
        <div className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-3 lg:flex lg:flex-row`}>
          <label className="relative"><span className="sr-only">Specialty</span><select className="min-h-12 appearance-none rounded-xl border border-line bg-paper pl-4 pr-10 text-sm outline-none" value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option>All specialties</option><option>Agbada</option><option>Bridal</option><option>Suits</option><option>Dresses</option><option>Kaftan</option></select><ChevronDown size={14} className="pointer-events-none absolute right-4 top-4 text-muted" /></label>
          <label className="relative"><span className="sr-only">Grade</span><select className="min-h-12 appearance-none rounded-xl border border-line bg-paper pl-4 pr-10 text-sm outline-none" value={grade} onChange={(event) => setGrade(event.target.value)}><option>All grades</option><option value="5">Grade 5</option><option value="4">Grade 4</option><option value="3">Grade 3</option><option value="2">Grade 2</option><option value="1">Grade 1</option></select><ChevronDown size={14} className="pointer-events-none absolute right-4 top-4 text-muted" /></label>
          <button type="button" onClick={() => setAvailable((value) => !value)} className={`flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm ${available ? "border-wine bg-wine/5 text-wine" : "border-line"}`}><span className={`grid size-4 place-items-center rounded border ${available ? "border-wine bg-wine text-white" : "border-line"}`}>{available && <Check size={11} />}</span>Available now</button>
        </div>
      </div>
      <div className="mt-7 flex items-end justify-between"><div><p className="font-display text-2xl font-semibold">{filtered.length} verified tailors</p><p className="mt-1 text-xs text-muted">Every atelier is manually reviewed before being listed.</p></div>{(query || specialty !== "All specialties" || grade !== "All grades" || available) && <button onClick={clear} className="flex items-center gap-1 text-xs font-semibold text-wine"><X size={13} /> Clear filters</button>}</div>
      {filtered.length > 0 ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((tailor) => <TailorCard key={tailor.id} tailor={tailor} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-line bg-paper p-14 text-center"><p className="font-display text-2xl">No atelier matches those filters.</p><button onClick={clear} className="mt-3 text-sm font-semibold text-wine">See every tailor</button></div>}
    </div>
  );
}
