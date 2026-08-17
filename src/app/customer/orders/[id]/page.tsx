import { createElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Check, ChevronLeft, Clock3, ImageIcon, MapPin, MessageCircle, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { ButtonLink } from "@/components/ui/button";
import { getAppointmentsForOrder } from "@/data/appointments";
import { requireRole } from "@/data/auth";
import { getCustomerOrderDetail } from "@/data/marketplace";
import { customerOrders, productionStages } from "@/lib/demo-data";
import { stageIcon, stageIconClasses } from "@/lib/stage-color";

function DemoOrderDetail({ id, fitAppointment }: { id: string; fitAppointment: { startsAt: string } | undefined }) {
  const order = customerOrders.find((item) => item.id === id);
  if (!order) notFound();
  const current = productionStages.findIndex((item) => item.key === order.stage);
  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/customer/orders" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-muted"><ChevronLeft size={14} /> All orders</Link>
      <DashboardHeading eyebrow={`${order.reference} · In production`} title={order.title} description={`Created by ${order.tailor} · Due ${order.dueDate}`} action={<div className="flex gap-2"><ButtonLink href="/customer/messages" variant="secondary"><MessageCircle size={15} /> Message</ButtonLink><ButtonLink href="/customer/try-on"><Sparkles size={15} /> Try it on</ButtonLink></div>} />
      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-4">
          <Panel className="p-6">
            <div className="flex items-center justify-between"><div><p className="eyebrow text-wine">Production timeline</p><h2 className="mt-2 font-display text-2xl font-semibold">Every stitch, visible.</h2></div><StatusPill>{order.progress}% complete</StatusPill></div>
            <ol className="mt-7 grid grid-cols-[24px_1fr]">
              {productionStages.map((stage, index) => {
                const done = index < current;
                const active = index === current;
                return (
                  <li key={stage.key} className="contents">
                    <div className="flex flex-col items-center"><span className={`grid size-6 place-items-center rounded-full border ${done ? "border-sage bg-sage text-white" : active ? "border-wine bg-wine text-white" : "border-line bg-paper text-muted"}`}>{done ? <Check size={13} /> : <span className="size-1.5 rounded-full bg-current" />}</span>{index < productionStages.length - 1 && <span className={`min-h-12 w-px flex-1 ${done ? "bg-sage" : "bg-line"}`} />}</div>
                    <div className="pb-6 pl-4">
                      <div className="flex items-center gap-2"><p className={`text-sm font-semibold ${!done && !active ? "text-muted" : ""}`}>{stage.label}</p>{active && <StatusPill tone="wine">Now</StatusPill>}</div>
                      {active && <div className="mt-3 rounded-xl bg-background p-4"><p className="text-sm leading-6">The main embroidery is complete and your outfit is taking shape. Sleeves and side seams are being assembled next.</p><div className="mt-3 flex items-center gap-2 text-[11px] text-muted"><ImageIcon size={13} /> 3 new progress photos · updated yesterday</div></div>}
                      {done && index === 2 && <p className="mt-1 text-xs text-muted">Completed Jul 18</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel className="p-6"><p className="eyebrow text-wine">Latest from the atelier</p><blockquote className="mt-4 font-display text-2xl leading-8">“The embroidery thread catches the light beautifully. I&apos;ve kept the neckline clean as we discussed and will send the first full fitting photos tomorrow.”</blockquote><div className="mt-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">KA</span><div><p className="text-sm font-semibold">Kola Adeyemi</p><p className="text-[11px] text-muted">Yesterday, 5:42 PM</p></div></div></Panel>
        </div>
        <aside className="space-y-4">
          <Panel className="p-5"><div className="flex items-center justify-between"><p className="font-semibold">Payment summary</p><ShieldCheck size={18} className="text-sage" /></div><div className="mt-5 space-y-3 border-b border-line pb-5 text-sm"><div className="flex justify-between text-muted"><span>Order total</span><Price kobo={order.amountKobo} showExact={false} /></div><div className="flex justify-between font-semibold"><span>Payment received</span><span className="text-sage">− <Price kobo={order.amountKobo} showExact={false} /></span></div><div className="flex justify-between font-semibold"><span>Balance due</span><Price kobo={0} showExact={false} /></div></div><p className="mt-4 text-[11px] leading-5 text-muted">You paid in full in NGN. Half of the tailor&apos;s net payout is released first; the remainder stays protected until delivery is confirmed.</p><p className="mt-5 flex items-center justify-center gap-1 text-[10px] text-muted"><ShieldCheck size={11} /> Protected until delivery approval</p></Panel>
          <Panel className="p-5"><p className="font-semibold">Order details</p><dl className="mt-4 space-y-4 text-xs"><div className="flex gap-3"><Calendar size={15} className="text-wine" /><div><dt className="text-muted">Due date</dt><dd className="mt-0.5 font-semibold">{order.dueDate}</dd></div></div><div className="flex gap-3"><Clock3 size={15} className="text-wine" /><div><dt className="text-muted">Fit appointment</dt><dd className="mt-0.5 font-semibold">{fitAppointment ? new Date(fitAppointment.startsAt).toLocaleString() : "Not scheduled yet"}</dd></div></div><div className="flex gap-3"><MapPin size={15} className="text-wine" /><div><dt className="text-muted">Delivery</dt><dd className="mt-0.5 font-semibold">DHL to Toronto, Canada</dd></div></div></dl></Panel>
          <Panel className="p-5"><div className="flex gap-3"><PackageCheck className="text-sage" /><div><p className="font-semibold">Delivery protection</p><p className="mt-1 text-xs leading-5 text-muted">Confirm delivery when you receive the piece to release the tailor&apos;s remaining payout.</p></div></div></Panel>
        </aside>
      </div>
    </div>
  );
}

export default async function OrderDetailPage({ params }: PageProps<"/customer/orders/[id]">) {
  const { id } = await params;
  const account = await requireRole("customer");
  const [fitAppointment] = await getAppointmentsForOrder(id);

  if ("demo" in account) return <DemoOrderDetail id={id} fitAppointment={fitAppointment} />;

  const order = await getCustomerOrderDetail(id, account.user.id);
  if (!order) notFound();
  const paid = Boolean(order.depositPaidAt || order.balancePaidAt);

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/customer/orders" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-muted"><ChevronLeft size={14} /> All orders</Link>
      <DashboardHeading
        eyebrow={`${order.reference} · ${paid ? "In production" : "Awaiting payment"}`}
        title={order.title}
        description={`Created by ${order.tailorName} · Due ${order.dueDate}`}
        action={<div className="flex gap-2"><ButtonLink href="/customer/requests" variant="secondary"><MessageCircle size={15} /> Message</ButtonLink>{order.tryOnReady ? <ButtonLink href="/customer/try-on"><Sparkles size={15} /> Try it on</ButtonLink> : <span title="Your tailor hasn't marked this order ready for a try-on preview yet." className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-wine/20 bg-wine/10 px-5 py-2.5 text-sm font-semibold text-wine opacity-50"><Sparkles size={15} /> Try it on</span>}</div>}
      />
      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-4">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow text-wine">Production progress</p><h2 className="mt-2 font-display text-2xl font-semibold">Every update, visible.</h2></div>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${stageIconClasses(order.stage)}`}>{createElement(stageIcon(order.stage), { size: 13 })} {order.stage}</span>
            </div>
            <div className="mt-6 space-y-4">
              {order.progress.map((update) => {
                const UpdateIcon = stageIcon(update.stage);
                return (
                  <div key={update.id} className="flex gap-3 rounded-xl bg-background p-4">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${stageIconClasses(update.stage)}`}><UpdateIcon size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold capitalize">{update.stage}</p><p className="text-[11px] text-muted">{new Date(update.createdAt).toLocaleDateString()}</p></div>
                      <p className="mt-1 text-sm leading-6 text-muted">{update.note}</p>
                      {update.imagePaths.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {update.imagePaths.map((path) => {
                            const src = `/api/progress-images?orderId=${order.id}&path=${encodeURIComponent(path)}`;
                            return (
                              <a key={path} href={src} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element -- private image behind a signed-URL redirect route, not a static asset */}
                                <img src={src} alt="Progress photo" className="h-16 w-16 rounded-lg object-cover" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {order.progress.length === 0 && <p className="text-sm text-muted">No production updates yet.</p>}
            </div>
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel className="p-5">
            <div className="flex items-center justify-between"><p className="font-semibold">Payment summary</p><ShieldCheck size={18} className="text-sage" /></div>
            <div className="mt-5 space-y-3 border-b border-line pb-5 text-sm">
              <div className="flex justify-between text-muted"><span>Order total</span><Price kobo={order.tailoringSubtotalKobo + order.deliveryKobo} showExact={false} /></div>
              <div className="flex justify-between font-semibold"><span>{paid ? "Payment received" : "Payment status"}</span><span className={paid ? "text-sage" : "text-muted"}>{paid ? <>− <Price kobo={order.tailoringSubtotalKobo + order.deliveryKobo} showExact={false} /></> : "Not yet paid"}</span></div>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-muted">{paid ? "You paid in full in NGN. Half of the tailor's net payout is released first; the remainder stays protected until delivery is confirmed." : "Complete checkout to activate this order."}</p>
            <p className="mt-5 flex items-center justify-center gap-1 text-[10px] text-muted"><ShieldCheck size={11} /> Protected until delivery approval</p>
          </Panel>
          <Panel className="p-5">
            <p className="font-semibold">Order details</p>
            <dl className="mt-4 space-y-4 text-xs">
              <div className="flex gap-3"><Calendar size={15} className="text-wine" /><div><dt className="text-muted">Due date</dt><dd className="mt-0.5 font-semibold">{order.dueDate}</dd></div></div>
              <div className="flex gap-3"><Clock3 size={15} className="text-wine" /><div><dt className="text-muted">Fit appointment</dt><dd className="mt-0.5 font-semibold">{fitAppointment ? new Date(fitAppointment.startsAt).toLocaleString() : "Not scheduled yet"}</dd></div></div>
            </dl>
          </Panel>
          <Panel className="p-5"><div className="flex gap-3"><PackageCheck className="text-sage" /><div><p className="font-semibold">Delivery protection</p><p className="mt-1 text-xs leading-5 text-muted">Confirm delivery when you receive the piece to release the tailor&apos;s remaining payout.</p></div></div></Panel>
        </aside>
      </div>
    </div>
  );
}
