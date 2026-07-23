import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";
import { DashboardHeading, Panel, StatusPill } from "@/components/dashboard-ui";
import { Price } from "@/components/price";
import { customerOrders } from "@/lib/demo-data";
export default function OrdersPage(){return <div className="mx-auto max-w-6xl"><DashboardHeading eyebrow="Order history" title="My orders" description="Active commissions and completed pieces."/><Panel className="divide-y divide-line overflow-hidden">{customerOrders.map(order=><Link key={order.id} href={`/customer/orders/${order.id}`} className="flex flex-col gap-4 p-5 hover:bg-background sm:flex-row sm:items-center"><span className="grid size-12 place-items-center rounded-xl bg-[#eee6da] text-wine"><Scissors size={20}/></span><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-semibold">{order.title}</h2><StatusPill>{order.stage}</StatusPill></div><p className="mt-1 text-xs text-muted">{order.tailor} · Due {order.dueDate}</p></div><Price kobo={order.amountKobo} className="font-semibold"/><ArrowRight size={16}/></Link>)}</Panel></div>}
