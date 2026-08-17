"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePublicAccount } from "@/lib/use-public-account";
import { MobileNavPanel } from "./mobile-nav-panel";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const account = usePublicAccount();
  return (
    <div className="overflow-x-hidden">
      <MobileNavPanel open={open} onClose={() => setOpen(false)} account={account} />
      <div
        className={cn(
          "relative z-20 flex min-h-screen flex-col bg-background transition-transform duration-300 ease-out md:translate-x-0 md:transition-none",
          open ? "translate-x-70" : "translate-x-0"
        )}
      >
        {open && (
          <button
            className="absolute inset-0 z-40 bg-black/10 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <SiteHeader open={open} onToggle={() => setOpen((value) => !value)} account={account} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
