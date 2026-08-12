"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,body,href,read_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications((data as NotificationRow[] | null) ?? []);

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20)),
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item)));
    const supabase = createSupabaseBrowserClient();
    await supabase?.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  }

  async function markAllRead() {
    if (!userId || unreadCount === 0) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    const supabase = createSupabaseBrowserClient();
    await supabase?.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  }

  return (
    <details className="group relative">
      <summary
        className="relative grid size-10 cursor-pointer list-none place-items-center rounded-full border border-line [&::-webkit-details-marker]:hidden"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[16px] place-items-center rounded-full bg-wine px-1 text-[9px] font-bold leading-[16px] text-white ring-2 ring-paper">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-[340px] max-w-[90vw] rounded-2xl border border-line bg-paper shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>}
          {notifications.map((item) => {
            const content = (
              <div className={cn("flex gap-2 border-b border-line px-4 py-3 last:border-b-0", !item.read_at && "bg-wine/[0.04]")}>
                {!item.read_at && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-wine" />}
                <div className={cn("min-w-0", item.read_at && "pl-3.5")}>
                  <p className="truncate text-[13px] font-semibold">{item.title}</p>
                  <p className="line-clamp-2 text-xs text-muted">{item.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted/70">{timeAgo(item.created_at)}</p>
                </div>
              </div>
            );
            return item.href ? (
              <Link key={item.id} href={item.href} onClick={() => markRead(item.id)} className="block hover:bg-background">
                {content}
              </Link>
            ) : (
              <button key={item.id} onClick={() => markRead(item.id)} className="block w-full text-left hover:bg-background">
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
