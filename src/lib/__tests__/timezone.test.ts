import { describe, expect, it } from "vitest";
import { zonedDateTimeToUtc } from "../timezone";

describe("zonedDateTimeToUtc",()=>{
  it("treats a naive datetime-local value as UTC when given the UTC zone",()=>{expect(zonedDateTimeToUtc("2026-08-12T16:30","UTC").toISOString()).toBe("2026-08-12T16:30:00.000Z")});
  it("converts a fixed-offset zone (no DST) to the correct UTC instant",()=>{expect(zonedDateTimeToUtc("2026-08-12T16:30","Africa/Lagos").toISOString()).toBe("2026-08-12T15:30:00.000Z")});
  it("accounts for daylight saving in a DST-observing zone",()=>{expect(zonedDateTimeToUtc("2026-08-12T16:30","America/New_York").toISOString()).toBe("2026-08-12T20:30:00.000Z")});
  it("does not silently drift the wall-clock hour across the browser/server boundary",()=>{const result=zonedDateTimeToUtc("2026-01-15T09:00","America/New_York");expect(result.toISOString()).toBe("2026-01-15T14:00:00.000Z")});
});
