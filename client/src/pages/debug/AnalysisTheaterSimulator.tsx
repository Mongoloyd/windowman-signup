/**
 * /debug/analysis-theater
 *
 * DEVELOPMENT-ONLY fixture-based simulator for the QuoteAnalysisTheater
 * and AnalysisReport components.
 *
 * SAFETY:
 * - Frontend-only, fixture-only, read-only.
 * - No backend calls. No DB writes. No cookie changes. No session changes.
 * - No analytics firing. No Twilio calls. No OTP calls. No lead status changes.
 * - Route is only registered when import.meta.env.DEV && VITE_ENABLE_ANALYSIS_SIM === "true".
 */

import React, { useState, useCallback, useMemo } from "react";
import { FIXTURES, getFixtureById, type FixtureEntry } from "@/debug/fixtures";
import QuoteAnalysisTheater from "@/components/analysis/QuoteAnalysisTheater";
import AnalysisReport from "@/pages/analysis-report";

type SimView = "theater" | "report" | "both";

function getInitialFixtureId(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("fixture");
  if (fromUrl && getFixtureById(fromUrl)) return fromUrl;
  return FIXTURES[0]?.id ?? "grade-a-clean";
}

export default function AnalysisTheaterSimulator() {
  const [activeFixtureId, setActiveFixtureId] = useState(getInitialFixtureId);
  const [view, setView] = useState<SimView>("both");
  const [theaterComplete, setTheaterComplete] = useState(false);

  const activeFixture: FixtureEntry | undefined = useMemo(
    () => getFixtureById(activeFixtureId),
    [activeFixtureId]
  );

  const handleFixtureChange = useCallback((id: string) => {
    setActiveFixtureId(id);
    setTheaterComplete(false);
    // Update URL without navigation for bookmarkability
    const url = new URL(window.location.href);
    url.searchParams.set("fixture", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleTheaterComplete = useCallback(() => {
    setTheaterComplete(true);
  }, []);

  // No-op handler for AnalysisReport's onBeatYourQuoteClick — prevents side effects
  const handleBeatYourQuoteClick = useCallback(() => {
    // Intentionally empty — simulator mode, no side effects
  }, []);

  if (!activeFixture) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">Fixture not found</p>
          <p className="text-sm text-slate-500 mt-2">
            Available: {FIXTURES.map((f) => f.id).join(", ")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── SIMULATOR BANNER ── */}
      <div className="sticky top-0 z-[100] bg-amber-400 border-b-2 border-amber-500 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-amber-900 text-amber-100 text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full uppercase">
              Simulator Mode
            </span>
            <span className="text-amber-900 text-xs font-bold">
              DEV ONLY — FIXTURE DATA
            </span>
          </div>
          <div className="text-amber-900 text-[10px] font-mono">
            {activeFixture.id} | {activeFixture.scored.finalGrade} | {activeFixture.scored.overallScore}/100
          </div>
        </div>
      </div>

      {/* ── CONTROL PANEL ── */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Fixture selector */}
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                Active Fixture
              </label>
              <div className="flex flex-wrap gap-2">
                {FIXTURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFixtureChange(f.id)}
                    className={
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all " +
                      (f.id === activeFixtureId
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50")
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">{activeFixture.description}</p>
            </div>

            {/* View toggle */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                View
              </label>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {(["theater", "report", "both"] as SimView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setView(v);
                      if (v === "theater" || v === "both") setTheaterComplete(false);
                    }}
                    className={
                      "px-3 py-1.5 rounded-md text-xs font-bold transition-all " +
                      (v === view
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700")
                    }
                  >
                    {v === "theater" ? "Theater" : v === "report" ? "Report" : "Both"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── THEATER VIEW ── */}
      {(view === "theater" || view === "both") && !theaterComplete && (
        <QuoteAnalysisTheater
          scanId={`sim-${activeFixture.id}`}
          scored={activeFixture.scored}
          onComplete={handleTheaterComplete}
        />
      )}

      {/* ── REPORT VIEW ── */}
      {(view === "report" || (view === "both" && theaterComplete) || (view === "theater" && theaterComplete)) && (
        <div className="max-w-6xl mx-auto">
          <AnalysisReport
            signals={activeFixture.signals}
            scored={activeFixture.scored}
            onBeatYourQuoteClick={handleBeatYourQuoteClick}
          />
        </div>
      )}

      {/* ── Theater complete indicator (both mode) ── */}
      {view === "both" && theaterComplete && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-emerald-700 text-xs font-bold">
              Theater animation complete — showing report below
            </span>
            <button
              onClick={() => setTheaterComplete(false)}
              className="ml-auto text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900"
            >
              Replay Theater
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
