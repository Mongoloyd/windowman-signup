import React from "react";

interface WMSectionProps {
  children: React.ReactNode;
  blend?: boolean;
  className?: string;
}

export function WMSection({
  children,
  blend = false,
  className = "",
}: WMSectionProps) {
  return (
    <section className={`relative py-16 sm:py-20 lg:py-24 ${className}`}>
      {blend && (
        <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-sm border-y border-cyan-500/5" />
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
