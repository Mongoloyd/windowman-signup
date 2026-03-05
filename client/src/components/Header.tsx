import { ASSETS } from "@/lib/assets";
import { Shield } from "lucide-react";

export function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200/80"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      role="banner"
    >
      <div className="container flex items-center justify-between h-16">
        <a
          href="/"
          className="flex items-center gap-3"
          aria-label="WindowMan — Home"
        >
          <img
            src={ASSETS.windowmanCharacter}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 object-contain drop-shadow-md"
          />
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Window<span className="text-cyan-700 font-extrabold">Man</span>
          </span>
        </a>
        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
          <Shield className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          <span className="hidden sm:inline font-[var(--font-mono)] text-xs text-slate-700 font-medium">
            256-bit Encrypted
          </span>
        </div>
      </div>
    </header>
  );
}
