import { ASSETS } from "@/lib/assets";
import { Shield } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-[rgba(0,217,255,0.08)]" style={{ background: "rgba(15,20,25,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img
            src={ASSETS.windowmanCharacter}
            alt="WindowMan"
            className="h-10 w-10 object-contain"
          />
          <span className="font-[var(--font-display)] text-xl font-bold tracking-tight text-white">
            Window<span className="text-[#00D9FF]">Man</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <Shield className="w-4 h-4 text-[#10B981]" />
          <span className="hidden sm:inline font-[var(--font-mono)] text-xs">256-bit Encrypted</span>
        </div>
      </div>
    </header>
  );
}
