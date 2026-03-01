import { ASSETS } from "@/lib/assets";

export function Footer() {
  return (
    <footer className="relative py-12 border-t border-[rgba(0,217,255,0.08)]">
      <div className="container max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={ASSETS.windowmanCharacter} alt="WindowMan" className="h-8 w-8 object-contain" />
            <span className="font-[var(--font-display)] text-sm font-bold text-white">
              Window<span className="text-[#00D9FF]">Man</span>
            </span>
            <span className="text-[#475569] text-xs font-[var(--font-mono)]">The Truth Engine</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#475569] font-[var(--font-mono)]">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>&copy; 2024 WindowMan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
