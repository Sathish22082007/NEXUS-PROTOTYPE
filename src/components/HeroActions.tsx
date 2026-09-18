import { Plus, Zap } from "lucide-react";

export default function HeroActions({
  onSimulate,
  onCriticalTask,
}: {
  onSimulate: () => void;
  onCriticalTask: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.07] via-surface to-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-ink">Trigger a live event</div>
        <div className="text-xs text-ink-dim">Watch the engine detect, analyze, and reallocate in real time.</div>
      </div>
      <div className="flex flex-shrink-0 gap-2.5">
        <button
          onClick={onCriticalTask}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-amber-400/40 hover:text-amber-300"
        >
          <Plus className="h-3.5 w-3.5" />
          NEW CRITICAL TASK
        </button>
        <button
          onClick={onSimulate}
          className="pulse-ring flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-[#04141c] transition-all hover:bg-cyan-300"
        >
          <Zap className="h-3.5 w-3.5" />
          SIMULATE EVENT
        </button>
      </div>
    </div>
  );
}
