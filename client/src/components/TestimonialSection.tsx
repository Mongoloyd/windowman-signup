import { useInView } from "@/hooks/useInView";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Maria G.",
    location: "Miami-Dade County",
    text: "WindowMan caught $4,200 in hidden fees my contractor tried to sneak in. The AI found a non-compliant glass spec that would've failed inspection.",
    saved: "$4,200",
    rating: 5,
  },
  {
    name: "James T.",
    location: "Broward County",
    text: "I was about to sign a $22K contract. WindowMan showed me the labor rate was 30% above market. Negotiated it down to $16K with the report.",
    saved: "$6,000",
    rating: 5,
  },
  {
    name: "Sandra L.",
    location: "Palm Beach County",
    text: "The warranty analysis alone was worth it. Found out my 'lifetime warranty' had a clause that voided it after 2 years. Switched contractors.",
    saved: "$8,500",
    rating: 5,
  },
];

export function TestimonialSection() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section ref={ref} className="relative py-24 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,255,0.15), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Star className="w-4 h-4 text-[#F59E0B]" />
          <span className="font-[var(--font-mono)] text-xs text-[#F59E0B] uppercase tracking-widest">Social Proof</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-white mb-12 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Real Homeowners. <span className="text-[#10B981]">Real Savings.</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`glass-card rounded-xl p-6 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              <Quote className="w-5 h-5 text-[#00D9FF] opacity-30 mb-3" />
              <p className="text-[#C8D1DC] text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Star key={si} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-[var(--font-display)] font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-[#475569] text-xs">{t.location}</p>
                </div>
                <div className="text-right">
                  <span className="font-[var(--font-mono)] text-sm font-bold text-[#10B981]">Saved {t.saved}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
