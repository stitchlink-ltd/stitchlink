import "server-only";

import { getNgnPerUsd } from "@/lib/fx";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PendingApplicationDocument = { id: string; documentType: string };

export type PendingTailorApplication = {
  id: string;
  tailorId: string;
  studio: string;
  city: string;
  state: string;
  bio: string;
  specialties: string[];
  startingPriceKobo: number;
  turnaroundMinDays: number;
  turnaroundMaxDays: number;
  displayName: string;
  email: string | null;
  accountStatus: "active" | "suspended";
  documents: PendingApplicationDocument[];
  submittedAt: string | null;
};

export async function getPendingTailorApplications(): Promise<PendingTailorApplication[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tailor_applications")
    .select(
      "id,tailor_id,submitted_at,tailor_profiles(studio_name,city,state,bio,specialties,starting_price_kobo,turnaround_min_days,turnaround_max_days),profiles(display_name,email,account_status),verification_documents(id,document_type)",
    )
    .in("status", ["submitted", "in_review"])
    .order("submitted_at", { ascending: true });
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  return rows.map((application) => {
    const profile = application.tailor_profiles as Record<string, unknown> | null;
    const account = application.profiles as Record<string, unknown> | null;
    const documents = (application.verification_documents as Array<Record<string, unknown>> | null) ?? [];
    return {
      id: String(application.id),
      tailorId: String(application.tailor_id),
      studio: String(profile?.studio_name ?? "Unnamed atelier"),
      city: String(profile?.city ?? ""),
      state: String(profile?.state ?? ""),
      bio: String(profile?.bio ?? ""),
      specialties: Array.isArray(profile?.specialties) ? (profile.specialties as unknown[]).map(String) : [],
      startingPriceKobo: Number(profile?.starting_price_kobo ?? 0),
      turnaroundMinDays: Number(profile?.turnaround_min_days ?? 0),
      turnaroundMaxDays: Number(profile?.turnaround_max_days ?? 0),
      displayName: String(account?.display_name ?? "Unnamed"),
      email: account?.email ? String(account.email) : null,
      accountStatus: (account?.account_status as "active" | "suspended") ?? "active",
      documents: documents.map((document) => ({ id: String(document.id), documentType: String(document.document_type) })),
      submittedAt: application.submitted_at ? String(application.submitted_at) : null,
    };
  });
}

export type AdminAccount = {
  id: string;
  displayName: string;
  email: string | null;
  role: "customer" | "tailor" | "admin";
  accountStatus: "active" | "suspended";
  suspendedReason: string | null;
  createdAt: string;
};

export async function getAllAccounts(): Promise<AdminAccount[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,email,role,account_status,suspended_reason,created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    displayName: String(row.display_name || "Unnamed"),
    email: row.email ? String(row.email) : null,
    role: row.role as AdminAccount["role"],
    accountStatus: row.account_status as AdminAccount["accountStatus"],
    suspendedReason: row.suspended_reason ? String(row.suspended_reason) : null,
    createdAt: String(row.created_at),
  }));
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export type AdminOrderSummary = {
  id: string;
  reference: string;
  garmentType: string;
  customerName: string;
  tailorName: string;
  status: string;
  stage: string;
  tailoringSubtotalKobo: number;
  deliveryKobo: number;
  dueDate: string;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  balancePaymentStatus: "pending" | "successful" | "failed" | "refunded" | "partially_refunded" | null;
};

