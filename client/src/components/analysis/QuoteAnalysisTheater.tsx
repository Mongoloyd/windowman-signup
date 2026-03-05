import React, { useEffect, useMemo, useState } from "react";
import type { ScoredResult } from "@shared/scoredTypes";
import { riskCopy, type RiskLevel } from "./theaterCopy";

type PillarKey = "Safety" | "Scope" | "Price" | "Fine Print" | "Warranty";

type Props = {
  scanId: string;
  scored: ScoredResult;
  onComplete: () => void;
};

const SURFACE =
  "rounded-3xl bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15";

const SURFACE_INSET =
  "rounded-2xl bg-slate-50/80 backdrop-blur-md shadow-inner border border-slate-200/70";

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function computeRisk(score: number): RiskLevel {
  if (score < 60) return "Critical";
  if (score < 80) return "Moderate";
  return "Acceptable";
}

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

function TrackBar({ pct }: { pct: number }) {
  const w = clamp(pct);
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-300/60">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export default function QuoteAnalysisTheater({ scanId, scored, onComplete }: Props) {
  const overall = useMemo(() => clamp(scored.overallScore ?? 0), [scored.overallScore]);
  const risk = useMemo(() => computeRisk(overall), [overall]);
  const copy = useMemo(() => riskCopy(risk), [risk]);

  const pillars = useMemo(() => {
    const items: Array<{ key: PillarKey; score: number; status: "ok" | "warn" | "flag" }> = [
      { key: "Safety", score: clamp(scored.safetyScore ?? 0), status: scored.pillarStatuses?.safety ?? "warn" },
      { key: "Scope", score: clamp(scored.scopeScore ?? 0), status: scored.pillarStatuses?.scope ?? "warn" },
      { key: "Price", score: clamp(scored.priceScore ?? 0), status: scored.pillarStatuses?.price ?? "warn" },
      { key: "Fine Print", score: clamp(scored.finePrintScore ?? 0), status: scored.pillarStatuses?.fine_print ?? "warn" },
      { key: "Warranty", score: clamp(scored.warrantyScore ?? 0), status: scored.pillarStatuses?.warranty ?? "warn" },
    ];
    return items;
  }, [scored]);

  const [phase, setPhase] = useState<"intro" | "pillars" | "cta">("intro");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("pillars"), 650);
    const t2 = window.setTimeout(() => setPhase("cta"), 1750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [scanId]);

  useEffect(() => {
    if (phase !== "cta") return;
    const t = window.setTimeout(() => onComplete(), 1600);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop — light frosted overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <div className="relative mx-auto flex h-full max-w-5xl items-center justify-center px-4">
        <div
          className={
            SURFACE +
            " w-full p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.04),transparent_50%)]"
          }
        >
          <div className="flex flex-col gap-6">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black tracking-[0.22em] text-cyan-700">
                  {copy.kicker}
                </div>
                <h1 className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                  {copy.headline}
                </h1>
                <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-700">
                  {copy.subhead}
                </p>
              </div>

              {/* Overall score card */}
              <div className={SURFACE_INSET + " px-5 py-4 text-center"}>
                <div className="text-xs font-bold text-slate-500">OVERALL</div>
                <div className="mt-1 text-4xl font-black text-slate-900">
                  {Math.round(overall / 5) * 5}
                </div>
                <div className="mt-1 text-sm font-extrabold text-cyan-700">
                  {scored.finalGrade ?? "—"}
                </div>
                <div className="mt-3">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-black " +
                      (risk === "Critical"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : risk === "Moderate"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200")
                    }
                  >
                    {risk.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Meter */}
            <div className={SURFACE_INSET + " p-5 md:p-6"}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Risk Meter</div>
              </div>
              <div className="mt-3">
                <TrackBar pct={overall} />
              </div>
            </div>

            {/* Pillar grid */}
            <div className={SURFACE_INSET + " p-5 md:p-6"}>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {pillars.map((p) => (
                  <div
                    key={p.key}
                    className="rounded-xl border border-cyan-500/15 bg-white/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-900">{p.key}</div>
                      <StatusPill status={p.status} label={p.status.toUpperCase()} />
                    </div>
                    <div className="mt-3">
                      <TrackBar pct={phase === "intro" ? 0 : p.score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Scan ID: <span className="font-mono">{scanId}</span>
              </div>
              <button
                onClick={onComplete}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 transition-colors"
              >
                Skip to Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
