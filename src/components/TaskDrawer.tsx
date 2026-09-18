import { MapPin, X } from "lucide-react";
import type { Engineer, Task } from "../types";
import { PRIORITY_STYLES, avatarColor, formatSLA, initials } from "../ui";

export default function TaskDrawer({
  task,
  engineer,
  onClose,
  onSelectEngineer,
}: {
  task: Task;
  engineer: Engineer | null;
  onClose: () => void;
  onSelectEngineer: (id: string) => void;
}) {
  const p = PRIORITY_STYLES[task.priority];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-in-up relative flex h-full w-full max-w-sm flex-col overflow-auto border-l border-border bg-surface p-5">
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-dim hover:text-ink">
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="mb-1 font-mono-num text-lg font-semibold text-ink">{task.id}</div>
        <div className="mb-4 text-sm text-ink-dim">{task.type}</div>

        <span
          className={`mb-5 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${p.bg} ${p.text} ${p.border}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
          {task.priority} priority
        </span>

        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <Metric label="SLA deadline" value={formatSLA(task.slaMinutesLeft)} />
          <Metric label="Complexity" value={task.complexity} />
          <Metric label="Location" value={task.location} icon={<MapPin className="h-3 w-3" />} />
          <Metric label="AI suitability" value={`${task.suitabilityScore}%`} accent="text-cyan-300" />
        </div>

        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Required skills</div>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {task.requiredSkills.map((s) => (
            <span key={s} className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-ink-dim">
              {s}
            </span>
          ))}
        </div>

        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Current assignment</div>
        {engineer ? (
          <button
            onClick={() => onSelectEngineer(engineer.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-3 text-left hover:border-cyan-400/30"
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#04141c]"
              style={{ backgroundColor: avatarColor(engineer.id) }}
            >
              {initials(engineer.name)}
            </span>
            <div>
              <div className="text-[13px] font-medium text-ink">{engineer.name}</div>
              <div className="text-[11px] text-ink-dim">
                Workload {engineer.workload}% &middot; SLA {engineer.slaSuccess}%
              </div>
            </div>
          </button>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-ink-dim">
            Unassigned &mdash; awaiting allocation
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon, accent }: { label: string; value: string; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <div className="mb-1 text-[10px] text-ink-dim">{label}</div>
      <div className={`flex items-center gap-1 font-mono-num text-sm font-semibold ${accent ?? "text-ink"}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
