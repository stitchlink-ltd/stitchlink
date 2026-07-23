import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./logo";

const groups = [
  { title: "Explore", links: [["Find a tailor", "/tailors"], ["How it works", "/#how-it-works"], ["Tailor grading", "/grading"]] },
  { title: "For tailors", links: [["Join StitchLink", "/join"], ["Tailor dashboard", "/tailor"], ["Verification", "/tailor/verification"]] },
  { title: "Support", links: [["Payment protection", "/protection"], ["Help centre", "/help"], ["Privacy", "/privacy"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo inverted />
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
            Exceptional Nigerian tailoring, made personal and protected — wherever you are in the world.
          </p>
          <div className="mt-6 flex items-center gap-3 text-white/70">
            <a href="#" aria-label="Instagram" className="grid size-9 place-items-center rounded-full border border-white/15 text-[10px] font-bold hover:text-white">IG</a>
            <a href="#" aria-label="LinkedIn" className="grid size-9 place-items-center rounded-full border border-white/15 text-[10px] font-bold hover:text-white">in</a>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="eyebrow text-[#d6b483]">{group.title}</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/65">
                {group.links.map(([label, href]) => <li key={href}><Link className="hover:text-white" href={href}>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-shell flex flex-col gap-3 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 StitchLink Technologies. All rights reserved.</p>
          <p className="flex items-center gap-1.5"><ShieldCheck size={14} /> Payments processed securely by Paystack</p>
        </div>
      </div>
    </footer>
  );
}
