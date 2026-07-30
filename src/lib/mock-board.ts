"use client";
import { useCallback, useEffect, useState } from "react";

export const BOARD_STAGES = ["Cutting", "Sewing", "Finishing", "Ready"] as const;
export type BoardStage = (typeof BOARD_STAGES)[number];

export type BoardJob = {
  id: string;
  code: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "due soon" | "on track";
  stage: BoardStage;
  progress: number;
};

export const initialBoardJobs: BoardJob[] = [
  { id: "stl-2408", code: "STL-2408", title: "Wine embroidered agbada", owner: "Nneka Okafor", dueDate: "Aug 18", status: "due soon", stage: "Sewing", progress: 58 },
  { id: "stl-2413", code: "STL-2413", title: "Forest green senator set", owner: "Femi Cole", dueDate: "Aug 23", status: "on track", stage: "Cutting", progress: 34 },
  { id: "stl-2369", code: "STL-2369", title: "Midnight tuxedo", owner: "Deji Lawal", dueDate: "Jul 29", status: "on track", stage: "Finishing", progress: 86 },
  { id: "stl-2410", code: "STL-2410", title: "Adire two-piece", owner: "Funke Adisa", dueDate: "Aug 20", status: "on track", stage: "Sewing", progress: 45 },
  { id: "stl-2412", code: "STL-2412", title: "Cream kaftan", owner: "Ngozi Umeh", dueDate: "Aug 22", status: "on track", stage: "Ready", progress: 97 },
];

const STORAGE_KEY = "stitchlink_board_jobs";
const UPDATE_EVENT = "stitchlink_board_jobs_update";

function readStore(): BoardJob[] {
  if (typeof window === "undefined") return initialBoardJobs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialBoardJobs;
    return JSON.parse(raw) as BoardJob[];
  } catch {
    return initialBoardJobs;
  }
}

function writeStore(jobs: BoardJob[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function useBoardJobs() {
  const [jobs, setJobs] = useState<BoardJob[]>(initialBoardJobs);

  useEffect(() => {
    setJobs(readStore());
    const sync = () => setJobs(readStore());
    window.addEventListener(UPDATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(UPDATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const moveJob = useCallback((id: string, stage: BoardStage) => {
    const current = readStore();
    const job = current.find((item) => item.id === id);
    if (!job || job.stage === stage) return null;
    writeStore(current.map((item) => (item.id === id ? { ...item, stage } : item)));
    return job;
  }, []);

  return { jobs, moveJob };
}
