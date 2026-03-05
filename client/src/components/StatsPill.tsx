import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { useTickerStats } from "@/hooks/useTickerStats";

interface StatsPillProps {
  showToday?: boolean;
  className?: string;
  inline?: boolean; // For inline text integration
}

export function StatsPill({ showToday = true, className, inline = false }: StatsPillProps) {
  const { ref, isInView } = useInView(0.5);
  const { total, today } = useTickerStats();

  const totalCount = useCountUp(total, 2500, isInView);
  const todayCount = useCountUp(today, 2500, isInView);

  if (inline) {
    // Inline variant for text integration
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 overflow-hidden backdrop-blur-sm mx-1 align-baseline",
          "bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-900",
          className
        )}
      >
        <span className="flex items-center gap-2 pr-3">
          <Shield className="w-3.5 h-3.5 text-cyan-600" />
          <span className="font-mono font-bold text-slate-900 tabular-nums">
            {totalCount.toLocaleString()}
          </span>
          <span className="font-mono text-xs text-slate-700">
            quotes scanned
          </span>
        </span>
        {showToday && (
          <span
            className="flex items-center gap-2 pl-3"
            style={{ background: "rgba(8,145,178,0.04)" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75 animate-ping"
                style={{ animationIterationCount: 3 }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            <span className="font-mono font-semibold text-xs text-cyan-600 tabular-nums">
              +{todayCount} today
            </span>
          </span>
        )}
      </span>
    );
  }

  // Block variant (original UrgencyTicker style)
  return (
    <div ref={ref} className={cn("flex items-center justify-center", className)}>
      <div
        className="inline-flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 overflow-hidden backdrop-blur-sm"
        style={{ background: "rgba(255,255,255,0.8)" }}
      >
        {/* Total scanned */}
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2">
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
            {totalCount.toLocaleString()}
          </span>
          <span className="font-mono text-[10px] sm:text-xs text-slate-700">
            quotes scanned
          </span>
        </div>

        {/* Today count */}
        {showToday && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2"
            style={{ background: "rgba(8,145,178,0.04)" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75 animate-ping"
                style={{ animationIterationCount: 3 }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            <span className="font-mono font-semibold text-xs sm:text-sm text-cyan-600 tabular-nums">
              +{todayCount} today
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
