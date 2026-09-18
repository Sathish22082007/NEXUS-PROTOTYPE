import { useEffect, useMemo, useRef, useState } from "react";
import ActivityFeed from "./components/ActivityFeed";
import ChartsRow from "./components/ChartsRow";
import DecisionPanel from "./components/DecisionPanel";
import EmployeeDrawer from "./components/EmployeeDrawer";
import Header from "./components/Header";
import HeroActions from "./components/HeroActions";
import Landing from "./components/Landing";
import ReallocationOverlay from "./components/ReallocationOverlay";
import SimulateModal from "./components/SimulateModal";
import StatsBar from "./components/StatsBar";
import TaskDrawer from "./components/TaskDrawer";
import TaskTable from "./components/TaskTable";
import { avgUtilization, slaRiskCount } from "./engine";
import { ENGINEERS, TASKS } from "./mockData";
import {
  getEmployees,
  getTasks,
  simulateEmployeeUnavailable,
  simulateNewCriticalTask,
  resetSimulation as apiReset,
  type EventResult,
  type BackendReallocation,
} from "./services/api";
import type { ActivityEvent, DecisionStats, Engineer, ImpactMetrics, OverlayState, Task, ReallocationRecord } from "./types";
import { nowStamp } from "./ui";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function seedActivity(): ActivityEvent[] {
  return [
    { id: "seed-3", time: nowStamp(), message: "SLA monitor sweep complete — 4 tasks flagged", tone: "info" },
    { id: "seed-2", time: nowStamp(), message: "Allocation engine synced with workforce", tone: "info" },
    { id: "seed-1", time: nowStamp(), message: "NEXUS decision engine initialized", tone: "success" },
  ];
}

function buildInitialStats(tasks: Task[]): DecisionStats {
  return {
    candidatesEvaluated: 0,
    constraintsChecked: 0,
    slaRisks: slaRiskCount(tasks),
    decisionSeconds: 0,
  };
}

