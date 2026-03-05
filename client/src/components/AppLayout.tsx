import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScanLine } from "@/components/ScanLine";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFBFC] to-[#F5F7F9] text-slate-900 overflow-x-hidden relative font-sans flex flex-col">
      {/* Background: -z-10 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] bg-[length:28px_28px]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[980px] h-[520px] rounded-full blur-[90px] bg-cyan-400/10" />
        <div className="absolute top-24 -left-40 w-[520px] h-[520px] rounded-full blur-[90px] bg-blue-500/10" />
        <div className="absolute top-80 -right-56 w-[520px] h-[520px] rounded-full blur-[90px] bg-emerald-500/5" />
      </div>

      {/* ScanLine: z-0 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ScanLine variant="light" />
      </div>

      {/* App chrome (nav/footer): z-20 */}
      <div className="relative z-20">
        <Header />
      </div>

      {/* Content: z-10 */}
      <main className="relative z-10 flex-grow">{children}</main>

      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
}
