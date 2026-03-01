import { ASSETS } from "@/lib/assets";
import { useInView } from "@/hooks/useInView";
import { useState, useEffect } from "react";
import { Shield, FileSearch, Scale, FileText, Award, CheckCircle2, Loader2 } from "lucide-react";

const pillars = [
  { icon: Shield, label: "Safety & Code Match", desc: "Cross-referencing Miami-Dade NOA..." },
  { icon: FileSearch, label: "Install & Scope Clarity", desc: "Verifying line item completeness..." },
  { icon: Scale, label: "Price Fairness", desc: "Comparing to 10,000+ FL contracts..." },
  { icon: FileText, label: "Fine Print Transparency", desc: "Scanning for hidden clauses..." },
  { icon: Award, label: "Warranty Value", desc: "Evaluating coverage terms..." },
];

export function ScanningState() {
  const { ref, isInView } = useInView(0.15);
  const [completedPillars, setCompletedPillars] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    // Complete pillars one by one
    pillars.forEach((_, i) => {
      setTimeout(() => {
        setCompletedPillars((prev) => [...prev, i]);
      }, 1200 + i * 900);
    });

    return () => clearInterval(progressInterval);
  }, [isInView]);

  return (
    <section ref={ref} id="scanning-section" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={ASSETS.scanAnimationBg} alt="" className="w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #0F1419 0%, rgba(15,20,25,0.7) 50%, #0F1419 100%)" }} />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,255,0.3), transparent)" }} />

      <div className="relative z-10 container max-w-4xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Loader2 className="w-4 h-4 text-[#00D9FF] animate-spin" />
          <span className="font-[var(--font-mono)] text-xs text-[#00D9FF] uppercase tracking-widest">Flow A — AI Analysis</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-white mb-3 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Your Analysis is Being Generated <span className="text-[#00D9FF]">Right Now.</span>
        </h2>
        <p className={`text-[#64748B] text-lg mb-12 transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}>
          We're comparing your quote to thousands of Florida projects. Buckle up.
        </p>

        {/* Scanning UI */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 glow-cyan">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-[var(--font-mono)] text-xs text-[#64748B]">ANALYSIS PROGRESS</span>
              <span className="font-[var(--font-mono)] text-sm text-[#00D9FF] font-bold">{Math.min(progress, 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[rgba(0,217,255,0.08)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: "linear-gradient(90deg, #00D9FF, #10B981)",
                  boxShadow: "0 0 10px rgba(0,217,255,0.4)",
                }}
              />
            </div>
          </div>

          {/* Pillar Checklist */}
          <div className="space-y-4">
            {pillars.map((pillar, i) => {
              const isComplete = completedPillars.includes(i);
              const isActive = !isComplete && completedPillars.length === i;

              return (
                <div
                  key={pillar.label}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                    isComplete
                      ? "bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.2)]"
                      : isActive
                      ? "bg-[rgba(0,217,255,0.06)] border border-[rgba(0,217,255,0.2)]"
                      : "bg-[rgba(255,255,255,0.02)] border border-transparent"
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                    ) : isActive ? (
                      <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-[#243044]" />
                    )}
                  </div>

                  {/* Pillar icon */}
                  <pillar.icon className={`w-5 h-5 flex-shrink-0 ${isComplete ? "text-[#10B981]" : isActive ? "text-[#00D9FF]" : "text-[#475569]"}`} />

                  {/* Content */}
                  <div className="flex-1">
                    <h4 className={`font-[var(--font-display)] font-semibold text-sm ${isComplete ? "text-[#10B981]" : isActive ? "text-white" : "text-[#64748B]"}`}>
                      {pillar.label}
                    </h4>
                    {(isActive || isComplete) && (
                      <p className={`text-xs mt-0.5 font-[var(--font-mono)] ${isComplete ? "text-[#10B981]/60" : "text-[#00D9FF]/60"}`}>
                        {isComplete ? "✓ Complete" : pillar.desc}
                      </p>
                    )}
                  </div>

                  {/* Score (if complete) */}
                  {isComplete && (
                    <span className="font-[var(--font-mono)] text-sm font-bold text-[#10B981]">
                      {[92, 78, 85, 82, 88][i]}/100
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
