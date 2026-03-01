export function ScanLine() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div
        className="absolute left-0 right-0 h-[2px] animate-scan-line"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,217,255,0.3), rgba(0,217,255,0.6), rgba(0,217,255,0.3), transparent)",
          boxShadow: "0 0 15px rgba(0,217,255,0.3), 0 0 30px rgba(0,217,255,0.1)",
        }}
      />
    </div>
  );
}
