/**
 * PillarDiffGrid.tsx
 * Shows 5 pillars with winner/loser/tie pills (emerald/rose/cyan, white text).
 * Evidence links + hover dim behavior.
 * Mobile: stacked cards. Desktop: grid rows.
 */

import { scrollToAnchor } from "./compareAnchors";
import type { ComparisonResult, PillarKey } from "@/types/compare";

const PILLAR_LABELS: Record<PillarKey, string> = {
  safety: "Safety",
  scope: "Scope",
  price: "Price",
  fine_print: "Fine Print",
  warranty: "Warranty",
};

const PILLAR_ANCHORS: Record<PillarKey, string> = {
  safety: "#findings",
  scope: "#scope-permits",
  price: "#price-deposit",
  fine_print: "#fineprint-cancellation",
  warranty: "#warranty-labor",
};

const PILLAR_ORDER: PillarKey[] = ["safety", "scope", "price", "fine_print", "warranty"];

interface PillarDiffGridProps {
  comparison: ComparisonResult;
  idA: string;
  idB: string;
  labelA: string;
  labelB: string;
  onAnalyticsEvent?: (event: string, payload: Record<string, unknown>) => void;
}

function StatusPill({
  type,
  label,
}: {
  type: "winner" | "loser" | "tie";
  label: string;
}) {
  const classes =
    type === "winner"
      ? "bg-emerald-600 text-white"
      : type === "loser"
      ? "bg-rose-600 text-white"
      : "bg-cyan-600 text-white";

  const icon = type === "winner" ? "✓" : type === "loser" ? "!" : "≈";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 ${classes} whitespace-nowrap`}
    >
      {icon} {label}
    </span>
  );
}

export function PillarDiffGrid({
  comparison,
  idA,
  idB,
  labelA,
  labelB,
  onAnalyticsEvent,
}: PillarDiffGridProps) {
  const { pillardiff } = comparison;

  function handleEvidenceClick(pillarKey: PillarKey) {
    const anchor = PILLAR_ANCHORS[pillarKey];
    scrollToAnchor(anchor);
    onAnalyticsEvent?.("wm_compare_pillar_evidence_clicked", {
      pillarKey,
      anchor,
      idA,
      idB,
    });
  }

  return (
    <div className="rounded-xl bg-[#141B24] border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-slate-700 bg-slate-800/50">
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
          Pillar
        </span>
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
          {labelA}
        </span>
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
          {labelB}
        </span>
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
          Evidence
        </span>
      </div>

      {/* Rows */}
      {PILLAR_ORDER.map((key, i) => {
        const diff = pillardiff[key];
        const winnerIsA = diff.winnerId === idA;
        const winnerIsB = diff.winnerId === idB;
        const isTie = diff.winnerId === "tie";

        return (
          <div
            key={key}
            className={`group flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-800/30 transition-colors`}
          >
            {/* Pillar Name */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">
                {PILLAR_LABELS[key]}
              </span>
              {diff.severity === "flag" && (
                <span className="text-[9px] rounded px-1 py-0.5 bg-rose-900/50 text-rose-400 font-black uppercase tracking-wide">
                  Flag
                </span>
              )}
              {diff.severity === "warn" && (
                <span className="text-[9px] rounded px-1 py-0.5 bg-yellow-900/50 text-yellow-400 font-black uppercase tracking-wide">
                  Warn
                </span>
              )}
            </div>

            {/* Quote A */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill
                type={winnerIsA ? "winner" : isTie ? "tie" : "loser"}
                label={diff.labelA}
              />
            </div>

            {/* Quote B */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill
                type={winnerIsB ? "winner" : isTie ? "tie" : "loser"}
                label={diff.labelB}
              />
            </div>

            {/* Evidence Link */}
            <div className="flex items-center">
              <button
                onClick={() => handleEvidenceClick(key)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 whitespace-nowrap transition-colors"
              >
                Show Evidence
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
