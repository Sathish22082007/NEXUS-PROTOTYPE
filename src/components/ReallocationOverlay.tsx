import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import type { DecisionStats, Engineer, OverlayState } from "../types";
import { avatarColor, initials } from "../ui";

const STEPS = ["DETECT", "ANALYZE", "OPTIMIZE", "REALLOCATE"];

function stepIndex(phase: OverlayState["phase"]) {
  if (phase === "detect") return 0;
  if (phase === "optimize") return 2;
  return 3;
}

function CountUp({ target, duration = 900 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span className="font-mono-num">{value}</span>;
}

function ImpactDelta({ before, after, label, lowerIsBetter = true }: { before: number; after: number; label: string; lowerIsBetter?: boolean }) {
  const delta = after - before;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const neutral = delta === 0;
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] text-ink-dim mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono-num text-sm text-ink">{before}</span>
        <ArrowRight className="h-3 w-3 text-ink-dim/50" />
        <span className="font-mono-num text-sm text-ink">{after}</span>
        {!neutral && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${improved ? "text-emerald-400" : "text-rose-400"}`}>
            {improved ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
        {neutral && (
          <span className="flex items-center gap-0.5 text-[10px] text-ink-dim">
            <Minus className="h-3 w-3" /> 0
          </span>
        )}
      </div>
    </div>
  );
}

export default function ReallocationOverlay({
  overlay,
  engineerMap,
  previewStats,
  onClose,
}: {
  overlay: OverlayState;
  engineerMap: Map<string, Engineer>;
  previewStats: DecisionStats;
  onClose: () => void;
}) {
  if (overlay.kind === "quick") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="animate-fade-in-up relative flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-7 text-center shadow-2xl">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          <div className="text-sm font-semibold text-ink">{overlay.headline}</div>
          <div className="text-xs text-ink-dim">{overlay.subline}</div>
        </div>
      </div>
    );
  }

  const active = stepIndex(overlay.phase);
  const primary = overlay.reallocations[0];
  const extra = overlay.reallocations.length - 1;
  const impact = overlay.impact;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="animate-fade-in-up relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* pipeline stepper */}
        <div className="flex items-center gap-1.5 border-b border-border px-5 py-3.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1.5">
              <span
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                  i <= active ? (i === active && overlay.phase !== "complete" ? "bg-cyan-400 animate-pulse" : "bg-cyan-400") : "bg-border"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between px-5 pt-2 text-[10px] tracking-wide text-ink-dim">
          {STEPS.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>

        <div className="p-6">
          {overlay.phase === "detect" && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle className="h-7 w-7 text-rose-400" />
              </div>
              <div className="mb-1.5 text-lg font-semibold text-ink">{overlay.headline}</div>
              <div className="mb-5 text-sm text-ink-dim">{overlay.subline}</div>
              {overlay.affectedTaskIds.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {overlay.affectedTaskIds.map((id) => (
                    <span
                      key={id}
                      className="animate-flash-border rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono-num text-[11px] text-rose-300"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {overlay.phase === "optimize" && (
            <div className="flex flex-col items-center py-4 text-center">
              <Loader2 className="mb-4 h-9 w-9 animate-spin text-cyan-400" />
              <div className="mb-1 text-lg font-semibold tracking-wide text-ink">AI RE-OPTIMIZING&hellip;</div>
              <div className="mb-5 text-xs text-ink-dim">Evaluating candidates against skill, load & SLA constraints</div>
              <div className="grid w-full grid-cols-2 gap-2.5">
                <StatBox label="Candidates evaluated" value={previewStats.candidatesEvaluated} />
                <StatBox label="Constraints checked" value={previewStats.constraintsChecked} />
                <StatBox label="SLA risks" value={previewStats.slaRisks} />
                <StatBox label="Decision time" value={previewStats.decisionSeconds} suffix="s" />
              </div>
            </div>
          )}

          {overlay.phase === "complete" && primary && (
            <div>
              <div className="mb-4 flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="text-lg font-semibold text-ink">REALLOCATION COMPLETE</div>
                {extra > 0 && <div className="text-xs text-ink-dim">+{extra} more task{extra > 1 ? "s" : ""} rebalanced</div>}
              </div>

              <div className="mb-4 space-y-2">
                {overlay.reallocations.slice(0, 3).map((r) => {
                  const before = r.beforeEngineerId ? engineerMap.get(r.beforeEngineerId) : null;
                  const after = engineerMap.get(r.afterEngineerId)!;
                  return (
                    <div key={r.taskId} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 py-2.5">
                      <span className="font-mono-num text-[11.5px] font-medium text-ink">{r.taskId}</span>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-ink-dim">{before ? before.name.split(" ")[0] : "Unassigned"}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="font-medium text-emerald-300">{after.name.split(" ")[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {impact && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim">Impact Analysis</div>
                  <div className="grid grid-cols-2 gap-2">
                    <ImpactDelta before={impact.sla_risk_before} after={impact.sla_risk_after} label="SLA Risk Tasks" />
                    <ImpactDelta before={impact.overloaded_before} after={impact.overloaded_after} label="Overloaded Engineers" />
                    <ImpactDelta before={impact.utilization_before} after={impact.utilization_after} label="Avg Utilization %" lowerIsBetter={false} />
                    <ImpactDelta before={impact.assignments_changed} after={0} label="Assignments Changed" lowerIsBetter={false} />
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4">
                {overlay.explanations && overlay.explanations.length > 0 ? (
                  overlay.explanations.slice(0, 2).map((exp) => (
                    <div key={exp.task_id + exp.employee_id} className="mb-3 last:mb-0">
                      <div className="mb-2.5 flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-[#04141c]"
                          style={{ backgroundColor: avatarColor(exp.employee_id) }}
                        >
                          {initials(exp.employee_name)}
                        </span>
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                          Why {exp.employee_name.split(" ")[0]} for {exp.task_id}?
                        </div>
                      </div>
                      <div className="mb-2 text-[11px] text-ink-dim leading-relaxed">{exp.human_readable}</div>
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        <div className="rounded-lg bg-surface-2 px-2 py-1.5 text-center">
                          <div className="font-mono-num text-[11px] font-semibold text-cyan-300">{(exp.prediction_score * 100).toFixed(0)}%</div>
                          <div className="text-[9px] text-ink-dim">ML Score</div>
                        </div>
                        <div className="rounded-lg bg-surface-2 px-2 py-1.5 text-center">
                          <div className="font-mono-num text-[11px] font-semibold text-emerald-300">{(exp.skill_match * 100).toFixed(0)}%</div>
                          <div className="text-[9px] text-ink-dim">Skill Match</div>
                        </div>
                        <div className="rounded-lg bg-surface-2 px-2 py-1.5 text-center">
                          <div className="font-mono-num text-[11px] font-semibold text-amber-300">{exp.available_capacity.toFixed(0)}%</div>
                          <div className="text-[9px] text-ink-dim">Capacity</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {exp.reason_codes.slice(0, 4).map((code) => (
                          <span key={code} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-ink-dim">{code.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <div className="mb-2.5 flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-[#04141c]"
                        style={{ backgroundColor: avatarColor(primary.afterEngineerId) }}
                      >
                        {initials(engineerMap.get(primary.afterEngineerId)!.name)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        Why {engineerMap.get(primary.afterEngineerId)!.name.split(" ")[0]}?
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {primary.reasons.map((r) => (
                        <div key={r} className="flex items-center gap-1.5 text-[11.5px] text-ink-dim">
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-cyan-400 py-2.5 text-[13px] font-semibold text-[#04141c] transition-colors hover:bg-cyan-300"
              >
                View updated dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left">
      <div className="text-lg font-semibold text-ink">
        <CountUp target={value} />
        {suffix}
      </div>
      <div className="text-[10px] text-ink-dim">{label}</div>
    </div>
  );
}
