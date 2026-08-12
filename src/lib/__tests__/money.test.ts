import { describe, expect, it } from "vitest";
import { calculatePlatformFee, calculateTailorPayable, ngnKoboToUsdCents, splitTailorRelease } from "../money";

describe("money rules",()=>{
  it("takes 10% of tailoring only",()=>{expect(calculatePlatformFee(240_000_00)).toBe(24_000_00)});
  it("does not commission delivery and deducts provider fees",()=>{expect(calculateTailorPayable({tailoringSubtotalKobo:240_000_00,deliveryKobo:20_000_00,paystackFeesKobo:2_500_00})).toBe(233_500_00)});
  it("keeps odd tailor payout releases balanced",()=>{expect(splitTailorRelease(101)).toEqual({initialKobo:50,finalKobo:51})});
  it("converts kobo to estimated USD cents",()=>{expect(ngnKoboToUsdCents(240_000_00,1600)).toBe(15_000)});
  it("rejects invalid FX rates",()=>{expect(()=>ngnKoboToUsdCents(100,0)).toThrow()});
});
