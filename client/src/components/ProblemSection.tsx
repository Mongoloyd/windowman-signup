import { ASSETS } from "@/lib/assets";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { AlertTriangle, FileWarning, ShieldAlert } from "lucide-react";

export function ProblemSection() {
  const { ref, isInView } = useInView(0.15);
  const overchargePercent = useCountUp(87, 1500, isInView);
  const lowOvercharge = useCountUp(8000, 2000, isInView);
  const highOvercharge = useCountUp(15000, 2000, isInView);

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={ASSETS.problemBg} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #0F1419 0%, rgba(15,20,25,0.85) 50%, #0F1419 100%)" }} />
      </div>

      {/* Divider line */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,255,0.3), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          <span className="font-[var(--font-mono)] text-xs text-[#F59E0B] uppercase tracking-widest">The Problem</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-16 leading-tight transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Your Contractor's Quote<br />
          <span className="text-[#F59E0B]">Might Be Overpriced.</span>
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Stat 1: 87% */}
          <div
            className={`glass-card rounded-xl p-8 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="font-[var(--font-display)] text-7xl sm:text-8xl font-bold text-white mb-3">
              {overchargePercent}<span className="text-[#F59E0B]">%</span>
            </div>
            <p className="text-[#94A3B8] text-lg leading-relaxed">
              of homeowners <span className="text-white font-semibold">don't catch hidden fees</span>, unapproved materials, or code violations in their window replacement quotes.
            </p>
          </div>

          {/* Stat 2: $8K-$15K */}
          <div
            className={`glass-card rounded-xl p-8 transition-all duration-700 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="font-[var(--font-mono)] text-5xl sm:text-6xl font-bold text-[#EF4444] mb-3">
              ${lowOvercharge.toLocaleString()}<span className="text-[#64748B] text-3xl"> — </span>${highOvercharge.toLocaleString()}
            </div>
            <p className="text-[#94A3B8] text-lg leading-relaxed">
              Average <span className="text-[#EF4444] font-semibold">overcharge per project</span> found in our analysis of Florida window replacement contracts.
            </p>
          </div>
        </div>

        {/* Pain Point Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: FileWarning, label: "Permits Excluded", desc: "\"Subject to remeasure\" clauses that inflate final costs" },
            { icon: ShieldAlert, label: "Warranty Loopholes", desc: "Fine print that voids coverage on day one" },
            { icon: AlertTriangle, label: "Code Mismatches", desc: "Non-compliant materials that fail inspection" },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`glass-card rounded-lg p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${600 + i * 150}ms` }}
            >
              <item.icon className="w-5 h-5 text-[#F59E0B] mb-3" />
              <h3 className="font-[var(--font-display)] font-semibold text-white text-sm mb-1">{item.label}</h3>
              <p className="text-[#64748B] text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
