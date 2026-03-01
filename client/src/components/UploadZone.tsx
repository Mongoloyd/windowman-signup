import { useInView } from "@/hooks/useInView";
import { useState, useCallback } from "react";
import { Upload, CloudUpload, Camera, FileText, UserPlus, ArrowRight } from "lucide-react";

export function UploadZone() {
  const { ref, isInView } = useInView(0.1);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file.name);
      // Trigger scanning flow
      setTimeout(() => {
        document.getElementById("scanning-section")?.scrollIntoView({ behavior: "smooth" });
      }, 800);
    }
  }, []);

  const handleFileSelect = useCallback(() => {
    setUploadedFile("contractor-quote-2024.pdf");
    setTimeout(() => {
      document.getElementById("scanning-section")?.scrollIntoView({ behavior: "smooth" });
    }, 800);
  }, []);

  return (
    <section ref={ref} id="upload-zone" className="relative py-24 overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,255,0.3), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Upload className="w-4 h-4 text-[#00D9FF]" />
          <span className="font-[var(--font-mono)] text-xs text-[#00D9FF] uppercase tracking-widest">The Decision Point</span>
        </div>

        <h2 className={`font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-white mb-12 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Ready to See the Truth?
        </h2>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Upload Zone (3 cols - dominant) */}
          <div
            className={`lg:col-span-3 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div
              className={`relative rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${isDragging ? "scale-[1.02]" : ""} ${uploadedFile ? "border-[#10B981]" : ""}`}
              style={{
                background: isDragging ? "rgba(0,217,255,0.08)" : "rgba(15,20,25,0.8)",
                border: `2px dashed ${isDragging ? "#00D9FF" : uploadedFile ? "#10B981" : "rgba(0,217,255,0.3)"}`,
                animation: !uploadedFile ? "pulse-border 3s ease-in-out infinite" : "none",
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!uploadedFile ? (
                <>
                  <CloudUpload className="w-16 h-16 text-[#00D9FF] mx-auto mb-6 opacity-60" />
                  <h3 className="font-[var(--font-display)] text-2xl font-bold text-white mb-2">
                    Have Your Quote Ready?
                  </h3>
                  <p className="text-[#94A3B8] mb-8">
                    Let's analyze it. Drop your quote here or click to upload.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <button
                      onClick={handleFileSelect}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-[var(--font-display)] font-semibold text-[#0F1419] transition-all duration-300 hover:scale-105"
                      style={{
                        background: "#00D9FF",
                        boxShadow: "0 0 20px rgba(0,217,255,0.3)",
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      Upload PDF
                    </button>
                    <button
                      onClick={handleFileSelect}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-[var(--font-display)] font-semibold text-[#00D9FF] border border-[rgba(0,217,255,0.3)] transition-all duration-300 hover:bg-[rgba(0,217,255,0.08)]"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                  </div>

                  <p className="text-xs text-[#475569] font-[var(--font-mono)]">
                    PDF, JPG, PNG, or HEIC • Max 25MB
                  </p>
                </>
              ) : (
                <div className="py-4">
                  <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="font-[var(--font-display)] text-xl font-bold text-[#10B981] mb-1">Quote Received!</h3>
                  <p className="text-[#94A3B8] text-sm font-[var(--font-mono)]">{uploadedFile}</p>
                  <p className="text-xs text-[#475569] mt-2">Initiating AI analysis...</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: No Quote Path (2 cols) */}
          <div
            className={`lg:col-span-2 transition-all duration-700 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="glass-card rounded-2xl p-8 h-full flex flex-col justify-center">
              <UserPlus className="w-10 h-10 text-[#0066CC] mb-6 opacity-70" />
              <h3 className="font-[var(--font-display)] text-xl font-bold text-white mb-3">
                Don't Have a Quote Yet?
              </h3>
              <p className="text-[#94A3B8] text-sm mb-6 leading-relaxed">
                No problem. Create your free account now and scan your quote whenever you're ready. We'll be here.
              </p>
              <button
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-lg font-[var(--font-display)] font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "#0066CC",
                  boxShadow: "0 0 20px rgba(0,102,204,0.2)",
                }}
                onClick={() => document.getElementById("qualification-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                Create Account & Scan Later
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-[#475569] font-[var(--font-mono)] mt-4 text-center">
                Free forever • No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