function mapBackendRealloc(r: BackendReallocation, engineers: Engineer[]): ReallocationRecord {
  const afterEng = engineers.find((e) => e.id === r.after_employee_id);
  return {
    taskId: r.task_id,
    beforeEngineerId: r.before_employee_id,
    afterEngineerId: r.after_employee_id,
    afterEngineerName: r.after_employee_name,
    reasons: r.reasons,
    candidate: {
      engineer: afterEng ?? ({} as Engineer),
      skillMatch: r.skill_match,
      workloadScore: 100 - r.workload,
      slaScore: 90,
      availableNow: r.available_now ?? true,
      predictedHrs: 2.0,
      total: r.prediction_score * 100,
    },
  } as ReallocationRecord;
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>(seedActivity);
  const [decisionStats, setDecisionStats] = useState<DecisionStats>({
    candidatesEvaluated: 0,
    constraintsChecked: 0,
    slaRisks: 0,
    decisionSeconds: 0,
  });

  const [simulateOpen, setSimulateOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const criticalSeedRef = useRef(0);
  const quickIndexRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const initialEngineersRef = useRef<Engineer[]>([]);
  const initialTasksRef = useRef<Task[]>([]);

  async function loadData() {
    try {
      const [emps, tks] = await Promise.all([getEmployees(), getTasks()]);
      if (emps.length > 0 && tks.length > 0) {
        setEngineers(emps);
        setTasks(tks);
        setDecisionStats(buildInitialStats(tks));
        return true;
      }
    } catch {
      console.warn("API unavailable, falling back to mockData");
    }
    setEngineers(structuredClone(ENGINEERS));
    setTasks(structuredClone(TASKS));
    setDecisionStats(buildInitialStats(TASKS));
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromApi = await loadData();
      if (!cancelled) {
        setActivity(fromApi
          ? [
              { id: "api-2", time: nowStamp(), message: "Backend synced — data loaded from database", tone: "info" },
              { id: "api-1", time: nowStamp(), message: "NEXUS decision engine initialized (API)", tone: "success" },
            ]
          : seedActivity()
        );
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading && engineers.length > 0 && initialEngineersRef.current.length === 0) {
      initialEngineersRef.current = structuredClone(engineers);
      initialTasksRef.current = structuredClone(tasks);
    }
  }, [loading, engineers, tasks]);

  const engineerMap = useMemo(() => new Map(engineers.map((e) => [e.id, e])), [engineers]);
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const busyEngineers = useMemo(
    () => engineers.filter((e) => e.availability !== "Unavailable" && tasks.some((t) => t.assignedTo === e.id)).slice(0, 8),
    [engineers, tasks]
  );

  function pushActivity(message: string, tone: ActivityEvent["tone"]) {
    setActivity((prev) =>
      [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: nowStamp(), message, tone }, ...prev].slice(0, 30)
    );
  }

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  // ---------- Engineer Unavailable (backend API) ----------
  async function startEngineerUnavailable(engineerId: string) {
    setSimulateOpen(false);
    const eng = engineers.find((e) => e.id === engineerId);
    if (!eng) return;

    setOverlay({
      kind: "engineer-unavailable",
      phase: "detect",
      headline: "RESOURCE UNAVAILABLE",
      subline: `${eng.name} just went unavailable — detecting affected tasks...`,
      affectedTaskIds: [],
      reallocations: [],
    });
    pushActivity(`🚨 ${eng.name} marked unavailable`, "critical");

    try {
      const result: EventResult = await simulateEmployeeUnavailable(engineerId);

      schedule(() => {
        setOverlay((p) => p ? { ...p, phase: "optimize", subline: `Evaluating ${result.decision_stats.candidates_evaluated} candidates against constraints...` } : p);
        pushActivity(`${result.decision_stats.candidates_evaluated} eligible candidates evaluated`, "info");
        pushActivity(`${result.decision_stats.constraints_checked} constraints checked`, "info");
      }, 900);

      schedule(() => {
        setEngineers((prev) => {
          const bumps = new Map<string, number>();
          result.reallocations.forEach((r) => bumps.set(r.after_employee_id, (bumps.get(r.after_employee_id) ?? 0) + 9));
          return prev.map((e) => {
            if (e.id === engineerId) return { ...e, availability: "Unavailable" as const };
            if (bumps.has(e.id)) return { ...e, workload: clamp(e.workload + (bumps.get(e.id) ?? 0), 0, 100) };
            return e;
          });
        });
        setTasks((prev) =>
          prev.map((t) => {
            const r = result.reallocations.find((x) => x.task_id === t.id);
            if (!r) return t;
            return { ...t, assignedTo: r.after_employee_id, status: "Assigned" as const, suitabilityScore: Math.round(r.prediction_score * 100) };
          })
        );
        setDecisionStats({
          candidatesEvaluated: result.decision_stats.candidates_evaluated,
          constraintsChecked: result.decision_stats.constraints_checked,
          slaRisks: result.decision_stats.sla_risks,
          decisionSeconds: result.decision_stats.decision_seconds,
        });
        result.reallocations.forEach((r) => {
          pushActivity(`${r.after_employee_name} reassigned to ${r.task_id}`, "success");
        });
        pushActivity("Reallocation optimized — SLA risk reduced", "success");
        const mappedReallocs = result.reallocations.map((r) => mapBackendRealloc(r, engineers));
        const impact: ImpactMetrics = {
          assignments_changed: result.impact.assignments_changed,
          sla_risk_before: result.impact.sla_risk_before,
          sla_risk_after: result.impact.sla_risk_after,
          overloaded_before: result.impact.overloaded_before,
          overloaded_after: result.impact.overloaded_after,
          utilization_before: result.impact.utilization_before,
          utilization_after: result.impact.utilization_after,
          active_assignments_before: result.impact.active_assignments_before,
          active_assignments_after: result.impact.active_assignments_after,
          unassigned_before: result.impact.unassigned_before,
          unassigned_after: result.impact.unassigned_after,
        };
        setOverlay((p) => p ? { ...p, phase: "complete", reallocations: mappedReallocs, impact, explanations: result.explanations } : p);
      }, 2200);
    } catch (err) {
      console.error("Event API failed:", err);
      pushActivity("Backend event failed — check connection", "critical");
      setOverlay(null);
    }
  }

  // ---------- New Critical Task (backend API) ----------
  async function startNewCriticalTask() {
    setSimulateOpen(false);

    setOverlay({
      kind: "new-critical-task",
      phase: "detect",
      headline: "CRITICAL TASK DETECTED",
      subline: "Scanning for new critical task...",
      affectedTaskIds: [],
      reallocations: [],
    });
    pushActivity("🚨 New critical task detected", "critical");

    try {
      const result: EventResult = await simulateNewCriticalTask();

      schedule(() => {
        setOverlay((p) => p ? { ...p, phase: "optimize", subline: `Evaluating ${result.decision_stats.candidates_evaluated} eligible engineers...` } : p);
        pushActivity(`${result.decision_stats.candidates_evaluated} eligible engineers identified`, "info");
      }, 900);

      schedule(() => {
        const newTask: Task = {
          id: result.event.task_id ?? "NEW-000",
          type: result.affected_task_ids[0] ?? "Incident Response",
          priority: "Critical",
          requiredSkills: [],
          location: "Bengaluru",
          complexity: "High",
          slaMinutesLeft: 90,
          slaTotalMinutes: 90,
          status: "Assigned",
          assignedTo: result.reallocations[0]?.after_employee_id ?? null,
          suitabilityScore: Math.round((result.reallocations[0]?.prediction_score ?? 0) * 100),
        };
        setTasks((prev) => [newTask, ...prev]);
        if (result.reallocations.length > 0) {
          const r = result.reallocations[0];
          setEngineers((prev) =>
            prev.map((e) => (e.id === r.after_employee_id ? { ...e, workload: clamp(e.workload + 9, 0, 100) } : e))
          );
          pushActivity(`Allocation optimized — ${r.after_employee_name} assigned to ${r.task_id}`, "success");
        }
        setDecisionStats({
          candidatesEvaluated: result.decision_stats.candidates_evaluated,
          constraintsChecked: result.decision_stats.constraints_checked,
          slaRisks: result.decision_stats.sla_risks,
          decisionSeconds: result.decision_stats.decision_seconds,
        });
        pushActivity("Dashboard updated", "success");
        const mappedReallocs = result.reallocations.map((r) => mapBackendRealloc(r, engineers));
        const impact: ImpactMetrics = {
          assignments_changed: result.impact.assignments_changed,
          sla_risk_before: result.impact.sla_risk_before,
          sla_risk_after: result.impact.sla_risk_after,
          overloaded_before: result.impact.overloaded_before,
          overloaded_after: result.impact.overloaded_after,
          utilization_before: result.impact.utilization_before,
          utilization_after: result.impact.utilization_after,
          active_assignments_before: result.impact.active_assignments_before,
          active_assignments_after: result.impact.active_assignments_after,
          unassigned_before: result.impact.unassigned_before,
          unassigned_after: result.impact.unassigned_after,
        };
        setOverlay((p) => p ? { ...p, phase: "complete", reallocations: mappedReallocs, impact, explanations: result.explanations } : p);
      }, 2200);
    } catch (err) {
      console.error("Event API failed:", err);
      pushActivity("Backend event failed — check connection", "critical");
      setOverlay(null);
    }
  }

  // ---------- Quick events (client-side) ----------
  function startQuickEvent(kind: "sla-risk" | "priority-changed" | "workload-increased") {
    setSimulateOpen(false);
    const idx = quickIndexRef.current;
    quickIndexRef.current += 1;

    if (kind === "sla-risk") {
      const candidates = tasks.filter((t) => t.status !== "At Risk");
      const task = candidates[idx % candidates.length];
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, slaMinutesLeft: 9, status: "At Risk" as const } : t)));
      pushActivity(`SLA risk flagged on ${task.id} — 9m remaining`, "warn");
      setOverlay({
        kind: "quick",
        phase: "complete",
        headline: "SLA RISK DETECTED",
        subline: `${task.id} now has 9 minutes remaining`,
        affectedTaskIds: [task.id],
        reallocations: [],
      });
    }

    if (kind === "priority-changed") {
      const candidates = tasks.filter((t) => t.priority === "Medium" || t.priority === "Low");
      const task = candidates[idx % candidates.length];
      const nextPriority = task.priority === "Low" ? "Medium" : "High";
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: nextPriority } : t)));
      pushActivity(`${task.id} escalated to ${nextPriority} priority`, "warn");
      setOverlay({
        kind: "quick",
        phase: "complete",
        headline: "PRIORITY ESCALATED",
        subline: `${task.id} is now ${nextPriority} priority`,
        affectedTaskIds: [task.id],
        reallocations: [],
      });
    }

    if (kind === "workload-increased") {
      const candidates = engineers.filter((e) => e.availability !== "Unavailable");
      const eng = candidates[idx % candidates.length];
      const newLoad = clamp(eng.workload + 22, 0, 98);
      setEngineers((prev) =>
        prev.map((e) => (e.id === eng.id ? { ...e, workload: newLoad, availability: newLoad > 80 ? ("Busy" as const) : e.availability } : e))
      );
      pushActivity(`${eng.name}'s workload spiked to ${newLoad}%`, "warn");
      setOverlay({
        kind: "quick",
        phase: "complete",
        headline: "WORKLOAD SPIKE DETECTED",
        subline: `${eng.name} is now at ${newLoad}% capacity`,
        affectedTaskIds: [],
        reallocations: [],
      });
    }

    schedule(() => setOverlay(null), 1700);
  }

  async function resetSimulation() {
    clearTimers();
    try {
      await apiReset();
      await loadData();
    } catch {
      setEngineers(structuredClone(initialEngineersRef.current));
      setTasks(structuredClone(initialTasksRef.current));
    }
    setActivity(seedActivity());
    setDecisionStats(buildInitialStats(tasks));
    setOverlay(null);
    setSimulateOpen(false);
    setSelectedEngineerId(null);
    setSelectedTaskId(null);
    criticalSeedRef.current = 0;
    quickIndexRef.current = 0;
    pushActivity("Simulation reset to initial state", "info");
  }

  if (!entered) return <Landing onEnter={() => setEntered(true)} />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 mx-auto animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <div className="text-sm text-ink-dim">Connecting to backend...</div>
        </div>
      </div>
    );
  }

  const highlightIds = new Set<string>(
    overlay && overlay.kind !== "quick" ? [...overlay.affectedTaskIds, ...overlay.reallocations.map((r) => r.taskId)] : []
  );

  const selectedEngineer = selectedEngineerId ? engineerMap.get(selectedEngineerId) ?? null : null;
  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) ?? null : null;

  return (
    <div className="min-h-screen bg-base">
      <Header onReset={resetSimulation} />

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <StatsBar
              engineerCount={engineers.length}
              activeTasks={tasks.length}
              slaAtRisk={slaRiskCount(tasks)}
              utilization={avgUtilization(engineers)}
              flashRisk={overlay?.phase === "optimize"}
            />
            <HeroActions onSimulate={() => setSimulateOpen(true)} onCriticalTask={startNewCriticalTask} />
            <TaskTable
              tasks={tasks}
              engineerMap={engineerMap}
              highlightIds={highlightIds}
              onSelectTask={setSelectedTaskId}
              onSelectEngineer={setSelectedEngineerId}
            />
            <ChartsRow engineers={engineers} tasks={tasks} />
          </div>

          <div className="space-y-5">
            <DecisionPanel
              stats={decisionStats}
              engineerCount={engineers.length}
              taskCount={tasks.length}
              thinking={overlay !== null && overlay.kind !== "quick" && overlay.phase !== "complete"}
            />
            <ActivityFeed events={activity} />
          </div>
        </div>
      </main>

      {simulateOpen && (
        <SimulateModal
          onClose={() => setSimulateOpen(false)}
          busyEngineers={busyEngineers}
          onEngineerUnavailable={startEngineerUnavailable}
          onNewCriticalTask={startNewCriticalTask}
          onQuickEvent={startQuickEvent}
        />
      )}

      {overlay && (
        <ReallocationOverlay overlay={overlay} engineerMap={engineerMap} previewStats={decisionStats} onClose={() => setOverlay(null)} />
      )}

      {selectedEngineer && (
        <EmployeeDrawer engineer={selectedEngineer} tasks={tasks} onClose={() => setSelectedEngineerId(null)} />
      )}

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          engineer={selectedTask.assignedTo ? engineerMap.get(selectedTask.assignedTo) ?? null : null}
          onClose={() => setSelectedTaskId(null)}
          onSelectEngineer={(id) => {
            setSelectedTaskId(null);
            setSelectedEngineerId(id);
          }}
        />
      )}
    </div>
  );
}
