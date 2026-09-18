import { Cpu, RotateCcw } from "lucide-react";

export default function Header({ onReset }: { onReset: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface">
            <Cpu className="h-4.5 w-4.5 text-cyan-400" strokeWidth={1.8} />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-ink">NEXUS</span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span className="hidden text-xs text-ink-dim sm:block">AI Workforce Decision Engine</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 md:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-emerald-300">AI ENGINE ONLINE</span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-medium text-cyan-300">LIVE OPTIMIZATION</span>
          </div>

          <span className="hidden h-3 w-px bg-border sm:block" />

          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300">
            DEMO MODE
          </span>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-ink-dim transition-colors hover:border-rose-500/40 hover:text-rose-300"
          >
            <RotateCcw className="h-3 w-3" />
            RESET SIMULATION
          </button>
        </div>
      </div>
    </header>
  );
}
