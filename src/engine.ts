import type { CandidateScore, Engineer, ReallocationRecord, Task } from "./types";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Deterministic weighted scoring. Same inputs always produce the same
 * ranking -- there is no randomness anywhere in this file.
 */
export function scoreCandidate(task: Task, engineer: Engineer): CandidateScore {
  const matched = task.requiredSkills.filter((s) => engineer.skills.includes(s)).length;
  const skillMatch = Math.round((matched / task.requiredSkills.length) * 100);

  const workloadScore = 100 - engineer.workload;
  const slaScore = engineer.slaSuccess;
  const availableNow = engineer.availability === "Available";
  const availabilityScore = availableNow ? 100 : engineer.availability === "Busy" ? 45 : 0;

  const total = clamp(
    skillMatch * 0.4 + workloadScore * 0.25 + slaScore * 0.2 + availabilityScore * 0.15,
    0,
    99.4
  );

  const complexityHrs = task.complexity === "High" ? 3.4 : task.complexity === "Medium" ? 2.2 : 1.3;
  const predictedHrs = +(complexityHrs * (0.6 + engineer.workload / 160) * (matched ? 1 : 1.4)).toFixed(1);

  return {
    engineer,
    skillMatch,
    workloadScore,
    slaScore,
    availableNow,
    predictedHrs,
    total: Math.round(total * 10) / 10,
  };
}

export function rankCandidates(
  task: Task,
  engineers: Engineer[],
  excludeIds: Set<string> = new Set()
): CandidateScore[] {
  return engineers
    .filter((e) => !excludeIds.has(e.id) && e.availability !== "Unavailable")
    .map((e) => scoreCandidate(task, e))
    .sort((a, b) => b.total - a.total);
}

export function buildReasons(c: CandidateScore): string[] {
  return [
    `Skill match ${c.skillMatch}%`,
    `Workload ${c.engineer.workload}%`,
    `SLA success ${c.slaScore}%`,
    c.availableNow ? "Available now" : "Reallocating capacity",
    `Predicted completion ${c.predictedHrs}h`,
  ];
}

export interface EngineerUnavailableResult {
  engineerId: string;
  affectedTaskIds: string[];
  reallocations: ReallocationRecord[];
  candidatesEvaluated: number;
  constraintsChecked: number;
}

/** Simulate an engineer going unavailable and re-optimize their active tasks. */
export function simulateEngineerUnavailable(
  engineerId: string,
  tasks: Task[],
  engineers: Engineer[]
): EngineerUnavailableResult {
  const affected = tasks.filter((t) => t.assignedTo === engineerId && t.status !== "Unassigned");
  const workloadBumps = new Map<string, number>();
  const reallocations: ReallocationRecord[] = [];
  let candidatesEvaluated = 0;

  // Highest priority task re-optimized first so the most urgent work
  // gets first pick of the best-fit engineer.
  const priorityRank: Record<Task["priority"], number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const ordered = [...affected].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  for (const task of ordered) {
    const exclude = new Set([engineerId]);
    const ranked = rankCandidates(task, engineers, exclude)
      .map((c) => {
        const bump = workloadBumps.get(c.engineer.id) ?? 0;
        if (bump === 0) return c;
        const adjustedEngineer = { ...c.engineer, workload: clamp(c.engineer.workload + bump, 0, 100) };
        return scoreCandidate(task, adjustedEngineer);
      })
      .sort((a, b) => b.total - a.total);
    candidatesEvaluated += ranked.length;
    const best = ranked[0];
    if (!best) continue;
    workloadBumps.set(best.engineer.id, (workloadBumps.get(best.engineer.id) ?? 0) + 9);
    reallocations.push({
      taskId: task.id,
      beforeEngineerId: engineerId,
      afterEngineerId: best.engineer.id,
      reasons: buildReasons(best),
      candidate: best,
    });
  }

  return {
    engineerId,
    affectedTaskIds: affected.map((t) => t.id),
    reallocations,
    candidatesEvaluated,
    constraintsChecked: candidatesEvaluated * 3,
  };
}

export interface NewCriticalTaskResult {
  task: Task;
  reallocation: ReallocationRecord;
  candidatesEvaluated: number;
  constraintsChecked: number;
}

/** Inject a new critical task deterministically and assign the best engineer. */
export function simulateNewCriticalTask(
  seedIndex: number,
  tasks: Task[],
  engineers: Engineer[]
): NewCriticalTaskResult {
  const scenarios = [
    { type: "Incident Response", skills: ["Security", "Networking"], location: "Bengaluru" },
    { type: "Customer Escalation", skills: ["React", "Node.js"], location: "Chennai" },
    { type: "Infra Migration", skills: ["Kubernetes", "AWS"], location: "Pune" },
  ];
  const s = scenarios[seedIndex % scenarios.length];
  let id = `CRIT-${100 + seedIndex}`;
  while (tasks.some((t) => t.id === id)) id = `${id}-B`;

  const draft: Task = {
    id,
    type: s.type,
    priority: "Critical",
    requiredSkills: s.skills,
    location: s.location,
    complexity: "High",
    slaMinutesLeft: 60,
    slaTotalMinutes: 90,
    status: "Unassigned",
    assignedTo: null,
    suitabilityScore: 0,
  };

  const ranked = rankCandidates(draft, engineers);
  const best = ranked[0];
  const finalTask: Task = { ...draft, assignedTo: best.engineer.id, status: "Assigned", suitabilityScore: Math.round(best.total) };

  return {
    task: finalTask,
    reallocation: {
      taskId: id,
      beforeEngineerId: null,
      afterEngineerId: best.engineer.id,
      reasons: buildReasons(best),
      candidate: best,
    },
    candidatesEvaluated: ranked.length,
    constraintsChecked: ranked.length * 3,
  };
}

export function slaRiskCount(tasks: Task[]): number {
  return tasks.filter((t) => t.slaMinutesLeft / t.slaTotalMinutes < 0.25).length;
}

export function avgUtilization(engineers: Engineer[]): number {
  return Math.round(engineers.reduce((sum, e) => sum + e.workload, 0) / engineers.length);
}
