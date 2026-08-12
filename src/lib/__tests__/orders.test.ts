import { describe, expect, it } from "vitest";
import { canTransitionOrder, payoutReleaseAt } from "../orders";
describe("order workflow",()=>{
  it("allows valid forward transitions",()=>{expect(canTransitionOrder("pending_payment","active")).toBe(true);expect(canTransitionOrder("delivered","completed")).toBe(true)});
  it("blocks invalid state skipping",()=>{expect(canTransitionOrder("pending_deposit","completed")).toBe(false);expect(canTransitionOrder("completed","active")).toBe(false)});
  it("opens automatic release after 72 hours",()=>{expect(payoutReleaseAt(new Date("2026-07-22T12:00:00Z")).toISOString()).toBe("2026-07-25T12:00:00.000Z")});
});
