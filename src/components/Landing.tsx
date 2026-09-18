import { ArrowRight, Cpu } from "lucide-react";

export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-base">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#8a93a6 1px, transparent 1px), linear-gradient(90deg, #8a93a6 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface/80 shadow-[0_0_40px_rgba(77,212,255,0.15)]">
          <Cpu className="h-8 w-8 text-cyan-400" strokeWidth={1.6} />
        </div>

        <h1 className="text-6xl font-semibold tracking-tight text-ink mb-3" style={{ letterSpacing: "-0.02em" }}>
          NEXUS
        </h1>
        <p className="text-lg text-ink-dim mb-1">Dynamic AI Workforce Decision Engine</p>
        <p className="max-w-md text-sm text-ink-dim/70 mb-10">
          Continuously optimizing people, tasks and priorities.
        </p>

        <button
          onClick={onEnter}
          className="group flex items-center gap-2 rounded-full bg-cyan-400 px-7 py-3.5 text-sm font-medium text-[#04141c] transition-all hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(77,212,255,0.4)]"
        >
          Enter live control center
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="mt-14 flex items-center gap-2 text-xs text-ink-dim/60">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          AI engine online &middot; 48 engineers &middot; 72 active tasks
        </div>
      </div>
    </div>
  );
}
