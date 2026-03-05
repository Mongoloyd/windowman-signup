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
    <section
      ref={ref}
      id="scanning-section"
      className="relative py-24 overflow-hidden"
      aria-labelledby="scanning-heading"
    >
      {/* Background */}
      <div className="absolute inset-0" aria-hidden="true">
        <img src={ASSETS.scanAnimationBg} alt="" className="w-full h-full object-cover opacity-[0.04]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(250,251,252,1) 0%, rgba(250,251,252,0.9) 50%, rgba(250,251,252,1) 100%)" }} />
      </div>

      {/* Top divider */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(8,145,178,0.25), transparent)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 container max-w-4xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Loader2 className="w-4 h-4 text-cyan-700 animate-spin" aria-hidden="true" />
          <span className="font-mono text-xs text-cyan-700 font-bold uppercase tracking-widest">Flow A — AI Analysis</span>
        </div>

        <h2
          id="scanning-heading"
          className={`text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          Your Analysis is Being Generated{" "}
          <span className="text-cyan-700 font-extrabold">Right Now.</span>
        </h2>
        <p className={`text-slate-700 font-medium text-lg mb-12 transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}>
          We're comparing your quote to thousands of Florida projects. Buckle up.
        </p>

        {/* Scanning UI */}
        <div className="rounded-2xl p-6 sm:p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15">
          {/* Progress Bar */}
          <div className="mb-8" role="progressbar" aria-valuenow={Math.min(progress, 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-slate-700 font-bold">ANALYSIS PROGRESS</span>
              <span className="font-mono text-sm text-cyan-700 font-extrabold">{Math.min(progress, 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: "linear-gradient(90deg, #0891B2, #10B981)",
                  boxShadow: "0 0 12px rgba(8,145,178,0.35)",
                }}
              />
            </div>
          </div>

          {/* Pillar Checklist */}
          <div className="space-y-4" role="list" aria-label="Analysis pillars">
            {pillars.map((pillar, i) => {
              const isComplete = completedPillars.includes(i);
              const isActive = !isComplete && completedPillars.length === i;

              return (
                <div
                  key={pillar.label}
                  role="listitem"
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                    isComplete
                      ? "bg-emerald-50 border border-emerald-300"
                      : isActive
                      ? "bg-cyan-50 border border-cyan-300"
                      : "bg-white/60 border border-slate-300"
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-700" aria-label="Complete" />
                    ) : isActive ? (
                      <Loader2 className="w-6 h-6 text-cyan-700 animate-spin" aria-label="In progress" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-400" aria-label="Pending" />
                    )}
                  </div>

                  {/* Pillar icon */}
                  <pillar.icon
                    className={`w-5 h-5 flex-shrink-0 ${isComplete ? "text-emerald-700" : isActive ? "text-cyan-700" : "text-slate-700"}`}
                    aria-hidden="true"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm ${isComplete ? "text-emerald-800" : isActive ? "text-slate-900" : "text-slate-700"}`}>
                      {pillar.label}
                    </h4>
                    {(isActive || isComplete) && (
                      <p className={`text-xs mt-0.5 font-mono font-medium ${isComplete ? "text-emerald-700" : "text-cyan-700"}`}>
                        {isComplete ? "Complete" : pillar.desc}
                      </p>
                    )}
                  </div>

                  {/* Score (if complete) */}
                  {isComplete && (
                    <span className="font-mono text-sm font-extrabold text-emerald-700">
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
