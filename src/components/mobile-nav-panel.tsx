"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { PublicNavAccount } from "@/lib/use-public-account";
import { publicNavLinks } from "./site-header";
import { Logo } from "./logo";
import { CurrencySwitcher } from "./price";
import { ThemeToggle } from "./theme-toggle";
import { ButtonLink } from "./ui/button";

export function MobileNavPanel({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: PublicNavAccount | undefined;
}) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-10 flex w-[280px] flex-col bg-ink p-5 text-white md:hidden"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between">
        <Logo inverted />
        <button
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full border border-white/15"
          aria-label="Close navigation"
        >
          <X size={17} />
        </button>
      </div>
      <nav className="mt-9 flex flex-col gap-1" aria-label="Mobile navigation">
        {publicNavLinks.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="rounded-xl px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/7 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <CurrencySwitcher compact />
        </div>
        {account !== undefined && (
          <ButtonLink
            href={account ? `/${account.role}` : "/sign-in"}
            onClick={onClose}
            variant="secondary"
            className="w-full justify-center bg-transparent text-white hover:bg-white/10"
          >
            {account ? "Dashboard" : "Sign in"}
          </ButtonLink>
        )}
        <ButtonLink href="/request" className="w-full justify-center">Start a request</ButtonLink>
      </div>
    </aside>
  );
}
