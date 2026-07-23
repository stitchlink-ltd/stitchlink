import { describe, expect, it } from "vitest";
import { calculateGrade, canAcceptJob, capacityForGrade } from "../grading";
describe("tailor grading",()=>{
  it("awards the highest policy whose every threshold passes",()=>{expect(calculateGrade({completedJobs:120,rating:4.8,onTimeRate:97,cancellationRate:2,lostDisputeRate:1})).toBe(5)});
  it("does not promote on job count alone",()=>{expect(calculateGrade({completedJobs:120,rating:3.9,onTimeRate:97,cancellationRate:2,lostDisputeRate:1})).toBe(1)});
  it("uses capacities 2, 4, 7, 12, 20",()=>{expect([1,2,3,4,5].map(grade=>capacityForGrade(grade as 1|2|3|4|5))).toEqual([2,4,7,12,20])});
  it("counts temporary reservations against capacity",()=>{expect(canAcceptJob(2,3,1)).toBe(false);expect(canAcceptJob(2,2,1)).toBe(true)});
});
