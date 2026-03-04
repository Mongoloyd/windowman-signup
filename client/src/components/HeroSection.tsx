import { ASSETS } from "@/lib/assets";
import { useInView } from "@/hooks/useInView";
import { ArrowDown } from "lucide-react";
import { UrgencyTicker } from "@/components/UrgencyTicker";

export function HeroSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ paddingTop: "5rem" }}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={ASSETS.heroBg}
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,20,25,0.3) 0%, rgba(15,20,25,0.9) 100%)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-5xl text-center">
        {/* Urgency Ticker */}
        <UrgencyTicker
          className={`mb-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        />

        {/* Main Headline */}
        <h1
          className={`font-[var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          Scan Your Quote.{" "}
          <span className="text-glow-cyan text-[#00D9FF]">Beat Your Contractors.</span>
        </h1>

        {/* Subheadline */}
        <p
          className={`text-lg sm:text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          See exactly where you're being overcharged and get the leverage to negotiate fair pricing — powered by AI that's analyzed{" "}
          <span className="text-white font-semibold">10,000+ Florida window contracts</span>.
        </p>

        {/* CTA Button */}
        <div className={`transition-all duration-700 delay-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <button
            className="inline-flex items-center gap-3 px-10 py-4 rounded-lg font-[var(--font-display)] font-bold text-lg text-[#0F1419] transition-all duration-300 hover:scale-105"
            style={{
              background: "#00D9FF",
              boxShadow: "0 0 30px rgba(0,217,255,0.4), 0 0 60px rgba(0,217,255,0.15)",
            }}
            onClick={() => document.getElementById("upload-zone")?.scrollIntoView({ behavior: "smooth" })}
          >
            Scan My Quote Now
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>

        {/* Trust line */}
        <p className={`mt-6 text-xs text-[#475569] font-[var(--font-mono)] transition-all duration-700 delay-700 ${isInView ? "opacity-100" : "opacity-0"}`}>
          Free • No credit card • Results in 60 seconds
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-breathe">
        <span className="text-xs text-[#475569] font-[var(--font-mono)]">SCROLL</span>
        <div className="w-[1px] h-8 bg-gradient-to-b from-[#00D9FF] to-transparent" />
      </div>
    </section>
  );
}
