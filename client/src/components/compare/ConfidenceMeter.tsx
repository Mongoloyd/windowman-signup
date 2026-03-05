/**
 * ConfidenceMeter.tsx
 * Displays audit accuracy with tooltip.
 * Used in the sticky CompareVerdictBanner.
 */

import { formatConfidence, confidenceLabel } from "@/lib/formatters";

interface ConfidenceMeterProps {
  confidence: number; // 0..1
}

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const pct = Math.round(confidence * 100);
  const label = confidenceLabel(confidence);
  const barColor =
    confidence >= 0.9
      ? "bg-emerald-500"
      : confidence >= 0.7
      ? "bg-yellow-500"
      : "bg-rose-500";

  return (
    <div className="flex flex-col items-end gap-1 min-w-[120px]" title={`Audit accuracy: ${label} (${formatConfidence(confidence)}). Based on document clarity and extraction confidence.`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">
          Audit Accuracy
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-black text-slate-900 tabular-nums">
          {label} ({formatConfidence(confidence)})
        </span>
      </div>
    </div>
  );
}
