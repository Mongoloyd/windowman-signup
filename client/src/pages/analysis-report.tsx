import React from "react";
import type { ScoredResult } from "@shared/scoredTypes";

/* ── Depth tokens (shared with QuoteAnalysisTheater) ── */
const SURFACE =
  "rounded-2xl border bg-white shadow-[0_10px_30px_rgba(2,6,23,0.08)] border-slate-200/70 " +
  "dark:bg-slate-950/55 dark:border-white/10 dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)]";

const SURFACE_INSET =
  "rounded-2xl border bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] border-slate-200/70 " +
  "dark:bg-slate-950/35 dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

/* ── Status pill (Rose / Amber / Emerald) ── */
function statusPillClass(status: "ok" | "warn" | "flag") {
  if (status === "flag")
    return "bg-rose-600 text-rose-50 border border-rose-300/40 shadow-[0_8px_22px_rgba(244,63,94,0.22)]";
  if (status === "warn")
    return "bg-amber-500 text-amber-950 border border-amber-300/50 shadow-[0_8px_22px_rgba(245,158,11,0.20)]";
  return "bg-emerald-500 text-emerald-50 border border-emerald-300/40 shadow-[0_8px_22px_rgba(16,185,129,0.18)]";
}

function StatusPill({ status, label }: { status: "ok" | "warn" | "flag"; label: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold tracking-wide " +
        statusPillClass(status)
      }
    >
      {label}
    </span>
  );
}

/* ── Grade badge ── */
function gradeColor(grade: string) {
  const g = grade?.toUpperCase() ?? "F";
  if (g.startsWith("A")) return "bg-emerald-600 text-white";
  if (g.startsWith("B")) return "bg-emerald-500 text-white";
  if (g.startsWith("C")) return "bg-amber-500 text-amber-950";
  if (g.startsWith("D")) return "bg-rose-500 text-white";
  return "bg-rose-700 text-white";
}

/* ── Pillar config ── */
type PillarKey = "safety" | "scope" | "price" | "fine_print" | "warranty";
const PILLAR_META: Record<PillarKey, { label: string; icon: string }> = {
  safety: { label: "Safety & Licensing", icon: "🛡️" },
  scope: { label: "Scope of Work", icon: "📋" },
  price: { label: "Price Fairness", icon: "💰" },
  fine_print: { label: "Fine Print", icon: "🔍" },
  warranty: { label: "Warranty", icon: "📜" },
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

/* ── Track bar ── */
function TrackBar({ pct, color }: { pct: number; color?: string }) {
  const w = clamp(pct);
  const barColor = color ?? "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.35)]";
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden border border-slate-300/60 dark:border-white/10">
      <div className={"h-full rounded-full " + barColor} style={{ width: `${w}%` }} />
    </div>
  );
}

function barColorForStatus(status: "ok" | "warn" | "flag") {
  if (status === "flag") return "bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.3)]";
  if (status === "warn") return "bg-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.3)]";
  return "bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.3)]";
}

