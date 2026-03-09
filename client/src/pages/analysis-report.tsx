import React from "react";
import type { ScoredResult } from "@shared/scoredTypes";
import { EvidenceReveal } from "@/components/analysis/EvidenceReveal";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ── Depth tokens (light mode) ── */
const SURFACE =
  "rounded-3xl bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15";

const SURFACE_INSET =
  "rounded-2xl bg-slate-50/80 backdrop-blur-md shadow-inner border border-slate-200/70";

/* ── Status pill (light mode: Rose / Amber / Emerald) ── */
function statusPillClass(status: "ok" | "warn" | "flag") {
  if (status === "flag")
    return "bg-rose-50 text-rose-800 border border-rose-200";
  if (status === "warn")
    return "bg-amber-50 text-amber-800 border border-amber-200";
  return "bg-emerald-50 text-emerald-800 border border-emerald-200";
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
  if (g.startsWith("A")) return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (g.startsWith("B")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (g.startsWith("C")) return "bg-amber-50 text-amber-800 border border-amber-200";
  if (g.startsWith("D")) return "bg-rose-50 text-rose-800 border border-rose-200";
  return "bg-rose-100 text-rose-900 border border-rose-300";
}

/* ── Grade text color ── */
function gradeTextColor(grade: string) {
  const g = grade?.toUpperCase() ?? "F";
  if (g.startsWith("A") || g.startsWith("B")) return "text-emerald-700";
  if (g.startsWith("C")) return "text-amber-700";
  return "text-rose-700";
}

/* ── Pillar config ── */
type PillarKey = "safety" | "scope" | "price" | "fine_print" | "warranty";
const PILLAR_META: Record<PillarKey, { label: string; icon: string; tooltip: string }> = {
  safety: {
    label: "Safety & Licensing",
    icon: "🛡️",
    tooltip: "Verifies contractor has proper licenses, insurance, and follows safety regulations to protect you from liability."
  },
  scope: {
    label: "Scope of Work",
    icon: "📋",
    tooltip: "Checks if the contract clearly specifies work details, materials, brands, model numbers, and responsibilities to prevent disputes."
  },
  price: {
    label: "Price Fairness",
    icon: "💰",
    tooltip: "Analyzes pricing against market rates to identify potential overcharges or unreasonable payment terms."
  },
  fine_print: {
    label: "Fine Print",
    icon: "🔍",
    tooltip: "Reviews contract clauses for hidden fees, cancellation penalties, arbitration requirements, and other traps."
  },
  warranty: {
    label: "Warranty",
    icon: "📜",
    tooltip: "Evaluates warranty coverage, duration, exclusions, and transferability to ensure you're protected long-term."
  },
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

/* ── Track bar (light mode) ── */
function TrackBar({ pct, color }: { pct: number; color?: string }) {
  const w = clamp(pct);
  const barColor = color ?? "bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]";
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-300/60">
      <div className={"h-full rounded-full " + barColor} style={{ width: `${w}%` }} />
    </div>
  );
}

function barColorForStatus(status: "ok" | "warn" | "flag") {
  if (status === "flag") return "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.2)]";
  if (status === "warn") return "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]";
  return "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]";
}

/* Forensic masking: derive pillar severity from ScoredItem[] */
function getPillarSeverity(
  warnings: any[],
  missingItems: any[],
  pillarKey: PillarKey
): "critical" | "warning" | "ok" {
  const pillarWarnings = warnings.filter((w) => w.pillar === pillarKey);
  const pillarMissing = missingItems.filter((m) => m.pillar === pillarKey);
  const allItems = [...pillarWarnings, ...pillarMissing];

  if (allItems.some((item) => item.severity === "critical")) {
    return "critical";
  }
  if (allItems.some((item) => item.severity === "warning")) {
    return "warning";
  }
  return "ok";
}

/* Forensic label: replace score with qualitative label */
function getForensicLabel(
  severity: "critical" | "warning" | "ok",
  warnings: any[],
  missingItems: any[],
  pillarKey: PillarKey
): string {
  const pillarWarnings = warnings.filter((w) => w.pillar === pillarKey);
  const pillarMissing = missingItems.filter((m) => m.pillar === pillarKey);
  const criticalCount = [...pillarWarnings, ...pillarMissing].filter(
    (item) => item.severity === "critical"
  ).length;
  const warningCount = [...pillarWarnings, ...pillarMissing].filter(
    (item) => item.severity === "warning"
  ).length;

  if (severity === "critical") {
    return `${criticalCount} Critical${criticalCount !== 1 ? "s" : ""}`;
  }
  if (severity === "warning") {
    return `${warningCount} Warning${warningCount !== 1 ? "s" : ""}`;
  }
  return "Verified Safe";
}

/* ── Main component ── */
interface AnalysisReportProps {
  signals?: Record<string, unknown>;
  scored?: ScoredResult;
  onBeatYourQuoteClick?: () => void;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ signals, scored, onBeatYourQuoteClick }) => {
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
    <div className="min-h-screen pb-20">
      {/* ── Sticky header ── */}
      <div
        className={
          "sticky top-0 z-10 rounded-none border-x-0 border-t-0 p-6 bg-white/90 backdrop-blur-xl border-b border-cyan-500/15 shadow-sm"
        }
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
            Forensic Analysis
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-500 uppercase">Grade:</span>
            <span
              className={
                gradeColor(grade) +
                " font-black px-4 py-1.5 rounded-lg leading-none text-lg"
              }
            >
              {grade}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        {/* ── Overall score card ── */}
        <div
          className={
            SURFACE +
            " p-6 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.04),transparent_55%)]"
          }
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.22em] text-cyan-700 uppercase">
                Overall Score
              </div>
              <div className="mt-2 text-5xl font-black text-slate-900">
                {Math.round(overall)}
              </div>
              <div className="mt-1 text-sm text-slate-500">out of 100</div>
            </div>
            <div className={SURFACE_INSET + " px-6 py-4 text-center"}>
              <div className="text-xs font-bold text-slate-500">GRADE</div>
              <div className={"mt-2 text-3xl font-black " + gradeTextColor(grade)}>
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
          <div className={SURFACE + " p-4 overflow-x-auto"}>
            <p className="text-[10px] font-bold text-amber-700 uppercase mb-3 tracking-widest">
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
          <p className="text-xs font-black tracking-[0.22em] text-slate-500 uppercase mb-5">
            5-Pillar Breakdown
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(PILLAR_META) as PillarKey[]).map((key) => {
              const meta = PILLAR_META[key];
              const status = (pillarStatuses[key] ?? "warn") as "ok" | "warn" | "flag";
              const score = pillarScores[key];
              const forensicSeverity = getPillarSeverity(scored?.warnings ?? [], scored?.missingItems ?? [], key);
              const forensicLabel = getForensicLabel(forensicSeverity, scored?.warnings ?? [], scored?.missingItems ?? [], key);
              const shouldMaskScore = forensicSeverity !== "ok";
              return (
                <div key={key} className={SURFACE_INSET + " p-4"}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-sm font-black text-slate-900">{meta.label}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">{meta.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <StatusPill status={status} label={status.toUpperCase()} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <TrackBar pct={score} color={barColorForStatus(status)} />
                    </div>
                    {shouldMaskScore ? (
                      <EvidenceReveal
                        pillarKey={key}
                        pillarLabel={meta.label}
                        forensicLabel={forensicLabel}
                        warnings={scored?.warnings ?? []}
                        missingItems={scored?.missingItems ?? []}
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-600 w-8 text-right">
                        {score}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Financial exposure ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={SURFACE + " p-6"}>
            <h3 className="text-sm font-black uppercase text-slate-500 mb-4">
              Estimated Exposure
            </h3>
            <div className="space-y-4">
              {overcharge ? (
                <>
                  <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                    <span className="text-sm font-bold text-slate-700">Overcharge Range</span>
                    <span className="text-lg font-black text-rose-700">
                      ${overcharge.low?.toLocaleString() ?? "?"} – $
                      {overcharge.high?.toLocaleString() ?? "?"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-sm font-bold text-slate-700">Overcharge Risk</span>
                  <span className="text-lg font-black text-amber-700">See pillar details</span>
                </div>
              )}
              {pillarStatuses.fine_print === "flag" && (
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-sm font-bold text-slate-700">Fine Print Risk</span>
                  <StatusPill status="flag" label="HIGH" />
                </div>
              )}
              {pillarStatuses.warranty === "flag" && (
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-sm font-bold text-slate-700">Warranty Risk</span>
                  <StatusPill status="flag" label="HIGH" />
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div
            className={
              SURFACE +
              " p-6 flex flex-col justify-center text-center bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.04),transparent_70%)]"
            }
          >
            <button
              onClick={onBeatYourQuoteClick}
              disabled={!onBeatYourQuoteClick}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-black py-4 rounded-xl shadow-[0_10px_30px_rgba(6,182,212,0.25)] hover:shadow-[0_14px_40px_rgba(6,182,212,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Beat-Your-Quote Check (Free)
            </button>
            <p className="mt-3 text-[11px] font-bold text-amber-700 leading-tight">
              Most homeowners save $1,200–$4,800 by fixing scope + payment terms before signing.
            </p>
          </div>
        </div>

        {/* ── Hard cap (if applied) ── */}
        {scored?.hardCap?.applied && (
          <div className={SURFACE + " p-6 border-rose-300"}>
            <p className="text-xs font-black tracking-[0.22em] text-rose-700 uppercase mb-4">
              Critical Violation
            </p>
            <div className={SURFACE_INSET + " p-4 border-rose-200"}>
              <div className="flex items-start gap-3">
                <StatusPill status="flag" label="HARD CAP" />
                <div>
                  <p className="text-sm text-slate-700">{scored.hardCap.reason}</p>
                  {scored.hardCap.statute && (
                    <p className="text-xs text-slate-500 mt-1">
                      Statute: {scored.hardCap.statute}
                    </p>
                  )}
                  {scored.hardCap.ceiling !== null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Score ceiling: {scored.hardCap.ceiling}
                    </p>
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
