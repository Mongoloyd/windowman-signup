import { ScanLine } from "@/components/ScanLine";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { TestimonialSection } from "@/components/TestimonialSection";
import { TrustSection } from "@/components/TrustSection";
import { UploadZone } from "@/components/UploadZone";
import { ScanningState } from "@/components/ScanningState";
import { AnalysisReveal } from "@/components/AnalysisReveal";
import { QualificationCard } from "@/components/QualificationCard";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent text-slate-900 overflow-x-hidden">
      {/* Persistent scan line effect */}
      <ScanLine />

      {/* Fixed header */}
      <Header />

      {/* Page sections */}
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <TestimonialSection />
        <TrustSection />
        <UploadZone />
        <ScanningState />
        <AnalysisReveal />
        <QualificationCard />
      </main>

      <Footer />
    </div>
  );
}
