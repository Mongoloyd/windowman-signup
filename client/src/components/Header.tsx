import { ASSETS } from "@/lib/assets";
import { Shield } from "lucide-react";

export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200/60"
      style={{ background: "rgba(250,251,252,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img
            src={ASSETS.windowmanCharacter}
            alt="WindowMan"
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Window<span className="text-cyan-600">Man</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span className="hidden sm:inline font-[var(--font-mono)] text-xs">256-bit Encrypted</span>
        </div>
      </div>
    </header>
  );
}
