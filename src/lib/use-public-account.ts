"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type PublicNavAccount = { role: "customer" | "tailor" | "admin" } | null;

/** undefined while the auth check is in flight, null when signed out. */
export function usePublicAccount(): PublicNavAccount | undefined {
  const [account, setAccount] = useState<PublicNavAccount | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) setAccount(null);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setAccount(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled)
        setAccount(profile ? { role: profile.role as "customer" | "tailor" | "admin" } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return account;
}
