import { ASSETS } from "@/lib/assets";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { Shield, FileSearch, Scale, FileText, Award, CheckCircle2, AlertTriangle, Phone } from "lucide-react";

const pillars = [
  { icon: Shield, label: "Safety & Code Match", score: 92, status: "pass", detail: "Wind load specs verified. Miami-Dade NOA confirmed." },
  { icon: FileSearch, label: "Install & Scope Clarity", score: 78, status: "warn", detail: "Missing: Stucco repair line item. \"Subject to remeasure\" clause found." },
  { icon: Scale, label: "Price Fairness", score: 85, status: "warn", detail: "Labor rate 12% above county median. Material markup within range." },
  { icon: FileText, label: "Fine Print Transparency", score: 82, status: "warn", detail: "Permit responsibility unclear. Change order terms favor contractor." },
  { icon: Award, label: "Warranty Value", score: 88, status: "pass", detail: "Manufacturer warranty: Lifetime. Labor warranty: 5 years." },
];

function ScoreRing({ score, isInView }: { score: number; isInView: boolean }) {
  const animatedScore = useCountUp(score, 2000, isInView);
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(0,217,255,0.08)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r="60" fill="none"
          stroke="#00D9FF"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-[2000ms] ease-out"
          style={{ filter: "drop-shadow(0 0 8px rgba(0,217,255,0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[var(--font-mono)] text-4xl font-bold text-white">{animatedScore}</span>
        <span className="font-[var(--font-mono)] text-xs text-[#64748B]">/ 100</span>
      </div>
    </div>
  );
}

export function AnalysisReveal() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={ASSETS.dashboardRevealBg} alt="" className="w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #0F1419 0%, rgba(15,20,25,0.8) 50%, #0F1419 100%)" }} />
      </div>

      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Award className="w-4 h-4 text-[#10B981]" />
          <span className="font-[var(--font-mono)] text-xs text-[#10B981] uppercase tracking-widest">Flow A — The Reveal</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-white mb-12 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Your Quote Analysis
        </h2>

        {/* Grade Card */}
        <div className={`glass-card rounded-2xl p-8 mb-8 glow-cyan transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Score Ring */}
            <div className="flex flex-col items-center">
              <ScoreRing score={87} isInView={isInView} />
              <div className="mt-4 text-center">
                <span className="font-[var(--font-mono)] text-xs text-[#64748B]">OVERALL SCORE</span>
              </div>
            </div>

            {/* Grade */}
            <div className="text-center">
              <div className="font-[var(--font-display)] text-8xl font-bold text-white mb-2" style={{ textShadow: "0 0 30px rgba(0,217,255,0.3)" }}>
                B
              </div>
              <span className="font-[var(--font-mono)] text-sm text-[#00D9FF]">GRADE</span>
              <p className="text-[#94A3B8] text-sm mt-2">Above average, but room for negotiation.</p>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)]">
                <span className="text-sm text-[#94A3B8]">Passed</span>
                <span className="font-[var(--font-mono)] font-bold text-[#10B981]">2 / 5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)]">
                <span className="text-sm text-[#94A3B8]">Warnings</span>
                <span className="font-[var(--font-mono)] font-bold text-[#F59E0B]">3 / 5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)]">
                <span className="text-sm text-[#94A3B8]">Critical</span>
                <span className="font-[var(--font-mono)] font-bold text-[#EF4444]">0 / 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar Breakdown */}
        <div className="space-y-4 mb-10">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.label}
              className={`glass-card rounded-xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${400 + i * 150}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Status */}
                <div className="flex-shrink-0 mt-0.5">
                  {pillar.status === "pass" ? (
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <pillar.icon className="w-4 h-4 text-[#64748B]" />
                      <h4 className="font-[var(--font-display)] font-semibold text-white text-sm">{pillar.label}</h4>
                    </div>
                    <span className={`font-[var(--font-mono)] text-sm font-bold ${pillar.status === "pass" ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                      {pillar.score}/100
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] mb-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-[1500ms] ease-out"
                      style={{
                        width: isInView ? `${pillar.score}%` : "0%",
                        background: pillar.status === "pass" ? "#10B981" : "#F59E0B",
                        transitionDelay: `${600 + i * 150}ms`,
                      }}
                    />
                  </div>

                  <p className="text-xs text-[#64748B] font-[var(--font-mono)]">{pillar.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`text-center transition-all duration-700 delay-1000 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <button
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-[var(--font-display)] font-bold text-lg text-[#0F1419] transition-all duration-300 hover:scale-105"
            style={{
              background: "#00D9FF",
              boxShadow: "0 0 30px rgba(0,217,255,0.4), 0 0 60px rgba(0,217,255,0.15)",
            }}
          >
            <Phone className="w-5 h-5" />
            For a Better Quote, Call WindowMan
          </button>
          <p className="mt-3 text-xs text-[#475569] font-[var(--font-mono)]">
            Speak with a certified window expert • No obligation
          </p>
        </div>
      </div>
    </section>
  );
}
