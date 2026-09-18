import { MapPin, X } from "lucide-react";
import type { Engineer, Task } from "../types";
import { avatarColor, formatSLA, initials, workloadColor } from "../ui";

export default function EmployeeDrawer({
  engineer,
  tasks,
  onClose,
}: {
  engineer: Engineer;
  tasks: Task[];
  onClose: () => void;
}) {
  const assignments = tasks.filter((t) => t.assignedTo === engineer.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-in-up relative flex h-full w-full max-w-sm flex-col overflow-auto border-l border-border bg-surface p-5">
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-dim hover:text-ink">
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-[#04141c]"
            style={{ backgroundColor: avatarColor(engineer.id) }}
          >
            {initials(engineer.name)}
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">{engineer.name}</div>
            <div className="text-xs text-ink-dim">{engineer.role}</div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-1.5 text-xs text-ink-dim">
          <MapPin className="h-3.5 w-3.5" /> {engineer.location}
          <span
            className={`ml-auto rounded-full px-2 py-1 text-[10.5px] font-medium ${
              engineer.availability === "Available"
                ? "bg-emerald-400/10 text-emerald-300"
                : engineer.availability === "Busy"
                ? "bg-amber-400/10 text-amber-300"
                : "bg-rose-500/10 text-rose-300"
            }`}
          >
            {engineer.availability}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {engineer.skills.map((s) => (
            <span key={s} className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-ink-dim">
              {s}
            </span>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <Metric label="Current workload">
            <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full rounded-full ${workloadColor(engineer.workload)}`} style={{ width: `${engineer.workload}%` }} />
            </div>
            <span className="font-mono-num text-sm text-ink">{engineer.workload}%</span>
          </Metric>
          <Metric label="SLA success">
            <span className="font-mono-num text-lg font-semibold text-emerald-300">{engineer.slaSuccess}%</span>
          </Metric>
          <Metric label="Avg completion">
            <span className="font-mono-num text-lg font-semibold text-ink">{engineer.avgCompletionHrs}h</span>
          </Metric>
          <Metric label="Assignments">
            <span className="font-mono-num text-lg font-semibold text-ink">{assignments.length}</span>
          </Metric>
        </div>

        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Current assignments</div>
        <div className="space-y-2">
          {assignments.length === 0 && <div className="text-xs text-ink-dim">No active assignments.</div>}
          {assignments.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5">
              <div>
                <div className="font-mono-num text-xs font-medium text-ink">{t.id}</div>
                <div className="text-[11px] text-ink-dim">{t.type}</div>
              </div>
              <div className="font-mono-num text-[11px] text-ink-dim">{formatSLA(t.slaMinutesLeft)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <div className="mb-1 text-[10px] text-ink-dim">{label}</div>
      {children}
    </div>
  );
}
