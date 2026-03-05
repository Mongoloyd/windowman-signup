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
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <TestimonialSection />
      <TrustSection />
      <UploadZone />
      <ScanningState />
      <AnalysisReveal />
      <QualificationCard />
    </>
  );
}
