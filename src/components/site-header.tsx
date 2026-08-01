"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { CurrencySwitcher } from "./price";
import { ThemeToggle } from "./theme-toggle";
import { ButtonLink } from "./ui/button";

export const publicNavLinks = [
  ["Find a tailor", "/tailors"],
  ["How it works", "/#how-it-works"],
  ["Why StitchLink", "/#why"],
] as const;

export function SiteHeader({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-background/90 backdrop-blur-xl">
      <div className="container-shell flex h-[72px] items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {publicNavLinks.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium text-muted transition hover:text-wine">
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <CurrencySwitcher compact />
          <Link href="/sign-in" className="px-2 text-sm font-semibold hover:text-wine">Sign in</Link>
          <ButtonLink href="/request" className="min-h-10 px-4 py-2">Start a request</ButtonLink>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-line md:hidden"
          onClick={onToggle}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
    </header>
  );
}