export async function getOrdersOverview(): Promise<AdminOrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select(
      "id,reference,status,stage,tailoring_subtotal_kobo,delivery_kobo,due_date,deposit_paid_at,balance_paid_at,custom_requests(garment_type),profiles!orders_customer_id_fkey(display_name),tailor_profiles(studio_name),payments(installment,status)",
    )
    .order("created_at", { ascending: false });

  return ((data ?? []) as Array<Record<string, unknown>>).map((order) => {
    const request = firstOrNull(order.custom_requests as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const customer = firstOrNull(order.profiles as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const tailor = firstOrNull(order.tailor_profiles as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const payments = (order.payments as Array<Record<string, unknown>> | null) ?? [];
    const balancePayment = payments.find((payment) => payment.installment === "balance");
    return {
      id: String(order.id),
      reference: String(order.reference),
      garmentType: String(request?.garment_type ?? "Custom piece"),
      customerName: String(customer?.display_name ?? "Customer"),
      tailorName: String(tailor?.studio_name ?? "Tailor"),
      status: String(order.status),
      stage: String(order.stage),
      tailoringSubtotalKobo: Number(order.tailoring_subtotal_kobo),
      deliveryKobo: Number(order.delivery_kobo),
      dueDate: String(order.due_date),
      depositPaidAt: order.deposit_paid_at ? String(order.deposit_paid_at) : null,
      balancePaidAt: order.balance_paid_at ? String(order.balance_paid_at) : null,
      balancePaymentStatus: balancePayment ? (balancePayment.status as AdminOrderSummary["balancePaymentStatus"]) : null,
    };
  });
}

export type AdminPaymentsStats = { unreconciledCount: number; eligiblePayoutKobo: number; frozenByDisputesKobo: number };

export async function getPaymentsStats(): Promise<AdminPaymentsStats> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { unreconciledCount: 0, eligiblePayoutKobo: 0, frozenByDisputesKobo: 0 };

  const [{ count: unreconciledCount }, { data: payouts }, { data: disputes }] = await Promise.all([
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payouts").select("amount_kobo").eq("status", "eligible"),
    supabase.from("disputes").select("frozen_amount_kobo").not("status", "in", "(resolved_refund,resolved_partial,resolved_no_refund,closed)"),
  ]);

  return {
    unreconciledCount: unreconciledCount ?? 0,
    eligiblePayoutKobo: ((payouts ?? []) as Array<{ amount_kobo: number }>).reduce((sum, row) => sum + Number(row.amount_kobo), 0),
    frozenByDisputesKobo: ((disputes ?? []) as Array<{ frozen_amount_kobo: number }>).reduce((sum, row) => sum + Number(row.frozen_amount_kobo), 0),
  };
}

export type AdminEligiblePayout = {
  id: string;
  orderReference: string;
  tailorName: string;
  releasePhase: "initial" | "final";
  amountKobo: number;
  createdAt: string;
};

export async function getEligiblePayouts(): Promise<AdminEligiblePayout[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("payouts")
    .select("id,amount_kobo,release_phase,created_at,orders(reference),tailor_profiles(studio_name)")
    .eq("status", "eligible")
    .order("created_at", { ascending: true });

  return ((data ?? []) as Array<Record<string, unknown>>).map((payout) => {
    const order = firstOrNull(payout.orders as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const tailor = firstOrNull(payout.tailor_profiles as Record<string, unknown> | Array<Record<string, unknown>> | null);
    return {
      id: String(payout.id),
      orderReference: String(order?.reference ?? "—"),
      tailorName: String(tailor?.studio_name ?? "Tailor"),
      releasePhase: payout.release_phase as "initial" | "final",
      amountKobo: Number(payout.amount_kobo),
      createdAt: String(payout.created_at),
    };
  });
}

export type AdminLedgerEntry = {
  id: string;
  orderReference: string;
  entryType: string;
  debitAccount: string;
  creditAccount: string;
  amountKobo: number;
  reference: string;
  createdAt: string;
};

export async function getLedgerEntries(limit = 100): Promise<AdminLedgerEntry[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("ledger_entries")
    .select("id,entry_type,debit_account,credit_account,amount_kobo,reference,created_at,orders(reference)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const order = firstOrNull(row.orders as Record<string, unknown> | Array<Record<string, unknown>> | null);
    return {
      id: String(row.id),
      orderReference: String(order?.reference ?? "—"),
      entryType: String(row.entry_type),
      debitAccount: String(row.debit_account),
      creditAccount: String(row.credit_account),
      amountKobo: Number(row.amount_kobo),
      reference: String(row.reference),
      createdAt: String(row.created_at),
    };
  });
}

export type AdminAccountBalance = { account: string; balanceKobo: number };

export async function getLedgerAccountBalances(): Promise<AdminAccountBalance[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("ledger_entries").select("debit_account,credit_account,amount_kobo");

  const balances = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ debit_account: string; credit_account: string; amount_kobo: number }>) {
    const amount = Number(row.amount_kobo);
    balances.set(row.debit_account, (balances.get(row.debit_account) ?? 0) - amount);
    balances.set(row.credit_account, (balances.get(row.credit_account) ?? 0) + amount);
  }

  return Array.from(balances.entries())
    .map(([account, balanceKobo]) => ({ account, balanceKobo }))
    .sort((a, b) => Math.abs(b.balanceKobo) - Math.abs(a.balanceKobo));
}

export type AdminAuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorName: string | null;
  createdAt: string;
};

export async function getAuditEvents(limit = 100): Promise<AdminAuditEvent[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("audit_events")
    .select("id,action,entity_type,entity_id,created_at,profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const actor = firstOrNull(row.profiles as Record<string, unknown> | Array<Record<string, unknown>> | null);
    return {
      id: String(row.id),
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: row.entity_id ? String(row.entity_id) : null,
      actorName: actor?.display_name ? String(actor.display_name) : null,
      createdAt: String(row.created_at),
    };
  });
}

const openDisputeStatuses = ["open", "awaiting_customer", "awaiting_tailor", "in_review"] as const;

