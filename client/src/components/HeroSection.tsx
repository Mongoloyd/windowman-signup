import { ASSETS } from "@/lib/assets";
import { useInView } from "@/hooks/useInView";
import { ArrowDown, ScanLine, Shield, Zap } from "lucide-react";
import { UrgencyTicker } from "@/components/UrgencyTicker";
import { FloatingChip } from "@/components/FloatingChip";

export function HeroSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ paddingTop: "5rem" }}
      aria-labelledby="hero-heading"
    >
      {/* Background — subtle image wash */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={ASSETS.heroBg}
          alt=""
          className="w-full h-full object-cover opacity-[0.07]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,251,252,0.5) 0%, rgba(241,245,249,0.92) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-5xl text-center">
        {/* Urgency Ticker */}
        <UrgencyTicker
          className={`mb-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        />

        {/* Main Headline — visible from 20 feet */}
        <h1
          id="hero-heading"
          className={`text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.08] mb-6 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          Scan Your Quote.{" "}
          <span className="text-cyan-700 font-extrabold drop-shadow-[0_2px_8px_rgba(0,188,212,0.25)]">
            Beat Your Contractors.
          </span>
        </h1>

        {/* Subheadline — 7.4:1 contrast */}
        <p
          className={`text-lg sm:text-xl text-slate-700 font-medium max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          See exactly where you're being overcharged and get the leverage to
          negotiate fair pricing — powered by AI that's analyzed{" "}
          <span className="text-slate-900 font-bold">
            10,000+ Florida window contracts
          </span>
          .
        </p>

        {/* CTA Button — vibrant gradient with bold shadow */}
        <div
          className={`transition-all duration-700 delay-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <button
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 transition-all duration-300 hover:scale-105 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.40)]"
            onClick={() =>
              document
                .getElementById("upload-zone")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Scan My Quote Now
            <ArrowDown className="w-5 h-5 animate-bounce" aria-hidden="true" />
          </button>
        </div>

        {/* Trust line */}
        <p
          className={`mt-6 text-xs text-slate-700 font-medium font-[var(--font-mono)] transition-all duration-700 delay-700 ${isInView ? "opacity-100" : "opacity-0"}`}
        >
          Free • No credit card • Results in 60 seconds
        </p>

        {/* Floating trust badges — continuous float in conversion zone */}
        <div
          className={`flex flex-wrap justify-center gap-4 mt-10 transition-all duration-700 delay-[800ms] ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <FloatingChip delay={0} duration={3.5} distance={8} className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-cyan-200/60 shadow-[0_4px_20px_-4px_rgba(0,188,212,0.15)] text-sm font-semibold text-slate-800">
              <ScanLine className="w-4 h-4 text-cyan-600" aria-hidden="true" />
              AI OCR
            </span>
          </FloatingChip>

          <FloatingChip delay={0.8} duration={4} distance={10} className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-emerald-200/60 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)] text-sm font-semibold text-slate-800">
              <Shield className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              256-bit Encrypted
            </span>
          </FloatingChip>

          <FloatingChip delay={1.6} duration={4.5} distance={7} className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-amber-200/60 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] text-sm font-semibold text-slate-800">
              <Zap className="w-4 h-4 text-amber-600" aria-hidden="true" />
              60s Scan
            </span>
          </FloatingChip>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-breathe"
        aria-hidden="true"
      >
        <span className="text-xs text-slate-700 font-medium font-[var(--font-mono)]">
          SCROLL
        </span>
        <div className="w-[1px] h-8 bg-gradient-to-b from-cyan-600 to-transparent" />
      </div>
    </section>
  );
}