/* ── Main component ── */
interface AnalysisReportProps {
  signals?: Record<string, unknown>;
  scored?: ScoredResult;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ signals, scored }) => {
  const grade = scored?.finalGrade ?? "?";
  const overall = clamp(scored?.overallScore ?? 0);

  const pillarStatuses = scored?.pillarStatuses ?? ({} as Record<string, "ok" | "warn" | "flag">);
  const pillarScores: Record<PillarKey, number> = {
    safety: clamp(scored?.safetyScore ?? 0),
    scope: clamp(scored?.scopeScore ?? 0),
    price: clamp(scored?.priceScore ?? 0),
    fine_print: clamp(scored?.finePrintScore ?? 0),
    warranty: clamp(scored?.warrantyScore ?? 0),
  };

  /* Extract risk flags from signals if available */
  const riskFlags: string[] = [];
  if (signals) {
    const flagKeys = [
      { key: "depositRisk", label: "Deposit Risk" },
      { key: "cancellationTrap", label: "Cancellation Trap" },
      { key: "arbitrationClause", label: "Arbitration Clause" },
      { key: "permitGap", label: "Permit Gap" },
      { key: "insuranceGap", label: "Insurance Gap" },
      { key: "changeOrderRisk", label: "Change-Order Risk" },
      { key: "warrantyVoid", label: "Warranty Void Risk" },
      { key: "materialSubstitution", label: "Material Substitution" },
    ];
    for (const { key, label } of flagKeys) {
      if ((signals as any)[key]) riskFlags.push(label);
    }
  }
  // Fallback: derive from pillar statuses
  if (riskFlags.length === 0) {
    for (const [key, status] of Object.entries(pillarStatuses)) {
      if (status === "flag") {
        const meta = PILLAR_META[key as PillarKey];
        if (meta) riskFlags.push(meta.label);
      }
    }
  }

  /* Extract overcharge estimate from scored */
  const overcharge = scored?.overchargeEstimate;

  return (
    <div className="min-h-screen bg-[#0F1419] pb-20">
      {/* ── Sticky header ── */}
      <div className={SURFACE + " sticky top-0 z-10 rounded-none border-x-0 border-t-0 p-6 bg-[#0F1419] dark:bg-[#0F1419]"}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-white uppercase tracking-tight italic">
            Forensic Analysis
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-400 uppercase">Grade:</span>
            <span
              className={
                gradeColor(grade) +
                " font-black px-4 py-1.5 rounded shadow-lg transform -rotate-2 leading-none text-lg"
              }
            >
              {grade}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        {/* ── Overall score card ── */}
        <div className={SURFACE + " p-6 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.08),transparent_55%)]"}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.22em] text-cyan-400/80 uppercase">
                Overall Score
              </div>
              <div className="mt-2 text-5xl font-black text-white">{Math.round(overall)}</div>
              <div className="mt-1 text-sm text-slate-400">out of 100</div>
            </div>
            <div className={SURFACE_INSET + " px-6 py-4 text-center"}>
              <div className="text-xs font-bold text-slate-400">GRADE</div>
              <div className={"mt-2 text-3xl font-black " + (grade.startsWith("A") || grade.startsWith("B") ? "text-emerald-400" : grade.startsWith("C") ? "text-amber-400" : "text-rose-400")}>
                {grade}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <TrackBar pct={overall} />
          </div>
        </div>

        {/* ── Immediate risks strip ── */}
        {riskFlags.length > 0 && (
          <div className={SURFACE + " p-4 overflow-x-auto bg-slate-900"}>
            <p className="text-[10px] font-bold text-amber-500 uppercase mb-3 tracking-widest">
              Immediate Risks Detected:
            </p>
            <div className="flex gap-3 whitespace-nowrap">
              {riskFlags.map((tag) => (
                <StatusPill key={tag} status="flag" label={tag} />
              ))}
            </div>
          </div>
        )}

        {/* ── 5-Pillar breakdown ── */}
        <div className={SURFACE + " p-6"}>
          <p className="text-xs font-black tracking-[0.22em] text-slate-400 uppercase mb-5">
            5-Pillar Breakdown
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(PILLAR_META) as PillarKey[]).map((key) => {
              const meta = PILLAR_META[key];
              const status = (pillarStatuses[key] ?? "warn") as "ok" | "warn" | "flag";
              const score = pillarScores[key];
              return (
                <div key={key} className={SURFACE_INSET + " p-4"}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-sm font-black text-white">{meta.label}</span>
                    </div>
                    <StatusPill status={status} label={status.toUpperCase()} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <TrackBar pct={score} color={barColorForStatus(status)} />
                    </div>
                    <span className="text-sm font-bold text-slate-300 w-8 text-right">{score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Financial exposure ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={SURFACE + " p-6"}>
            <h3 className="text-sm font-black uppercase text-slate-400 mb-4">Estimated Exposure</h3>
            <div className="space-y-4">
              {overcharge ? (
                <>
                  <div className="flex justify-between items-end border-b border-white/6 pb-2">
                    <span className="text-sm font-bold text-slate-300">Overcharge Range</span>
                    <span className="text-lg font-black text-rose-400">
                      ${overcharge.low?.toLocaleString() ?? "?"} – ${overcharge.high?.toLocaleString() ?? "?"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-end border-b border-white/6 pb-2">
                  <span className="text-sm font-bold text-slate-300">Overcharge Risk</span>
                  <span className="text-lg font-black text-amber-400">See pillar details</span>
                </div>
              )}
              {pillarStatuses.fine_print === "flag" && (
                <div className="flex justify-between items-end border-b border-white/6 pb-2">
                  <span className="text-sm font-bold text-slate-300">Fine Print Risk</span>
                  <StatusPill status="flag" label="HIGH" />
                </div>
              )}
              {pillarStatuses.warranty === "flag" && (
                <div className="flex justify-between items-end border-b border-white/6 pb-2">
                  <span className="text-sm font-bold text-slate-300">Warranty Risk</span>
                  <StatusPill status="flag" label="HIGH" />
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className={SURFACE + " p-6 flex flex-col justify-center text-center bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)]"}>
            <button className="bg-white text-slate-900 font-black py-4 rounded-xl shadow-2xl hover:scale-105 transition-transform">
              Beat-Your-Quote Check (Free)
            </button>
            <p className="mt-3 text-[11px] font-bold text-amber-400 leading-tight">
              Most homeowners save $1,200–$4,800 by fixing scope + payment terms before signing.
            </p>
          </div>
        </div>

        {/* ── Hard cap (if applied) ── */}
        {scored?.hardCap?.applied && (
          <div className={SURFACE + " p-6 border-rose-500/30"}>
            <p className="text-xs font-black tracking-[0.22em] text-rose-400 uppercase mb-4">
              Critical Violation
            </p>
            <div className={SURFACE_INSET + " p-4 border-rose-500/20"}>
              <div className="flex items-start gap-3">
                <StatusPill status="flag" label="HARD CAP" />
                <div>
                  <p className="text-sm text-slate-300">{scored.hardCap.reason}</p>
                  {scored.hardCap.statute && (
                    <p className="text-xs text-slate-500 mt-1">Statute: {scored.hardCap.statute}</p>
                  )}
                  {scored.hardCap.ceiling !== null && (
                    <p className="text-xs text-slate-500 mt-1">Score ceiling: {scored.hardCap.ceiling}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalysisReport;