export type AdminDispute = {
  id: string;
  reference: string;
  orderReference: string;
  customerName: string;
  tailorName: string;
  reason: string;
  description: string;
  status: string;
  frozenAmountKobo: number;
  responseDueAt: string;
  createdAt: string;
};

export async function getOpenDisputes(): Promise<AdminDispute[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("disputes")
    .select(
      "id,reference,reason,description,status,frozen_amount_kobo,response_due_at,created_at,orders(reference,profiles!orders_customer_id_fkey(display_name),tailor_profiles(studio_name))",
    )
    .in("status", openDisputeStatuses)
    .order("created_at", { ascending: true });

  return ((data ?? []) as Array<Record<string, unknown>>).map((dispute) => {
    const order = firstOrNull(dispute.orders as Record<string, unknown> | Array<Record<string, unknown>> | null);
    const customer = order ? firstOrNull(order.profiles as Record<string, unknown> | Array<Record<string, unknown>> | null) : null;
    const tailor = order ? firstOrNull(order.tailor_profiles as Record<string, unknown> | Array<Record<string, unknown>> | null) : null;
    return {
      id: String(dispute.id),
      reference: String(dispute.reference),
      orderReference: String(order?.reference ?? "—"),
      customerName: String(customer?.display_name ?? "Customer"),
      tailorName: String(tailor?.studio_name ?? "Tailor"),
      reason: String(dispute.reason),
      description: String(dispute.description),
      status: String(dispute.status),
      frozenAmountKobo: Number(dispute.frozen_amount_kobo),
      responseDueAt: String(dispute.response_due_at),
      createdAt: String(dispute.created_at),
    };
  });
}

export type AdminRefund = { id: string; orderReference: string; amountKobo: number; reason: string; status: string; createdAt: string };

export async function getPendingRefunds(): Promise<AdminRefund[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("refunds")
    .select("id,amount_kobo,reason,status,created_at,orders(reference)")
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true });

  return ((data ?? []) as Array<Record<string, unknown>>).map((refund) => {
    const order = firstOrNull(refund.orders as Record<string, unknown> | Array<Record<string, unknown>> | null);
    return {
      id: String(refund.id),
      orderReference: String(order?.reference ?? "—"),
      amountKobo: Number(refund.amount_kobo),
      reason: String(refund.reason),
      status: String(refund.status),
      createdAt: String(refund.created_at),
    };
  });
}

export type AdminActionItem = {
  kind: "dispute" | "verification" | "payout" | "order";
  title: string;
  body: string;
  timeLabel: string;
  tone: "wine" | "gold" | "green" | "gray";
  href: string;
};

export type AdminOverview = {
  grossVolumeThisMonthKobo: number;
  grossVolumeChangePct: number | null;
  activeOrderCount: number;
  dueThisWeekCount: number;
  overdueOrderCount: number;
  tailorsOnlineCount: number;
  tailorsAwaitingReviewCount: number;
  openDisputeCount: number;
  disputesDueTodayCount: number;
  protectedFundsKobo: number;
  eligiblePayoutKobo: number;
  frozenByDisputesKobo: number;
  actionQueue: AdminActionItem[];
  lastWebhookAt: string | null;
  fxCache: { available: boolean; fetchedAt: string; source: string };
  lastPayoutAt: string | null;
};

function hoursUntil(iso: string) {
  const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
  if (hours < 0) return "Overdue";
  if (hours < 1) return "<1 hr";
  if (hours < 48) return `${hours} hr`;
  return `${Math.round(hours / 24)} d`;
}

