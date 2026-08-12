"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

type Status = "loading" | "subscribed" | "unsubscribed";

export function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Boolean(publicKey);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "unsubscribed");
    });
  }, [supported]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push-subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push-subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="mt-5 rounded-2xl bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${status === "subscribed" ? "bg-sage/10 text-sage" : "bg-blue/10 text-blue"}`}>
            {status === "subscribed" ? <Bell size={18} /> : <BellOff size={18} />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Push notifications</p>
            <p className="mt-1 font-semibold">{status === "loading" ? "Checking…" : status === "subscribed" ? "Enabled on this device" : "Not enabled"}</p>
          </div>
        </div>
        {status === "subscribed" ? (
          <button onClick={disable} disabled={busy} className="rounded-full border border-line px-4 py-2 text-xs font-semibold disabled:opacity-50">Disable</button>
        ) : (
          <button onClick={enable} disabled={busy || status === "loading"} className="rounded-full bg-wine px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Enable</button>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">Get alerts on this device for order updates, quotes, and payouts even when StitchLink isn&apos;t open.</p>
    </div>
  );
}
