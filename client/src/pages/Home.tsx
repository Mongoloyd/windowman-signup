import { ScrollReveal } from "@/components/ScrollReveal";
import { HeroSection } from "@/components/HeroSection";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { TestimonialSection } from "@/components/TestimonialSection";
import { TrustSection } from "@/components/TrustSection";
import { UploadZone } from "@/components/UploadZone";
import { ScanningState } from "@/components/ScanningState";
import { AnalysisReveal } from "@/components/AnalysisReveal";
import { QualificationCard } from "@/components/QualificationCard";

export default function Home() {
  return (
    <>
      {/* Hero loads immediately — no scroll reveal (above the fold) */}
      <HeroSection />

      <ScrollReveal delay={0}>
        <ProblemSection />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <HowItWorksSection />
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <TestimonialSection />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <TrustSection />
      </ScrollReveal>

      <ScrollReveal delay={0}>
        <UploadZone />
      </ScrollReveal>

      <ScrollReveal delay={0}>
        <ScanningState />
      </ScrollReveal>

      <ScrollReveal delay={0}>
        <AnalysisReveal />
      </ScrollReveal>

      <ScrollReveal delay={0}>
        <QualificationCard />
      </ScrollReveal>
    </>
  );
}
