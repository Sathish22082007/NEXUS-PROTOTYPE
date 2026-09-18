import { BrainCircuit } from "lucide-react";
import type { DecisionStats } from "../types";

export default function DecisionPanel({
  stats,
  engineerCount,
  taskCount,
  thinking,
}: {
  stats: DecisionStats;
  engineerCount: number;
  taskCount: number;
  thinking: boolean;
}) {
  const rows = [
    { label: "Candidates evaluated", value: stats.candidatesEvaluated },
    { label: "Constraints checked", value: stats.constraintsChecked },
    { label: "SLA risks", value: stats.slaRisks },
    { label: "Decision time", value: `${stats.decisionSeconds}s` },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <BrainCircuit className={`h-4 w-4 text-violet-400 ${thinking ? "animate-pulse" : ""}`} />
        <span className="text-[12.5px] font-semibold text-ink">AI DECISION ENGINE</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-ink-dim">
          <span className={`h-1.5 w-1.5 rounded-full ${thinking ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          {thinking ? "Optimizing" : "Idle"}
        </span>
      </div>

      <div className="space-y-1.5 text-[11.5px] text-ink-dim">
        <div>
          Analyzing <span className="font-mono-num text-ink">{engineerCount}</span> engineers
        </div>
        <div>
          Evaluating <span className="font-mono-num text-ink">{taskCount}</span> tasks
        </div>
        <div>
          Checking <span className="font-mono-num text-ink">{stats.constraintsChecked || engineerCount * 3}</span>{" "}
          constraints
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <div className="font-mono-num text-lg font-semibold text-ink">{r.value}</div>
            <div className="text-[10px] text-ink-dim">{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
