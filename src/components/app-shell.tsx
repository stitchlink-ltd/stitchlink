"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, ChevronDown, CircleDollarSign, ClipboardCheck, FolderOpen, Gauge, Images, LayoutDashboard, LogOut, Menu, MessageCircle, Ruler, Scale, Scissors, Settings, ShieldCheck, Sparkles, Users, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { CurrencySwitcher } from "./price";
import { ThemeToggle } from "./theme-toggle";

type Role = "customer" | "tailor" | "admin";
type Identity = { name: string; subtitle: string };

const nav = {
  customer: [["Overview", "/customer", LayoutDashboard], ["My orders", "/customer/orders", Scissors], ["Messages", "/customer/messages", MessageCircle], ["Measurements", "/customer/measurements", Ruler], ["Appointments", "/customer/appointments", CalendarDays], ["Virtual try-on", "/customer/try-on", Sparkles], ["Payments", "/customer/payments", WalletCards]],
  tailor: [["Overview", "/tailor", LayoutDashboard], ["Active jobs", "/tailor/jobs", Scissors], ["Requests & quotes", "/tailor/quotes", MessageCircle], ["Appointments", "/tailor/appointments", CalendarDays], ["Portfolio", "/tailor/portfolio", Images], ["Earnings", "/tailor/earnings", CircleDollarSign], ["Verification", "/tailor/verification", ShieldCheck]],
  admin: [["Overview", "/admin", Gauge], ["Tailor reviews", "/admin/verification", ClipboardCheck], ["Orders", "/admin/orders", FolderOpen], ["Disputes", "/admin/disputes", Scale], ["Payments & payouts", "/admin/payments", WalletCards], ["Grade policy", "/admin/grading", ShieldCheck], ["Users", "/admin/users", Users]],
} as const;

function initials(name: string) { return name.split(/\s+/).slice(0,2).map((part)=>part.charAt(0)).join("").toUpperCase() || "SL"; }

export function AppShell({ children, role, identity, demo = false }: { children: React.ReactNode; role: Role; identity: Identity; demo?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-ink p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0", open?"translate-x-0":"-translate-x-full")}>
      <div className="flex items-center justify-between"><Logo inverted /><button onClick={()=>setOpen(false)} className="grid size-9 place-items-center rounded-full border border-white/15 lg:hidden" aria-label="Close navigation"><X size={17}/></button></div>
      <details className="group relative mt-9"><summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d6b483] text-xs font-bold text-ink">{initials(identity.name)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{identity.name}</p><p className="truncate text-[11px] text-white/45">{identity.subtitle}</p></div><ChevronDown size={14} className="ml-auto text-white/45 transition group-open:rotate-180" /></summary><div className="mt-2 rounded-xl border border-white/10 bg-[#312724] p-2 text-sm"><Link href={demo?"/":"/account"} className="flex items-center gap-2 rounded-lg px-3 py-2 text-white/65 hover:bg-white/5 hover:text-white"><Settings size={15}/>Account settings</Link><form action={signOut}><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-white/65 hover:bg-white/5 hover:text-white"><LogOut size={15}/>{demo?"Exit demo":"Sign out"}</button></form></div></details>
      <nav className="mt-7 space-y-1" aria-label={`${role} navigation`}>{nav[role].map(([label,href,Icon])=>{const active=href===`/${role}`?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} onClick={()=>setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",active?"bg-paper text-foreground":"text-white/55 hover:bg-white/7 hover:text-white")}><Icon size={17}/>{label}</Link>})}</nav>
      <div className="mt-auto border-t border-white/10 pt-5"><form action={signOut}><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 hover:text-white"><LogOut size={17}/>{demo?"Exit demo":"Sign out"}</button></form></div>
    </aside>
    {open&&<button className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={()=>setOpen(false)} aria-label="Close navigation overlay" />}
    <div className="min-w-0"><header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={()=>setOpen(true)} className="grid size-10 place-items-center rounded-full border border-line lg:hidden" aria-label="Open navigation"><Menu size={18}/></button><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{role} workspace</p><p className="font-display text-lg font-semibold">Welcome, {identity.name.split(" ")[0]}</p></div></div><div className="flex items-center gap-2"><ThemeToggle /><CurrencySwitcher compact /><button className="relative grid size-10 place-items-center rounded-full border border-line" aria-label="Notifications"><Bell size={17}/><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-wine ring-2 ring-paper"/></button></div></header><main className="p-4 sm:p-7 lg:p-9">{children}</main></div>
  </div>;
}
