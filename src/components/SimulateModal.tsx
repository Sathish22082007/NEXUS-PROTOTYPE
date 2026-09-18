import { AlertOctagon, ArrowLeft, Clock, Gauge, Plus, UserX, X, Zap } from "lucide-react";
import { useState } from "react";
import type { Engineer } from "../types";
import { avatarColor, initials } from "../ui";

type EventKind = "engineer-unavailable" | "new-critical-task" | "sla-risk" | "priority-changed" | "workload-increased";

const EVENTS: { kind: EventKind; label: string; desc: string; icon: React.ReactNode }[] = [
  { kind: "engineer-unavailable", label: "Engineer Unavailable", desc: "Remove an engineer & watch instant reallocation", icon: <UserX className="h-4 w-4" /> },
  { kind: "new-critical-task", label: "New Critical Task", desc: "Inject a critical task into the pipeline", icon: <Plus className="h-4 w-4" /> },
  { kind: "sla-risk", label: "SLA Risk", desc: "Flag a task about to breach its SLA", icon: <Clock className="h-4 w-4" /> },
  { kind: "priority-changed", label: "Priority Changed", desc: "Escalate a task's priority mid-flight", icon: <AlertOctagon className="h-4 w-4" /> },
  { kind: "workload-increased", label: "Workload Increased", desc: "Spike an engineer's load unexpectedly", icon: <Gauge className="h-4 w-4" /> },
];

export default function SimulateModal({
  onClose,
  busyEngineers,
  onEngineerUnavailable,
  onNewCriticalTask,
  onQuickEvent,
}: {
  onClose: () => void;
  busyEngineers: Engineer[];
  onEngineerUnavailable: (id: string) => void;
  onNewCriticalTask: () => void;
  onQuickEvent: (kind: "sla-risk" | "priority-changed" | "workload-increased") => void;
}) {
  const [view, setView] = useState<"menu" | "pick-engineer">("menu");

  function handlePick(kind: EventKind) {
    if (kind === "engineer-unavailable") {
      setView("pick-engineer");
      return;
    }
    if (kind === "new-critical-task") {
      onNewCriticalTask();
      return;
    }
    onQuickEvent(kind);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-in-up relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          {view === "pick-engineer" && (
            <button onClick={() => setView("menu")} className="text-ink-dim hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <Zap className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-ink">
            {view === "menu" ? "Simulate Event" : "Select an engineer"}
          </span>
          <button onClick={onClose} className="ml-auto text-ink-dim hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "menu" && (
          <div className="space-y-1.5">
            {EVENTS.map((ev) => (
              <button
                key={ev.kind}
                onClick={() => handlePick(ev.kind)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-cyan-400/30 hover:bg-white/[0.02]"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-cyan-400">
                  {ev.icon}
                </span>
                <div>
                  <div className="text-[13px] font-medium text-ink">{ev.label}</div>
                  <div className="text-[11px] text-ink-dim">{ev.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {view === "pick-engineer" && (
          <div className="space-y-1.5">
            <p className="mb-2 text-[11px] text-ink-dim">Currently assigned engineers &mdash; pick one to mark unavailable.</p>
            {busyEngineers.map((eng) => (
              <button
                key={eng.id}
                onClick={() => onEngineerUnavailable(eng.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-left transition-colors hover:border-rose-400/30"
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold text-[#04141c]"
                  style={{ backgroundColor: avatarColor(eng.id) }}
                >
                  {initials(eng.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-ink">{eng.name}</div>
                  <div className="text-[11px] text-ink-dim">
                    {eng.role} &middot; {eng.workload}% load
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
