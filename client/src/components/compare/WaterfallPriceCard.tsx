/**
 * WaterfallPriceCard.tsx
 * Real-cost price bridge: Sticker → Liabilities → TRUE REAL COST
 * Ring highlight for winner/loser.
 * If base missing: show liabilities but suppress "cheaper/more expensive" claims.
 */

import { formatCurrency } from "@/lib/formatters";
import type { Liability } from "@/types/compare";

interface WaterfallPriceCardProps {
  label: string;
  base: number | null;
  adjusted: number | null;
  liabilities: Liability[];
  isWinner: boolean;
  isLoser: boolean;
  isTie: boolean;
}

export function WaterfallPriceCard({
  label,
  base,
  adjusted,
  liabilities,
  isWinner,
  isLoser,
  isTie,
}: WaterfallPriceCardProps) {
  const totalLiability = liabilities.reduce((sum, l) => sum + l.cost, 0);

  const ringClass = isWinner
    ? "ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
    : isLoser
    ? "ring-2 ring-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
    : "ring-1 ring-slate-700";

  const statusPill = isWinner ? (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 bg-emerald-600 text-white">
      ✓ Safer Investment
    </span>
  ) : isLoser ? (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 bg-rose-600 text-white">
      ! Higher Risk
    </span>
  ) : (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide uppercase inline-flex items-center gap-1 bg-cyan-600 text-white">
      ≈ Equal Risk
    </span>
  );

  return (
    <div
      className={`flex-1 min-w-0 rounded-xl bg-[#141B24] border border-slate-700 ${ringClass} p-5 flex flex-col gap-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-500 mb-0.5">
            Quote
          </p>
          <h3 className="text-base font-black text-white leading-tight">{label}</h3>
        </div>
        {statusPill}
      </div>

      {/* Sticker Price */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <span className="text-sm text-slate-400">Sticker Price</span>
        <span className="font-mono tabular-nums text-base font-bold text-white">
          {base != null ? formatCurrency(base) : <span className="text-slate-500 text-sm">Not stated</span>}
        </span>
      </div>

      {/* Liabilities */}
      {liabilities.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-widest uppercase text-rose-400">
            Hidden Liabilities
          </p>
          {liabilities.map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <span className="text-xs text-slate-400 leading-tight flex-1">{l.label}</span>
              <span className="font-mono tabular-nums text-xs text-rose-400 font-bold whitespace-nowrap">
                +{formatCurrency(l.cost)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-700/50 pt-2 mt-1">
            <span className="text-xs text-slate-400">Total Liability Risk</span>
            <span className="font-mono tabular-nums text-sm text-rose-400 font-black">
              +{formatCurrency(totalLiability)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black tracking-widest uppercase text-emerald-400">
            Hidden Liabilities
          </p>
          <p className="text-xs text-emerald-400">No hidden liabilities detected</p>
        </div>
      )}

      {/* TRUE REAL COST */}
      <div className={`rounded-lg p-3 mt-auto ${isWinner ? "bg-emerald-900/30 border border-emerald-700/40" : isLoser ? "bg-rose-900/20 border border-rose-700/30" : "bg-slate-800/50 border border-slate-700/40"}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">
              True Real Cost
            </p>
            <p className="text-[9px] text-slate-500">Window Man Certified™</p>
          </div>
          {adjusted != null ? (
            <span className={`font-mono tabular-nums text-xl font-black ${isWinner ? "text-emerald-400" : isLoser ? "text-rose-400" : "text-white"}`}>
              {formatCurrency(adjusted)}
            </span>
          ) : (
            <div className="text-right">
              <span className="font-mono tabular-nums text-base font-black text-slate-400">
                {base != null ? formatCurrency(base + totalLiability) : "N/A"}
              </span>
              {base == null && (
                <p className="text-[9px] text-slate-500 mt-0.5">Base price not stated</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
