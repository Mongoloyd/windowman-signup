import { useEffect, useState } from "react";

interface ScanLineProps {
  variant?: "dark" | "light";
}

export function ScanLine({ variant = "dark" }: ScanLineProps) {
  const isLight = variant === "light";
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // If reduced motion is preferred, render a static line
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background: isLight
              ? "linear-gradient(90deg, transparent, rgba(34,211,238,0.2), rgba(34,211,238,0.3), rgba(34,211,238,0.2), transparent)"
              : "linear-gradient(90deg, transparent, rgba(0,217,255,0.2), rgba(0,217,255,0.4), rgba(0,217,255,0.2), transparent)",
            boxShadow: isLight
              ? "0 0 12px rgba(34,211,238,0.1)"
              : "0 0 15px rgba(0,217,255,0.3), 0 0 30px rgba(0,217,255,0.1)",
          }}
        />
      </div>
    );
  }

  // Animated scan line
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div
        className="absolute left-0 right-0 h-px animate-scan-line"
        style={{
          background: isLight
            ? "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), rgba(34,211,238,0.5), rgba(34,211,238,0.3), transparent)"
            : "linear-gradient(90deg, transparent, rgba(0,217,255,0.3), rgba(0,217,255,0.6), rgba(0,217,255,0.3), transparent)",
          boxShadow: isLight
            ? "0 0 12px rgba(34,211,238,0.15), 0 0 24px rgba(34,211,238,0.08)"
            : "0 0 15px rgba(0,217,255,0.3), 0 0 30px rgba(0,217,255,0.1)",
        }}
      />
    </div>
  );
}
