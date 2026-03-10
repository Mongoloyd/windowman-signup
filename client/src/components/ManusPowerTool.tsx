/**
 * ManusPowerTool — Demo Scan Flow
 *
 * Stages:
 *   lead_modal → scanning → score_reveal → demo_report
 *
 * LeadModal:   White/cyan Tailwind design (matches site)
 * ScanTerminal: Dark (#0a0f18) — intentional "AI theater" experience
 * ScoreReveal:  Dark — dramatic score countdown animation
 * DemoReport:   Light Tailwind design — mirrors site's Truth Report
 */

import { useState, useEffect, useRef } from "react";
import {
  X, ScanLine, Shield, FileSearch, Scale, FileText, Award,
  AlertTriangle, CheckCircle2, AlertCircle, Upload,
  Phone, Mail, User, ArrowRight, TrendingDown, ChevronRight,
  Clock, Star, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoStage = "lead_modal" | "scanning" | "score_reveal" | "demo_report";
type LeadStep = 1 | 2;
type FindingSeverity = "flag" | "warn" | "ok";
type PillarStatus = "flag" | "warn" | "ok";

interface PillarScore {
  score: number;
  status: PillarStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}

interface Finding {
  severity: FindingSeverity;
  text: string;
}

// ─── Demo Data (Pompano Beach) ────────────────────────────────────────────────

const DEMO = {
  contractor: "Sunshine Windows & Doors LLC",
  location: "Pompano Beach, FL 33060",
  quoteDate: "February 14, 2025",
  totalAmount: "$18,450",
  windows: 12,
  score: 38,
  grade: "D",
  overchargeRange: { low: 4776, high: 6696 },
};

const SCAN_LINES: string[] = [
  "$ initializing forensic scanner v3.0.0...",
  "$ loading Pompano Beach contractor quote...",
  "$ OCR extraction: Sunshine Windows & Doors LLC",
  "$ document parsed: 12 windows @ $18,450",
  "$ cross-referencing Broward County permit requirements...",
  "$ checking wind load certification (HVHZ zone)...",
  "$ ALERT: No Miami-Dade NOA referenced for impact windows",
  "$ analyzing price per window unit...",
  "$ unit price: $1,538 — market avg: $980–$1,140 (HVHZ)",
  "$ pricing delta: +$398–$558 per window",
  "$ scanning warranty terms...",
  "$ WARN: 1-year labor warranty (market standard: 3–5 years)",
  "$ checking fine print for arbitration clauses...",
  "$ FLAG: Mandatory arbitration — no public court access",
  "$ checking contractor license...",
  "$ WARN: General Contractor license — HVHZ install requires specialty cert",
  "$ analyzing scope of work...",
  "$ FLAG: No glass thickness specified (impact glass requires min 9/16\" laminate)",
  "$ running 5-pillar forensic analysis...",
  "$ [PILLAR 1] safety_code_compliance ............ 32/100 FAIL",
  "$ [PILLAR 2] install_scope_clarity ............. 35/100 FAIL",
  "$ [PILLAR 3] price_fairness .................... 28/100 FAIL",
  "$ [PILLAR 4] fine_print_transparency ........... 31/100 FAIL",
  "$ [PILLAR 5] warranty_value .................... 55/100 WARN",
  "$ computing final score...",
  "$ ─────────────────────────────────────────────",
  "$ FORENSIC SCORE: 38/100   GRADE: D",
  "$ ─────────────────────────────────────────────",
  "$ generating Truth Report...",
  "$ done.",
];

const PILLAR_SCORES: Record<string, PillarScore> = {
  safety: { score: 32, status: "flag", label: "Safety & Licensing", icon: Shield, tooltip: "Verifies contractor licenses, insurance, and code compliance." },
  scope: { score: 35, status: "flag", label: "Scope of Work", icon: FileSearch, tooltip: "Checks if work details, materials, brands, and model numbers are specified." },
  price: { score: 28, status: "flag", label: "Price Fairness", icon: Scale, tooltip: "Analyzes pricing against Broward County market rates." },
  fine_print: { score: 31, status: "flag", label: "Fine Print", icon: FileText, tooltip: "Reviews clauses for hidden fees, arbitration, and cancellation penalties." },
  warranty: { score: 55, status: "warn", label: "Warranty", icon: Award, tooltip: "Evaluates warranty duration, coverage, and exclusions." },
};

const FINDINGS: Finding[] = [
  { severity: "flag", text: "No Miami-Dade NOA product approval referenced for hurricane-rated windows" },
  { severity: "flag", text: "Mandatory arbitration clause — waives your right to sue in public court" },
  { severity: "flag", text: "Glass thickness unspecified — minimum 9/16\" laminated required in HVHZ zones" },
  { severity: "warn", text: "Price is $398–$558 over market rate per window ($4,776–$6,696 total overcharge estimate)" },
  { severity: "warn", text: "Only 1-year labor warranty — Florida industry standard is 3–5 years" },
  { severity: "warn", text: "General Contractor license only — HVHZ specialty certification not confirmed" },
  { severity: "ok", text: "Materials described as impact-rated (brand and model number unspecified)" },
  { severity: "ok", text: "Payment schedule is reasonable — 40% down, 60% on completion" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(s: FindingSeverity) {
  if (s === "flag") return "text-rose-700 bg-rose-50 border-rose-200";
  if (s === "warn") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function severityIcon(s: FindingSeverity) {
  if (s === "flag") return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
  if (s === "warn") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
}

function pillarBarColor(status: PillarStatus) {
  if (status === "flag") return "from-rose-500 to-rose-400";
  if (status === "warn") return "from-amber-500 to-amber-400";
  return "from-emerald-500 to-emerald-400";
}

function pillarBadgeClass(status: PillarStatus) {
  if (status === "flag") return "bg-rose-50 text-rose-800 border border-rose-200";
  if (status === "warn") return "bg-amber-50 text-amber-800 border border-amber-200";
  return "bg-emerald-50 text-emerald-800 border border-emerald-200";
}

function gradeTextColor(grade: string) {
  if (grade.startsWith("A") || grade.startsWith("B")) return "text-emerald-700";
  if (grade.startsWith("C")) return "text-amber-700";
  return "text-rose-700";
}

// ─── Sub-component: LeadModal ─────────────────────────────────────────────────

interface LeadModalProps {
  onClose: () => void;
  onSubmit: (name: string, email: string, phone: string) => void;
}

function LeadModal({ onClose, onSubmit }: LeadModalProps) {
  const [step, setStep] = useState<LeadStep>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: wire to real tRPC lead creation endpoint (e.g. analysis.createLeadQualification)
    if (process.env.NODE_ENV === "development") {
      console.log("[ManusPowerTool] Lead captured:", { name, email, phone });
    }
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit(name, email, phone);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(44,62,80,0.25)] border border-cyan-500/15 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 pt-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-white/20">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-mono text-cyan-100 uppercase tracking-widest">AI Demo Scanner</span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-snug">
            See a Real Contractor Quote Get Dissected
          </h2>
          <p className="mt-2 text-sm text-cyan-100">
            We'll scan a real Pompano Beach quote and show you exactly what most homeowners miss.
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "bg-white w-8" : "bg-white/40 w-4"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? "bg-white w-8" : "bg-white/40 w-4"}`} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <p className="text-sm text-slate-500 font-medium mb-4">Step 1 of 2 — Who should we send the full report to?</p>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-slate-400 font-mono">No spam • Unsubscribe anytime</p>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-4">
              <p className="text-sm text-slate-500 font-medium mb-4">Step 2 of 2 — Best number to reach you if you want a free consultation?</p>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Phone Number <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 867-5309"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Trust note */}
              <div className="flex items-start gap-2 rounded-xl bg-cyan-50 border border-cyan-100 px-4 py-3">
                <Clock className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <p className="text-xs text-cyan-700 leading-relaxed">
                  Your demo scan starts immediately. We'll email you the full Truth Report at <span className="font-semibold">{email}</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-60 transition-all duration-300 hover:scale-[1.02] shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting scan...</>
                  ) : (
                    <><ScanLine className="w-4 h-4" /> 🛡️ Start Demo Scan</>
                  )}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 font-mono">Free • No credit card • Results in 60 seconds</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: ScanTerminal ──────────────────────────────────────────────

interface ScanTerminalProps {
  onComplete: () => void;
}

function ScanTerminal({ onComplete }: ScanTerminalProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (indexRef.current >= SCAN_LINES.length) {
        clearInterval(timer);
        setIsDone(true);
        return;
      }
      setVisibleLines((prev) => [...prev, SCAN_LINES[indexRef.current]]);
      indexRef.current += 1;
      // Scroll to bottom
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 120);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance after done + short pause
  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(onComplete, 1200);
    return () => clearTimeout(t);
  }, [isDone, onComplete]);

  const getLineColor = (line: string) => {
    if (line.includes("FLAG:") || line.includes("FAIL")) return "#F87171"; // rose-400
    if (line.includes("WARN:") || line.includes("WARN")) return "#FCD34D"; // amber-300
    if (line.includes("ALERT:")) return "#F87171";
    if (line.includes("SCORE:") || line.includes("GRADE:") || line.includes("─")) return "#22D3EE"; // cyan-400
    if (line.includes("done.")) return "#34D399"; // emerald-400
    return "#94A3B8"; // slate-400
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: "#0a0f18" }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center gap-2 px-6 py-4 border-b"
        style={{ borderColor: "rgba(34,211,238,0.15)", background: "#060b12" }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-400/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
        </div>
        <span className="ml-3 text-xs font-mono text-cyan-400/80 tracking-widest uppercase">
          WindowMan Forensic Scanner v3.0.0 — {DEMO.contractor}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-400/60">SCANNING</span>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-4 font-mono text-sm"
        style={{ scrollBehavior: "smooth" }}
      >
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className="leading-relaxed py-0.5"
            style={{ color: getLineColor(line) }}
          >
            {line}
          </div>
        ))}
        {!isDone && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-cyan-400">$</span>
            <span
              className="inline-block w-2 h-4 bg-cyan-400 animate-pulse"
              style={{ animationDuration: "0.8s" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: ScoreReveal ───────────────────────────────────────────────

interface ScoreRevealProps {
  onComplete: () => void;
}

function ScoreReveal({ onComplete }: ScoreRevealProps) {
  const [displayScore, setDisplayScore] = useState(100);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    // Count down from 100 to final score
    const target = DEMO.score;
    const duration = 1800; // ms
    const steps = 60;
    const stepTime = duration / steps;
    const decrement = (100 - target) / steps;
    let current = 100;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.max(target, Math.round(100 - decrement * step));
      setDisplayScore(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayScore(target);
        setTimeout(() => setIsRevealed(true), 300);
        setTimeout(onComplete, 2800);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  const scoreColor = displayScore >= 70 ? "#34D399" : displayScore >= 50 ? "#FCD34D" : "#F87171";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center"
      style={{ background: "#0a0f18" }}
    >
      {/* Scan glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${scoreColor}15 0%, transparent 70%)`,
        }}
      />

      <div className="relative text-center px-6">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono tracking-widest uppercase"
            style={{ color: "#22D3EE", border: "1px solid rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.05)" }}>
            <ScanLine className="w-3.5 h-3.5" /> Analysis Complete
          </span>
        </div>

        <p className="text-sm font-mono mb-4" style={{ color: "#94A3B8" }}>
          {DEMO.contractor} — {DEMO.location}
        </p>

        {/* Score */}
        <div
          className="text-[9rem] font-black leading-none transition-colors duration-300"
          style={{ color: scoreColor, fontVariantNumeric: "tabular-nums" }}
        >
          {displayScore}
        </div>
        <div className="text-xl font-mono mb-2" style={{ color: "#64748B" }}>out of 100</div>

        {/* Grade reveal */}
        <div
          className={`mt-4 transition-all duration-700 ${isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}
          >
            <span className="text-4xl font-black" style={{ color: "#F87171" }}>Grade D</span>
            <span className="text-sm font-mono" style={{ color: "#94A3B8" }}>— High Risk</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            <span className="font-mono text-sm" style={{ color: "#F87171" }}>
              Est. overcharge: ${DEMO.overchargeRange.low.toLocaleString()}–${DEMO.overchargeRange.high.toLocaleString()}
            </span>
          </div>
          <p className="mt-3 text-xs font-mono" style={{ color: "#475569" }}>
            Generating full Truth Report...
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Surface tokens ───────────────────────────────────────────────────────────

const SURFACE = "rounded-3xl bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15";
const SURFACE_INSET = "rounded-2xl bg-slate-50/80 backdrop-blur-md shadow-inner border border-slate-200/70";

// ─── Sub-component: DemoReport ────────────────────────────────────────────────

interface DemoReportProps {
  name: string;
  onClose: () => void;
  onUploadClick: () => void;
  onConsultClick: () => void;
}

function DemoReport({ name, onClose, onUploadClick, onConsultClick }: DemoReportProps) {
  const pillars = Object.entries(PILLAR_SCORES);

  return (
    <div className="min-h-screen bg-[#FAFBFC] pb-28">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-cyan-500/15 shadow-sm px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ScanLine className="w-5 h-5 text-cyan-600 shrink-0" />
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight italic leading-none">
              Demo Truth Report
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
              SAMPLE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase hidden sm:block">Grade:</span>
              <span className="font-black px-3 py-1 rounded-lg text-base leading-none bg-rose-50 text-rose-800 border border-rose-200">
                {DEMO.grade}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close demo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Welcome banner ── */}
        <div className={SURFACE + " p-5 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.04),transparent_55%)]"}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-100">
              <ScanLine className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {name ? `Hi ${name.split(" ")[0]} — h` : "H"}ere's what our AI found in this Pompano Beach quote
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Contractor: <span className="font-medium text-slate-700">{DEMO.contractor}</span> •{" "}
                Quote: <span className="font-medium text-slate-700">{DEMO.totalAmount}</span> •{" "}
                {DEMO.windows} impact windows • {DEMO.location}
              </p>
            </div>
          </div>
        </div>

        {/* ── Overall score ── */}
        <div className={SURFACE + " p-6 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.04),transparent_55%)]"}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.22em] text-cyan-700 uppercase">Overall Score</div>
              <div className="mt-2 text-5xl font-black text-slate-900">{DEMO.score}</div>
              <div className="mt-1 text-sm text-slate-500">out of 100</div>
            </div>
            <div className={SURFACE_INSET + " px-6 py-4 text-center"}>
              <div className="text-xs font-bold text-slate-500">GRADE</div>
              <div className={`mt-2 text-3xl font-black ${gradeTextColor(DEMO.grade)}`}>{DEMO.grade}</div>
            </div>
          </div>
          <div className="mt-4 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-300/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
              style={{ width: `${DEMO.score}%` }}
            />
          </div>
        </div>

        {/* ── Overcharge estimate ── */}
        <div className={SURFACE + " p-5"}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 shrink-0">
              <TrendingDown className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-black tracking-[0.22em] text-rose-700 uppercase mb-1">Estimated Overcharge</p>
              <p className="text-2xl font-black text-slate-900">
                ${DEMO.overchargeRange.low.toLocaleString()} – ${DEMO.overchargeRange.high.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Based on Broward County market rates for 12 HVHZ impact windows. This homeowner may be paying $398–$558 over fair market value per window.
              </p>
            </div>
          </div>
        </div>

        {/* ── Risk flags strip ── */}
        <div className={SURFACE + " p-4 overflow-x-auto"}>
          <p className="text-[10px] font-bold text-amber-700 uppercase mb-3 tracking-widest">Immediate Risks Detected:</p>
          <div className="flex gap-2 flex-wrap">
            {["No NOA Product Approval", "Mandatory Arbitration", "Glass Spec Missing", "Pricing 29–36% Over Market"].map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold tracking-wide bg-rose-50 text-rose-800 border border-rose-200">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── 5-Pillar breakdown ── */}
        <div className={SURFACE + " p-6"}>
          <p className="text-xs font-black tracking-[0.22em] text-slate-500 uppercase mb-5">5-Pillar Breakdown</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pillars.map(([key, p]) => {
              const Icon = p.icon;
              return (
                <div key={key} className={SURFACE_INSET + " p-4"}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-cyan-600 shrink-0" />
                      <span className="text-sm font-black text-slate-900">{p.label}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-wide ${pillarBadgeClass(p.status)}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden border border-slate-300/60">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${pillarBarColor(p.status)}`}
                        style={{ width: `${p.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-600 w-8 text-right">{p.score}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{p.tooltip}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Findings ── */}
        <div className={SURFACE + " p-6"}>
          <p className="text-xs font-black tracking-[0.22em] text-slate-500 uppercase mb-5">Detailed Findings</p>
          <div className="space-y-3">
            {FINDINGS.map((finding, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-4 ${severityColor(finding.severity)}`}
              >
                {severityIcon(finding.severity)}
                <p className="text-sm leading-relaxed">{finding.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── What to do next ── */}
        <div className={SURFACE + " p-6"}>
          <p className="text-xs font-black tracking-[0.22em] text-slate-500 uppercase mb-4">What To Do Next</p>
          <div className="space-y-3">
            {[
              { step: "1", text: "Ask your contractor for the Miami-Dade NOA product approval number before signing anything." },
              { step: "2", text: "Request a detailed scope with glass thickness (min 9/16\" laminated), brand, and model for each window." },
              { step: "3", text: "Negotiate the per-window price down — you have $4,776–$6,696 of room based on market data." },
              { step: "4", text: "Strike the mandatory arbitration clause or walk away — this protects the contractor, not you." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Demo disclaimer ── */}
        <div className="rounded-2xl bg-slate-100 border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">This is a demo scan</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            This report is based on a real Pompano Beach window replacement quote used for illustration. Upload your own quote to get a personalized forensic analysis with real contractor data specific to your project.
          </p>
        </div>
      </main>

      {/* ── Sticky bottom CTA bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-xl border-t border-cyan-500/15 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">Ready to scan your own quote?</p>
            <p className="text-xs text-slate-500 mt-0.5">Get your personalized Truth Report in 60 seconds — free.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onConsultClick}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm text-cyan-700 border border-cyan-300 bg-white hover:bg-cyan-50 transition-all"
            >
              Free Consultation
            </button>
            <button
              onClick={onUploadClick}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-all duration-300 hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4" />
              Upload My Quote
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component: ManusPowerTool ──────────────────────────────────────────

interface ManusPowerToolProps {
  onClose: () => void;
  onUploadClick: () => void;
  onConsultClick: () => void;
}

export function ManusPowerTool({ onClose, onUploadClick, onConsultClick }: ManusPowerToolProps) {
  const [stage, setStage] = useState<DemoStage>("lead_modal");
  const [leadName, setLeadName] = useState("");

  const handleLeadSubmit = (name: string, _email: string, _phone: string) => {
    setLeadName(name);
    setStage("scanning");
  };

  const handleScanComplete = () => {
    setStage("score_reveal");
  };

  const handleScoreComplete = () => {
    setStage("demo_report");
  };

  return (
    <>
      {stage === "lead_modal" && (
        <LeadModal onClose={onClose} onSubmit={handleLeadSubmit} />
      )}
      {stage === "scanning" && (
        <ScanTerminal onComplete={handleScanComplete} />
      )}
      {stage === "score_reveal" && (
        <ScoreReveal onComplete={handleScoreComplete} />
      )}
      {stage === "demo_report" && (
        <DemoReport
          name={leadName}
          onClose={onClose}
          onUploadClick={onUploadClick}
          onConsultClick={onConsultClick}
        />
      )}
    </>
  );
}
