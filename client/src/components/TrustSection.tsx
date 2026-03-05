import { useInView } from "@/hooks/useInView";
import { Shield, Lock, Eye, Award } from "lucide-react";

const trustItems = [
  { icon: Shield, label: "256-bit Encryption", desc: "Bank-grade security for your documents" },
  { icon: Lock, label: "SOC 2 Compliant", desc: "Enterprise-level data protection" },
  { icon: Eye, label: "Your Data, Your Control", desc: "Delete anytime. We never sell your info." },
  { icon: Award, label: "10,000+ Analyses", desc: "Trusted by Florida homeowners" },
];

export function TrustSection() {
  const { ref, isInView } = useInView(0.15);

  return (
    <section ref={ref} className="relative py-16 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(8,145,178,0.2), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustItems.map((item, i) => (
            <div
              key={item.label}
              className={`text-center transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <item.icon className="w-6 h-6 text-emerald-500 mx-auto mb-3 opacity-70" />
              <h4 className="font-semibold text-slate-900 text-sm mb-1">{item.label}</h4>
              <p className="text-slate-400 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
