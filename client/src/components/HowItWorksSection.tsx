import { useInView } from "@/hooks/useInView";
import { Upload, Brain, Award, Handshake } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Quote",
    desc: "Take a photo or upload a PDF. Any format works — our AI reads it all.",
    color: "#00D9FF",
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Analyzes 5 Pillars",
    desc: "Safety & code, install scope, price fairness, fine print, and warranty value.",
    color: "#00D9FF",
  },
  {
    icon: Award,
    step: "03",
    title: "Get Your Instant Grade",
    desc: "A–F letter grade with a detailed breakdown of every line item in your quote.",
    color: "#10B981",
  },
  {
    icon: Handshake,
    step: "04",
    title: "Connect with Fair-Priced Contractors",
    desc: "Match with vetted pros or use your report as leverage to negotiate.",
    color: "#10B981",
  },
];

export function HowItWorksSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,255,0.3), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <div className="w-2 h-2 rounded-full bg-[#00D9FF]" />
          <span className="font-[var(--font-mono)] text-xs text-[#00D9FF] uppercase tracking-widest">How It Works</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          From Upload to Leverage<br />
          <span className="text-[#00D9FF]">in Under 60 Seconds.</span>
        </h2>

        <p className={`text-[#64748B] text-lg mb-16 max-w-xl transition-all duration-700 delay-200 ${isInView ? "opacity-100" : "opacity-0"}`}>
          Four steps. Zero guesswork. Full transparency.
        </p>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-[1px] hidden md:block" style={{ background: "linear-gradient(180deg, rgba(0,217,255,0.4), rgba(16,185,129,0.4))" }} />

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.step}
                className={`flex items-start gap-6 transition-all duration-700 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
                style={{ transitionDelay: `${300 + i * 200}ms` }}
              >
                {/* Step indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: `rgba(${step.color === "#00D9FF" ? "0,217,255" : "16,185,129"},0.1)`,
                      border: `1px solid ${step.color}33`,
                    }}
                  >
                    <step.icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                </div>

                {/* Content */}
                <div className="glass-card rounded-xl p-6 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-[var(--font-mono)] text-xs text-[#475569]">STEP {step.step}</span>
                  </div>
                  <h3 className="font-[var(--font-display)] text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[#94A3B8] text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
