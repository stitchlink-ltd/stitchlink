export const orderTransitions = {
  pending_deposit: ["active", "cancelled"],
  active: ["awaiting_balance", "cancelled", "disputed"],
  awaiting_balance: ["ready", "cancelled", "disputed"],
  ready: ["shipped", "delivered", "disputed"],
  shipped: ["delivered", "disputed"],
  delivered: ["completed", "disputed"],
  disputed: ["active", "cancelled", "completed"],
  completed: [],
  cancelled: [],
} as const;

export type OrderStatus = keyof typeof orderTransitions;

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return (orderTransitions[from] as readonly string[]).includes(to);
}

export function payoutReleaseAt(deliveredAt: Date) {
  return new Date(deliveredAt.getTime() + 72 * 60 * 60 * 1000);
}
