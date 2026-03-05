import { ASSETS } from "@/lib/assets";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="relative py-12 border-t border-slate-200/60">
      <div className="container max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={ASSETS.windowmanCharacter} alt="WindowMan" className="h-8 w-8 object-contain" />
            <span className="text-sm font-bold text-slate-900">
              Window<span className="text-cyan-600">Man</span>
            </span>
            <span className="text-slate-400 text-xs font-[var(--font-mono)]">The Truth Engine</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400 font-[var(--font-mono)]">
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <span>Terms of Service</span>
            <span>&copy; 2025 WindowMan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
