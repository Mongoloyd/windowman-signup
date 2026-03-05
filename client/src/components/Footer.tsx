import { ASSETS } from "@/lib/assets";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer
      className="relative py-12 border-t border-slate-300/60 bg-white/60"
      role="contentinfo"
    >
      <div className="container max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={ASSETS.windowmanCharacter}
              alt=""
              aria-hidden="true"
              className="h-8 w-8 object-contain drop-shadow-sm"
            />
            <span className="text-sm font-extrabold text-slate-900">
              Window<span className="text-cyan-700 font-extrabold">Man</span>
            </span>
            <span className="text-slate-700 text-xs font-medium font-[var(--font-mono)]">
              The Truth Engine
            </span>
          </div>
          <nav
            className="flex items-center gap-6 text-xs text-slate-700 font-medium font-[var(--font-mono)]"
            aria-label="Footer navigation"
          >
            <Link
              href="/privacy"
              className="hover:text-cyan-700 transition-colors underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            <span>Terms of Service</span>
            <span>&copy; 2025 WindowMan</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
