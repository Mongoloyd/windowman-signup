import { useInView } from "@/hooks/useInView";
import { Upload, Brain, Award, Handshake } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Quote",
    desc: "Take a photo or upload a PDF. Any format works — our AI reads it all.",
    accent: "cyan" as const,
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Analyzes 5 Pillars",
    desc: "Safety & code, install scope, price fairness, fine print, and warranty value.",
    accent: "cyan" as const,
  },
  {
    icon: Award,
    step: "03",
    title: "Get Your Instant Grade",
    desc: "A–F letter grade with a detailed breakdown of every line item in your quote.",
    accent: "emerald" as const,
  },
  {
    icon: Handshake,
    step: "04",
    title: "Connect with Fair-Priced Contractors",
    desc: "Match with vetted pros or use your report as leverage to negotiate.",
    accent: "emerald" as const,
  },
];

const accentClasses = {
  cyan: {
    iconBg: "bg-cyan-50",
    iconBorder: "border-cyan-300",
    iconColor: "text-cyan-700",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconBorder: "border-emerald-300",
    iconColor: "text-emerald-700",
  },
};

export function HowItWorksSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section
      ref={ref}
      className="relative py-24 overflow-hidden"
      aria-labelledby="howitworks-heading"
    >
      {/* Top divider */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(8,145,178,0.25), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div
          className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}
        >
          <div className="w-2 h-2 rounded-full bg-cyan-600" aria-hidden="true" />
          <span className="font-[var(--font-mono)] text-xs text-cyan-700 font-bold uppercase tracking-widest">
            How It Works
          </span>
        </div>

        <h2
          id="howitworks-heading"
          className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          From Upload to Leverage
          <br />
          <span className="text-cyan-700 font-extrabold">in Under 60 Seconds.</span>
        </h2>

        <p
          className={`text-slate-700 font-medium text-lg mb-16 max-w-xl transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}
        >
          Four steps. Zero guesswork. Full transparency.
        </p>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-[27px] top-0 bottom-0 w-[2px] hidden md:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,145,178,0.35), rgba(16,185,129,0.35))",
            }}
            aria-hidden="true"
          />

          <ol className="grid grid-cols-1 md:grid-cols-1 gap-6 list-none p-0 m-0">
            {steps.map((step, i) => {
              const cls = accentClasses[step.accent];
              return (
                <li
                  key={step.step}
                  className={`flex items-start gap-6 transition-all duration-700 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
                  style={{ transitionDelay: `${300 + i * 200}ms` }}
                >
                  {/* Step indicator */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center ${cls.iconBg} border ${cls.iconBorder} shadow-md`}
                    >
                      <step.icon
                        className={`w-6 h-6 ${cls.iconColor}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15 rounded-2xl p-6 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-[var(--font-mono)] text-xs text-slate-700 font-bold">
                        STEP {step.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-700 font-medium text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
