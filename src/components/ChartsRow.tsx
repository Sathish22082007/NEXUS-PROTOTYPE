import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Engineer, Task } from "../types";

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#ff5c72",
  High: "#ffb648",
  Medium: "#4dd4ff",
  Low: "#5b6478",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-dim">{title}</div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: "#151b28",
  border: "1px solid #232b3a",
  borderRadius: 10,
  fontSize: 11,
  color: "#e7ecf5",
};

export default function ChartsRow({ engineers, tasks }: { engineers: Engineer[]; tasks: Task[] }) {
  const buckets = [
    { name: "0-40%", min: 0, max: 40 },
    { name: "40-65%", min: 40, max: 65 },
    { name: "65-85%", min: 65, max: 85 },
    { name: "85-100%", min: 85, max: 101 },
  ];
  const workloadData = buckets.map((b) => ({
    name: b.name,
    count: engineers.filter((e) => e.workload >= b.min && e.workload < b.max).length,
  }));

  const priorities: Task["priority"][] = ["Critical", "High", "Medium", "Low"];
  const priorityData = priorities.map((p) => ({
    name: p,
    count: tasks.filter((t) => t.priority === p).length,
  }));

  const atRisk = tasks.filter((t) => t.slaMinutesLeft / t.slaTotalMinutes < 0.25).length;
  const slaData = [
    { name: "On Track", value: tasks.length - atRisk, color: "#35d99a" },
    { name: "At Risk", value: atRisk, color: "#ff5c72" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ChartCard title="Workload Distribution">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={workloadData} margin={{ left: -20, right: 4, top: 4 }}>
            <XAxis dataKey="name" tick={{ fill: "#8a93a6", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8a93a6", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#4dd4ff" maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Task Priority">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={priorityData} layout="vertical" margin={{ left: 4, right: 12, top: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "#8a93a6", fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {priorityData.map((p) => (
                <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="SLA Risk">
        <div className="flex items-center">
          <ResponsiveContainer width="55%" height={140}>
            <PieChart>
              <Pie data={slaData} dataKey="value" innerRadius={34} outerRadius={54} paddingAngle={3} strokeWidth={0}>
                {slaData.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 text-[11px]">
            {slaData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-ink-dim">{s.name}</span>
                <span className="font-mono-num text-ink">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
