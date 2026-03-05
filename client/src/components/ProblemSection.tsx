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
      {/* Background — light wash */}
      <div className="absolute inset-0">
        <img
          src={ASSETS.problemBg}
          alt=""
          className="w-full h-full object-cover opacity-5"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,251,252,0.9) 0%, rgba(241,245,249,0.95) 50%, rgba(250,251,252,0.9) 100%)",
          }}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(8,145,178,0.2), transparent)",
        }}
      />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div
          className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="font-[var(--font-mono)] text-xs text-amber-600 uppercase tracking-widest">
            The Problem
          </span>
        </div>

        <h2
          className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-16 leading-tight transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          Your Contractor's Quote
          <br />
          <span className="text-amber-500">Might Be Overpriced.</span>
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Stat 1: 87% */}
          <div
            className={`bg-white/80 backdrop-blur-xl shadow-lg border border-slate-200 rounded-3xl p-8 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="text-7xl sm:text-8xl font-bold text-slate-900 mb-3">
              {overchargePercent}
              <span className="text-amber-500">%</span>
            </div>
            <p className="text-slate-600 text-lg leading-relaxed">
              of homeowners{" "}
              <span className="text-slate-900 font-semibold">
                don't catch hidden fees
              </span>
              , unapproved materials, or code violations in their window
              replacement quotes.
            </p>
          </div>

          {/* Stat 2: $8K-$15K */}
          <div
            className={`bg-white/80 backdrop-blur-xl shadow-lg border border-slate-200 rounded-3xl p-8 transition-all duration-700 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="font-[var(--font-mono)] text-5xl sm:text-6xl font-bold text-rose-600 mb-3">
              ${lowOvercharge.toLocaleString()}
              <span className="text-slate-400 text-3xl"> — </span>$
              {highOvercharge.toLocaleString()}
            </div>
            <p className="text-slate-600 text-lg leading-relaxed">
              Average{" "}
              <span className="text-rose-600 font-semibold">
                overcharge per project
              </span>{" "}
              found in our analysis of Florida window replacement contracts.
            </p>
          </div>
        </div>

        {/* Pain Point Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: FileWarning,
              label: "Permits Excluded",
              desc: '"Subject to remeasure" clauses that inflate final costs',
            },
            {
              icon: ShieldAlert,
              label: "Warranty Loopholes",
              desc: "Fine print that voids coverage on day one",
            },
            {
              icon: AlertTriangle,
              label: "Code Mismatches",
              desc: "Non-compliant materials that fail inspection",
            },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`bg-white/80 backdrop-blur-xl shadow-lg border border-slate-200 rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${600 + i * 150}ms` }}
            >
              <item.icon className="w-5 h-5 text-amber-500 mb-3" />
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                {item.label}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
