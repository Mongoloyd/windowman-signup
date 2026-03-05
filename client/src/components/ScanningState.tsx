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

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

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
        <img src={ASSETS.scanAnimationBg} alt="" className="w-full h-full object-cover opacity-5" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(250,251,252,1) 0%, rgba(250,251,252,0.9) 50%, rgba(250,251,252,1) 100%)" }} />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(8,145,178,0.2), transparent)" }} />

      <div className="relative z-10 container max-w-4xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Loader2 className="w-4 h-4 text-cyan-600 animate-spin" />
          <span className="font-mono text-xs text-cyan-600 uppercase tracking-widest">Flow A — AI Analysis</span>
        </div>

        <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 mb-3 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Your Analysis is Being Generated <span className="text-cyan-600">Right Now.</span>
        </h2>
        <p className={`text-slate-500 text-lg mb-12 transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}>
          We're comparing your quote to thousands of Florida projects. Buckle up.
        </p>

        {/* Scanning UI */}
        <div className="rounded-2xl p-6 sm:p-8 bg-white/80 backdrop-blur-xl shadow-lg border border-cyan-200">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-slate-400">ANALYSIS PROGRESS</span>
              <span className="font-mono text-sm text-cyan-600 font-bold">{Math.min(progress, 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: "linear-gradient(90deg, #0891B2, #10B981)",
                  boxShadow: "0 0 10px rgba(8,145,178,0.3)",
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
                      ? "bg-emerald-50 border border-emerald-200"
                      : isActive
                      ? "bg-cyan-50 border border-cyan-200"
                      : "bg-slate-50 border border-transparent"
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : isActive ? (
                      <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-300" />
                    )}
                  </div>

                  {/* Pillar icon */}
                  <pillar.icon className={`w-5 h-5 flex-shrink-0 ${isComplete ? "text-emerald-500" : isActive ? "text-cyan-600" : "text-slate-400"}`} />

                  {/* Content */}
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${isComplete ? "text-emerald-600" : isActive ? "text-slate-900" : "text-slate-400"}`}>
                      {pillar.label}
                    </h4>
                    {(isActive || isComplete) && (
                      <p className={`text-xs mt-0.5 font-mono ${isComplete ? "text-emerald-500/60" : "text-cyan-600/60"}`}>
                        {isComplete ? "✓ Complete" : pillar.desc}
                      </p>
                    )}
                  </div>

                  {/* Score (if complete) */}
                  {isComplete && (
                    <span className="font-mono text-sm font-bold text-emerald-500">
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
