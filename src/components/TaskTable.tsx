import type { Engineer, Task } from "../types";
import { PRIORITY_STYLES, STATUS_STYLES, avatarColor, formatSLA, initials, slaColor, workloadColor } from "../ui";

export default function TaskTable({
  tasks,
  engineerMap,
  highlightIds,
  onSelectTask,
  onSelectEngineer,
}: {
  tasks: Task[];
  engineerMap: Map<string, Engineer>;
  highlightIds: Set<string>;
  onSelectTask: (id: string) => void;
  onSelectEngineer: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <div className="text-[13px] font-semibold text-ink">LIVE ALLOCATION</div>
          <div className="text-[11px] text-ink-dim">Tasks are matched to engineers by skill, load, and SLA risk</div>
        </div>
        <div className="text-[11px] text-ink-dim">{tasks.length} tasks</div>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
            <tr className="text-[10.5px] uppercase tracking-wide text-ink-dim">
              <th className="px-5 py-2.5 font-medium">Task</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Skills</th>
              <th className="px-3 py-2.5 font-medium">Assigned</th>
              <th className="px-3 py-2.5 font-medium">SLA</th>
              <th className="px-3 py-2.5 font-medium">Workload</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const eng = t.assignedTo ? engineerMap.get(t.assignedTo) : null;
              const p = PRIORITY_STYLES[t.priority];
              const s = STATUS_STYLES[t.status];
              const highlighted = highlightIds.has(t.id);
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTask(t.id)}
                  className={`cursor-pointer border-b border-border/60 text-[12.5px] transition-colors hover:bg-white/[0.03] ${
                    highlighted ? "bg-cyan-400/[0.06] animate-flash-border border-cyan-400/40" : ""
                  }`}
                >
                  <td className="px-5 py-2.5">
                    <div className="font-mono-num font-medium text-ink">{t.id}</div>
                    <div className="text-[11px] text-ink-dim">{t.type}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10.5px] font-medium ${p.bg} ${p.text} ${p.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {t.requiredSkills.map((sk) => (
                        <span key={sk} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-dim">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {eng ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEngineer(eng.id);
                        }}
                        className="flex items-center gap-2 hover:opacity-80"
                      >
                        <span
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold text-[#04141c]"
                          style={{ backgroundColor: avatarColor(eng.id) }}
                        >
                          {initials(eng.name)}
                        </span>
                        <span className="whitespace-nowrap text-ink">{eng.name}</span>
                      </button>
                    ) : (
                      <span className="text-ink-dim">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono-num font-medium ${slaColor(t)}`}>{formatSLA(t.slaMinutesLeft)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {eng ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className={`h-full rounded-full ${workloadColor(eng.workload)}`}
                            style={{ width: `${eng.workload}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] text-ink-dim">{eng.workload}%</span>
                      </div>
                    ) : (
                      <span className="text-ink-dim">&mdash;</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-md px-2 py-1 text-[10.5px] font-medium ${s.bg} ${s.text}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
