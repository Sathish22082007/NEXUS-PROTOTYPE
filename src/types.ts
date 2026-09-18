export type Priority = "Critical" | "High" | "Medium" | "Low";

export type TaskStatus = "Assigned" | "In Progress" | "At Risk" | "Reallocating" | "Unassigned";

export type Availability = "Available" | "Busy" | "Unavailable";

export interface Engineer {
  id: string;
  name: string;
  role: string;
  location: string;
  skills: string[];
  workload: number; // 0-100 %
  availability: Availability;
  slaSuccess: number; // 0-100 %
  avgCompletionHrs: number;
}

export interface Task {
  id: string;
  type: string;
  priority: Priority;
  requiredSkills: string[];
  location: string;
  complexity: "Low" | "Medium" | "High";
  slaMinutesLeft: number;
  slaTotalMinutes: number;
  status: TaskStatus;
  assignedTo: string | null; // engineer id
  suitabilityScore: number; // 0-100, score of current assignment
}

export interface ActivityEvent {
  id: string;
  time: string;
  message: string;
  tone: "info" | "warn" | "success" | "critical";
}

export interface CandidateScore {
  engineer: Engineer;
  skillMatch: number;
  workloadScore: number;
  slaScore: number;
  availableNow: boolean;
  predictedHrs: number;
  total: number;
}

export interface ReallocationRecord {
  taskId: string;
  beforeEngineerId: string | null;
  afterEngineerId: string;
  reasons: string[];
  candidate: CandidateScore;
}

export interface DecisionStats {
  candidatesEvaluated: number;
  constraintsChecked: number;
  slaRisks: number;
  decisionSeconds: number;
}

export type OverlayKind = "engineer-unavailable" | "new-critical-task" | "quick";
export type OverlayPhase = "detect" | "optimize" | "complete";

export interface OverlayState {
  kind: OverlayKind;
  phase: OverlayPhase;
  headline: string;
  subline: string;
  affectedTaskIds: string[];
  reallocations: ReallocationRecord[];
  quickMessage?: string;
  impact?: ImpactMetrics;
  explanations?: Explanation[];
}

export interface ImpactMetrics {
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

export interface Explanation {
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
