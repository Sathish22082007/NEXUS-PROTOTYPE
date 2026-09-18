import type { Priority, Task, TaskStatus } from "./types";

export const PRIORITY_STYLES: Record<Priority, { dot: string; text: string; bg: string; border: string }> = {
  Critical: { dot: "bg-rose-500", text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  High: { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  Medium: { dot: "bg-cyan-400", text: "text-cyan-300", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  Low: { dot: "bg-slate-400", text: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/30" },
};

export const STATUS_STYLES: Record<TaskStatus, { text: string; bg: string }> = {
  Assigned: { text: "text-cyan-300", bg: "bg-cyan-400/10" },
  "In Progress": { text: "text-emerald-300", bg: "bg-emerald-400/10" },
  "At Risk": { text: "text-rose-300", bg: "bg-rose-500/10" },
  Reallocating: { text: "text-violet-300", bg: "bg-violet-400/10" },
  Unassigned: { text: "text-slate-400", bg: "bg-slate-500/10" },
};

export function formatSLA(minutesLeft: number): string {
  if (minutesLeft <= 0) return "Overdue";
  const h = Math.floor(minutesLeft / 60);
  const m = Math.round(minutesLeft % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function slaRatio(task: Task): number {
  return task.slaMinutesLeft / task.slaTotalMinutes;
}

export function slaColor(task: Task): string {
  const r = slaRatio(task);
  if (r < 0.2) return "text-rose-400";
  if (r < 0.4) return "text-amber-400";
  return "text-emerald-400";
}

export function workloadColor(pct: number): string {
  if (pct >= 85) return "bg-rose-500";
  if (pct >= 65) return "bg-amber-400";
  return "bg-emerald-400";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_HUES = ["#4dd4ff", "#8b7bff", "#35d99a", "#ffb648", "#ff5c72", "#5ec8ff", "#a78bfa"];
export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[hash % AVATAR_HUES.length];
}

export function nowStamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}
