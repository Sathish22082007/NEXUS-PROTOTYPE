import { AlertTriangle, Gauge, ListChecks, Users } from "lucide-react";
import type { ReactNode } from "react";

interface Stat {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  accent: string;
  flash?: boolean;
}

export default function StatsBar({
  engineerCount,
  activeTasks,
  slaAtRisk,
  utilization,
  flashRisk,
}: {
  engineerCount: number;
  activeTasks: number;
  slaAtRisk: number;
  utilization: number;
  flashRisk: boolean;
}) {
  const stats: Stat[] = [
    {
      label: "Workforce",
      value: `${engineerCount}`,
      sub: "Engineers",
      icon: <Users className="h-4 w-4" />,
      accent: "text-cyan-400",
    },
    {
      label: "Active Tasks",
      value: `${activeTasks}`,
      sub: "In the pipeline",
      icon: <ListChecks className="h-4 w-4" />,
      accent: "text-violet-400",
    },
    {
      label: "SLA At Risk",
      value: `${slaAtRisk}`,
      sub: "Need attention",
      icon: <AlertTriangle className="h-4 w-4" />,
      accent: "text-rose-400",
      flash: flashRisk,
    },
    {
      label: "Utilization",
      value: `${utilization}%`,
      sub: "Team average",
      icon: <Gauge className="h-4 w-4" />,
      accent: "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-2xl border border-border bg-surface/70 p-4 transition-shadow ${
            s.flash ? "animate-flash-border" : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-dim">{s.label}</span>
            <span className={s.accent}>{s.icon}</span>
          </div>
          <div className="font-mono-num text-[28px] font-semibold leading-none text-ink">{s.value}</div>
          <div className="mt-1.5 text-xs text-ink-dim/80">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