function timeAgoLabel(iso: string) {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "New";
  if (hours < 48) return `${hours} hr`;
  return `${Math.round(hours / 24)} d`;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const empty: AdminOverview = {
    grossVolumeThisMonthKobo: 0,
    grossVolumeChangePct: null,
    activeOrderCount: 0,
    dueThisWeekCount: 0,
    overdueOrderCount: 0,
    tailorsOnlineCount: 0,
    tailorsAwaitingReviewCount: 0,
    openDisputeCount: 0,
    disputesDueTodayCount: 0,
    protectedFundsKobo: 0,
    eligiblePayoutKobo: 0,
    frozenByDisputesKobo: 0,
    actionQueue: [],
    lastWebhookAt: null,
    fxCache: { available: false, fetchedAt: new Date().toISOString(), source: "unconfigured" },
    lastPayoutAt: null,
  };
  if (!supabase) return empty;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const [
    { data: paymentsThisMonth },
    { data: paymentsLastMonth },
    { data: activeOrders },
    { count: tailorsOnlineCount },
    applications,
    disputes,
    eligiblePayouts,
    paymentsStats,
    { data: payableRows },
    { data: allPayouts },
    { data: lastPayoutRows },
    fxCache,
  ] = await Promise.all([
    supabase.from("payments").select("amount_kobo").eq("status", "successful").gte("paid_at", monthStart),
    supabase.from("payments").select("amount_kobo").eq("status", "successful").gte("paid_at", lastMonthStart).lt("paid_at", monthStart),
    supabase.from("orders").select("due_date").in("status", ["active", "awaiting_balance", "ready", "shipped"]),
    supabase.from("tailor_profiles").select("user_id", { count: "exact", head: true }).eq("published", true),
    getPendingTailorApplications(),
    getOpenDisputes(),
    getEligiblePayouts(),
    getPaymentsStats(),
    supabase.from("ledger_entries").select("amount_kobo").eq("entry_type", "tailor_payable"),
    supabase.from("payouts").select("amount_kobo"),
    supabase.from("payouts").select("paid_at").eq("status", "paid").order("paid_at", { ascending: false }).limit(1),
    getNgnPerUsd(),
  ]);

  const dueDates = ((activeOrders ?? []) as Array<{ due_date: string }>).map((row) => row.due_date);
  const grossThisMonth = ((paymentsThisMonth ?? []) as Array<{ amount_kobo: number }>).reduce((sum, row) => sum + Number(row.amount_kobo), 0);
  const grossLastMonth = ((paymentsLastMonth ?? []) as Array<{ amount_kobo: number }>).reduce((sum, row) => sum + Number(row.amount_kobo), 0);
  const totalPayable = ((payableRows ?? []) as Array<{ amount_kobo: number }>).reduce((sum, row) => sum + Number(row.amount_kobo), 0);
  const totalPayoutsCreated = ((allPayouts ?? []) as Array<{ amount_kobo: number }>).reduce((sum, row) => sum + Number(row.amount_kobo), 0);

  let lastWebhookAt: string | null = null;
  if (admin) {
    const { data: lastWebhook } = await admin.from("webhook_events").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    lastWebhookAt = lastWebhook ? String(lastWebhook.created_at) : null;
  }

  const actionQueue: AdminActionItem[] = [];
  for (const dispute of [...disputes].sort((a, b) => a.responseDueAt.localeCompare(b.responseDueAt)).slice(0, 2)) {
    actionQueue.push({
      kind: "dispute",
      title: "Dispute response due",
      body: `${dispute.orderReference} · ${dispute.reason}`,
      timeLabel: hoursUntil(dispute.responseDueAt),
      tone: "wine",
      href: "/admin/disputes",
    });
  }
  const oldestApplication = applications[0];
  if (oldestApplication) {
    actionQueue.push({
      kind: "verification",
      title: "Tailor verification",
      body: `${oldestApplication.studio} · ${oldestApplication.documents.length} documents ready`,
      timeLabel: oldestApplication.submittedAt ? timeAgoLabel(oldestApplication.submittedAt) : "New",
      tone: "gold",
      href: "/admin/verification",
    });
  }
  if (eligiblePayouts.length > 0) {
    const total = eligiblePayouts.reduce((sum, payout) => sum + payout.amountKobo, 0);
    actionQueue.push({
      kind: "payout",
      title: "Payout review",
      body: `${eligiblePayouts.length} payout${eligiblePayouts.length === 1 ? "" : "s"} eligible`,
      timeLabel: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(total / 100),
      tone: "green",
      href: "/admin/payments",
    });
  }
  const overdueOrderCount = dueDates.filter((date) => date < today).length;
  if (overdueOrderCount > 0) {
    actionQueue.push({
      kind: "order",
      title: "Late production",
      body: `${overdueOrderCount} order${overdueOrderCount === 1 ? "" : "s"} past due date`,
      timeLabel: "Today",
      tone: "gray",
      href: "/admin/orders",
    });
  }

  return {
    grossVolumeThisMonthKobo: grossThisMonth,
    grossVolumeChangePct: grossLastMonth > 0 ? Math.round(((grossThisMonth - grossLastMonth) / grossLastMonth) * 1000) / 10 : null,
    activeOrderCount: dueDates.length,
    dueThisWeekCount: dueDates.filter((date) => date <= weekFromNow).length,
    overdueOrderCount,
    tailorsOnlineCount: tailorsOnlineCount ?? 0,
    tailorsAwaitingReviewCount: applications.length,
    openDisputeCount: disputes.length,
    disputesDueTodayCount: disputes.filter((dispute) => dispute.responseDueAt <= endOfToday).length,
    protectedFundsKobo: Math.max(0, totalPayable - totalPayoutsCreated),
    eligiblePayoutKobo: paymentsStats.eligiblePayoutKobo,
    frozenByDisputesKobo: paymentsStats.frozenByDisputesKobo,
    actionQueue,
    lastWebhookAt,
    fxCache: fxCache,
    lastPayoutAt: ((lastPayoutRows ?? [])[0] as { paid_at: string } | undefined)?.paid_at ?? null,
  };
}
