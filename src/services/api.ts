import type { Engineer, Task, ActivityEvent } from "../types";

const BASE = import.meta.env.VITE_API_URL || "";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function postJSON<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ---- Raw backend shapes ----

interface RawSkill {
  name: string;
  proficiency: number;
}

interface RawEmployee {
  id: string;
  employee_code: string;
  name: string;
  role: string;
  location: string;
  availability_status: string;
  current_workload: number;
  max_capacity: number;
  historical_sla_success: number;
  active: boolean;
  skills: RawSkill[];
}

interface RawTaskRequiredSkill {
  name: string;
  minimum_proficiency: number;
}

interface RawTask {
  id: string;
  title: string;
  task_type: string;
  priority: string;
  urgency: number;
  sla_hours: number;
  estimated_effort_hours: number;
  location: string;
  status: string;
  required_people: number;
  complexity: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  suitability_score: number | null;
  required_skills: RawTaskRequiredSkill[];
}

interface RawDashboard {
  engineer_count: number;
  active_tasks: number;
  sla_at_risk: number;
  utilization: number;
  available_employees: number;
  busy_employees: number;
  unavailable_employees: number;
}

interface RawActivityEvent {
  id: string;
  time: string;
  message: string;
  tone: string;
}

// ---- Mapping functions ----

function mapEngineer(raw: RawEmployee): Engineer {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    location: raw.location,
    skills: raw.skills.map((s) => s.name),
    workload: Math.round(raw.current_workload),
    availability: raw.availability_status as Engineer["availability"],
    slaSuccess: Math.round(raw.historical_sla_success),
    avgCompletionHrs: raw.historical_sla_success > 0 ? 2.0 : 2.5,
  };
}

function mapTask(raw: RawTask): Task {
  const slaTotalMinutes = Math.round(raw.sla_hours * 60);
  const slaMinutesLeft = Math.round(slaTotalMinutes * 0.65);
  return {
    id: raw.id,
    type: raw.task_type,
    priority: raw.priority as Task["priority"],
    requiredSkills: raw.required_skills.map((s) => s.name),
    location: raw.location,
    complexity: raw.complexity as Task["complexity"],
    slaMinutesLeft,
    slaTotalMinutes,
    status: mapTaskStatus(raw.status),
    assignedTo: raw.assigned_to,
    suitabilityScore: raw.suitability_score ?? 0,
  };
}

function mapTaskStatus(status: string): Task["status"] {
  const map: Record<string, Task["status"]> = {
    Assigned: "Assigned",
    "In Progress": "In Progress",
    "At Risk": "At Risk",
    Reallocating: "Reallocating",
    Unassigned: "Unassigned",
  };
  return map[status] ?? "Unassigned";
}

function mapActivityEvent(raw: RawActivityEvent): ActivityEvent {
  return {
    id: raw.id,
    time: raw.time,
    message: raw.message,
    tone: raw.tone as ActivityEvent["tone"],
  };
}

// ---- Public API ----

export async function getEmployees(): Promise<Engineer[]> {
  const raw = await fetchJSON<RawEmployee[]>("/api/employees");
  return raw.map(mapEngineer);
}

export async function getEmployee(id: string): Promise<Engineer> {
  const raw = await fetchJSON<RawEmployee>(`/api/employees/${id}`);
  return mapEngineer(raw);
}

export async function getTasks(): Promise<Task[]> {
  const raw = await fetchJSON<RawTask[]>("/api/tasks");
  return raw.map(mapTask);
}

export async function getDashboard(): Promise<RawDashboard> {
  return fetchJSON<RawDashboard>("/api/dashboard");
}

export async function getEvents(): Promise<ActivityEvent[]> {
  const raw = await fetchJSON<RawActivityEvent[]>("/api/events");
  return raw.map(mapActivityEvent);
}

export async function getOptimizationHistory(): Promise<unknown[]> {
  return fetchJSON<unknown[]>("/api/optimization/history");
}

export async function healthCheck(): Promise<{ status: string; service: string }> {
  return fetchJSON<{ status: string; service: string }>("/api/health");
}

// ---- Event API ----

export interface BackendReallocation {
  task_id: string;
  before_employee_id: string | null;
  after_employee_id: string;
  after_employee_name: string;
  reasons: string[];
  prediction_score: number;
  skill_match: number;
  workload: number;
  available_now: boolean;
}

export interface BackendImpact {
  assignments_changed: number;
  sla_risk_before: number;
  sla_risk_after: number;
  overloaded_before: number;
  overloaded_after: number;
  utilization_before: number;
  utilization_after: number;
  active_assignments_before: number;
  active_assignments_after: number;
  unassigned_before: number;
  unassigned_after: number;
}

export interface BackendDecisionStats {
  candidates_evaluated: number;
  constraints_checked: number;
  sla_risks: number;
  decision_seconds: number;
}

export interface BackendExplanation {
  employee_id: string;
  employee_name: string;
  task_id: string;
  prediction_score: number;
  skill_match: number;
  workload: number;
  available_capacity: number;
  sla_feasible: boolean;
  location_match: boolean;
  historical_sla_success: number;
  task_urgency: string;
  task_complexity: string;
  reason_codes: string[];
  human_readable: string;
}

export interface EventResult {
  event: { type: string; employee_id?: string; task_id?: string; timestamp?: string };
  affected_task_ids: string[];
  reallocations: BackendReallocation[];
  impact: BackendImpact;
  decision_stats: BackendDecisionStats;
  explanations: BackendExplanation[];
}

export async function simulateEmployeeUnavailable(employeeId: string): Promise<EventResult> {
  return postJSON<EventResult>("/api/events/employee-unavailable", { employee_id: employeeId });
}

export async function simulateNewCriticalTask(): Promise<EventResult> {
  return postJSON<EventResult>("/api/events/new-task");
}

export async function resetSimulation(): Promise<{ status: string; message: string }> {
  return postJSON<{ status: string; message: string }>("/api/reset");
}
