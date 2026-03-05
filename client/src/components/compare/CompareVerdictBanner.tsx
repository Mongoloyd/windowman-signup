/**
 * CompareVerdictBanner.tsx
 * Sticky banner at the top of the compare view.
 * Shows winner verdict, sub-copy, and ConfidenceMeter.
 * Cyan glow shadow, sticky top-0 z-40.
 */

import { ConfidenceMeter } from "./ConfidenceMeter";
import { formatCurrency } from "@/lib/formatters";
import type { ComparisonResult } from "@/types/compare";

interface CompareVerdictBannerProps {
  comparison: ComparisonResult;
  labelA: string;
  labelB: string;
}

function buildSubCopy(
  comparison: ComparisonResult,
  labelA: string,
  labelB: string
): string | null {
  const { winnerId, verdictLevel } = comparison.meta;
  const { effectiveDelta } = comparison.pricing;

  if (verdictLevel === "Disqualified" && winnerId === "tie") {
    return "Do not sign until these issues are corrected in writing.";
  }

  if (verdictLevel === "Statistical Tie") {
    return "Choose based on schedule, aesthetics, or warranty preference.";
  }

  if (winnerId === "tie") return null;

  const winnerLabel = winnerId === comparison.meta.winnerId
    ? winnerId.includes("-") // UUID check
      ? labelA // fallback
      : labelA
    : labelB;

  // Determine which label is the winner
  const isAWinner = winnerId !== "tie";

  if (effectiveDelta !== null && Math.abs(effectiveDelta) > 0) {
    const savings = Math.abs(effectiveDelta);
    const loserLabel = isAWinner ? labelB : labelA;
    return `Reduces hidden liability by ~${formatCurrency(savings)} vs ${loserLabel}`;
  }

  return null;
}

export function CompareVerdictBanner({
  comparison,
  labelA,
  labelB,
}: CompareVerdictBannerProps) {
  const { winnerId, verdictTitle, verdictLevel, confidence } = comparison.meta;
  const { effectiveDelta } = comparison.pricing;

  const isBothDisqualified = verdictLevel === "Disqualified" && winnerId === "tie";
  const isTie = verdictLevel === "Statistical Tie" || winnerId === "tie";

  // Determine banner accent color
  const bannerBg = isBothDisqualified
    ? "border-rose-500/40 shadow-[0_0_24px_rgba(239,68,68,0.15)]"
    : isTie
    ? "border-cyan-500/40 shadow-[0_0_24px_rgba(6,182,212,0.15)]"
    : "border-cyan-500/40 shadow-[0_0_24px_rgba(6,182,212,0.2)]";

  // Sub copy
  const subCopy = buildSubCopy(comparison, labelA, labelB);

  // Winner badge
  const winnerLabel =
    winnerId === "tie"
      ? null
      : comparison.meta.deltaScore > 0
      ? labelA
      : labelB;

  return (
    <div
      className={`sticky top-0 z-40 w-full bg-[#0F1419]/95 backdrop-blur-sm border-b ${bannerBg} px-4 py-3`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Verdict */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {winnerLabel && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 bg-emerald-600 text-white">
                ✓ {winnerLabel}
              </span>
            )}
            {isBothDisqualified && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 bg-rose-600 text-white">
                ! Critical Failures
              </span>
            )}
            {isTie && !isBothDisqualified && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 bg-cyan-600 text-white">
                ≈ Statistical Tie
              </span>
            )}
            <h2 className="text-base font-black text-white leading-tight">
              {verdictTitle}
            </h2>
          </div>
          {subCopy && (
            <p className="text-xs text-slate-400 mt-0.5">{subCopy}</p>
          )}
        </div>

        {/* Right: Confidence Meter */}
        <ConfidenceMeter confidence={confidence} />
      </div>
    </div>
  );
}
