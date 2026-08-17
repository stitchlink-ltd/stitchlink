import type { GradeMetrics } from "./types";

export const gradeRules = [
  {
    grade: 5,
    minJobs: 100,
    minRating: 4.7,
    minOnTime: 95,
    maxCancellation: 5,
    maxLostDisputes: 3,
    capacity: 20,
  },
  {
    grade: 4,
    minJobs: 50,
    minRating: 4.5,
    minOnTime: 90,
    maxCancellation: 7,
    maxLostDisputes: 5,
    capacity: 12,
  },
  {
    grade: 3,
    minJobs: 20,
    minRating: 4.2,
    minOnTime: 85,
    maxCancellation: 10,
    maxLostDisputes: 7,
    capacity: 7,
  },
  {
    grade: 2,
    minJobs: 5,
    minRating: 4.0,
    minOnTime: 80,
    maxCancellation: 15,
    maxLostDisputes: 10,
    capacity: 4,
  },
] as const;

export function calculateGrade(metrics: GradeMetrics): 1 | 2 | 3 | 4 | 5 {
  const matched = gradeRules.find(
    (rule) =>
      metrics.completedJobs >= rule.minJobs &&
      metrics.rating >= rule.minRating &&
      metrics.onTimeRate >= rule.minOnTime &&
      metrics.cancellationRate <= rule.maxCancellation &&
      metrics.lostDisputeRate <= rule.maxLostDisputes
  );
  return matched?.grade ?? 1;
}

export function capacityForGrade(grade: 1 | 2 | 3 | 4 | 5) {
  return ({ 1: 2, 2: 4, 3: 7, 4: 12, 5: 20 } as const)[grade];
}

export function canAcceptJob(grade: 1 | 2 | 3 | 4 | 5, activeJobs: number, reservedJobs = 0) {
  return activeJobs + reservedJobs < capacityForGrade(grade);
}
