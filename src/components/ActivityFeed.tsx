import { Activity } from "lucide-react";
import type { ActivityEvent } from "../types";

const TONE_DOT: Record<ActivityEvent["tone"], string> = {
  info: "bg-cyan-400",
  warn: "bg-amber-400",
  success: "bg-emerald-400",
  critical: "bg-rose-500",
};

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-400" />
        <span className="text-[12.5px] font-semibold text-ink">SYSTEM ACTIVITY</span>
        <span className="ml-auto h-1.5 w-1.5 animate-ticker-blink rounded-full bg-emerald-400" />
      </div>

      <div className="max-h-[300px] space-y-0 overflow-auto pr-1">
        {events.map((e, i) => (
          <div
            key={e.id}
            className={`animate-fade-in-up flex gap-2.5 border-border/60 py-2 text-[12px] ${
              i !== events.length - 1 ? "border-b" : ""
            }`}
          >
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TONE_DOT[e.tone]}`} />
            <div className="min-w-0">
              <div className="truncate text-ink-dim">{e.message}</div>
              <div className="font-mono-num text-[10px] text-ink-dim/60">{e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
