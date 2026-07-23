"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { CurrencySwitcher } from "./price";
import { ButtonLink } from "./ui/button";

const links = [
  ["Find a tailor", "/tailors"],
  ["How it works", "/#how-it-works"],
  ["Why StitchLink", "/#why"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-background/90 backdrop-blur-xl">
      <div className="container-shell flex h-[72px] items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium text-muted transition hover:text-wine">
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <CurrencySwitcher compact />
          <Link href="/sign-in" className="px-2 text-sm font-semibold hover:text-wine">Sign in</Link>
          <ButtonLink href="/request" className="min-h-10 px-4 py-2">Start a request</ButtonLink>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-line md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-paper px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="border-b border-line py-3 font-medium">
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3">
            <CurrencySwitcher compact />
            <ButtonLink href="/sign-in" variant="secondary" className="flex-1">Sign in</ButtonLink>
            <ButtonLink href="/request" className="flex-1">Start request</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
