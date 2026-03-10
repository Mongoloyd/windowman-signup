/**
 * WindowMan Upload Zone — Full Verified Funnel State Machine
 *
 * States:
 *   idle → uploading → analyzing → email_gate → email_sent
 *   → partial_preview → otp_gate → full_analysis | purged
 *
 * Security: Full analysis JSON is NEVER rendered before phone OTP verified.
 * The server enforces this; the frontend simply doesn't request it until then.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, Shield, FileSearch, Scale, Award,
  CheckCircle2, AlertTriangle, Mail, Phone, Loader2,
  RefreshCw, ArrowLeft, Lock, Unlock, ChevronRight, AlertCircle,
  CloudUpload, Camera, ScanLine, ArrowRight
} from "lucide-react";
import { ManusPowerTool } from "@/components/ManusPowerTool";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useInView } from "@/hooks/useInView";
import { FloatingChip } from "@/components/FloatingChip";
import { firePhoneVerifiedConversion, hashPii } from "@/lib/pixels";
import QuoteRevealGate from "@/components/analysis/QuoteRevealGate";
import AnalysisReport from "@/pages/analysis-report";

// ─── Types ───────────────────────────────────────────────────────────────────

type FunnelState =
  | "idle"
  | "uploading"
  | "analyzing"
  | "email_gate"
  | "email_sent"
  | "partial_preview"
  | "otp_gate"
  | "full_analysis"
  | "purged"
  | "not_a_quote";

interface PreviewData {
  score: number | null;
  grade: string | null;
  findings: string[] | null;
  pillarStatuses: Record<string, string> | null;
}

interface AnalysisData {
  analysisId: string;
  tempSessionId: string;
  leadId?: string;
  preview?: PreviewData | null;
  fullAnalysis?: Record<string, unknown> | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLAR_CONFIG = [
  { key: "safety_code", icon: Shield, label: "Safety & Code Match" },
  { key: "install_scope", icon: FileSearch, label: "Install & Scope Clarity" },
  { key: "price_fairness", icon: Scale, label: "Price Fairness" },
  { key: "fine_print", icon: FileText, label: "Fine Print Transparency" },
  { key: "warranty", icon: Award, label: "Warranty Value" },
];

const SCANNING_MESSAGES = [
  "Extracting contract DNA...",
  "Cross-referencing county pricing data...",
  "Checking wind load specifications...",
  "Analyzing fine print clauses...",
  "Calculating overcharge risk...",
];

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_MB = 10;

// ─── OTP Input ────────────────────────────────────────────────────────────────

function OTPInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled?: boolean }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const d = [...digits];
    d[i] = v.slice(-1);
    setDigits(d);
    if (v && i < 5) refs.current[i + 1]?.focus();
    const code = d.join("");
    if (code.length === 6) onComplete(code);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) {
      setDigits(p.split(""));
      onComplete(p);
    }
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 text-slate-900 focus:outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            background: d ? "rgba(8,145,178,0.05)" : "white",
            borderColor: d ? "#0891B2" : "#CBD5E1",
            boxShadow: d ? "0 0 12px rgba(8,145,178,0.15)" : "none",
            fontFamily: "var(--font-mono)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Pillar Row ───────────────────────────────────────────────────────────────

function PillarRow({ pillar, status, isScanning }: {
  pillar: typeof PILLAR_CONFIG[0];
  status?: string;
  isScanning?: boolean;
}) {
  const Icon = pillar.icon;
  const getStatusDisplay = () => {
    if (isScanning) return { icon: <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />, label: "Checking...", color: "#0891B2" };
    if (status === "pass") return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, label: "Pass", color: "#10B981" };
    if (status === "warn") return { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, label: "Warning", color: "#F59E0B" };
    if (status === "fail") return { icon: <AlertCircle className="w-4 h-4 text-rose-500" />, label: "Flag", color: "#EF4444" };
    return { icon: <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />, label: "Checking...", color: "#0891B2" };
  };

  const { icon: statusIcon, label, color } = getStatusDisplay();

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/60 border border-cyan-500/15">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-cyan-600 shrink-0" />
        <span className="text-sm text-slate-700 font-medium">{pillar.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="text-xs font-mono" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UploadZone() {
  const { ref, isInView } = useInView(0.1);
  const [state, setState] = useState<FunnelState>("idle");
  const [showDemo, setShowDemo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [email, setEmail] = useState("");
  const [honeypotEmail, setHoneypotEmail] = useState(""); // Flow A honeypot — must stay empty
  const [phone, setPhone] = useState("");
  const [e164Phone, setE164Phone] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Scanning animation cycle
  useEffect(() => {
    if (state !== "analyzing") return;
    const t = setInterval(() => setScanStep((s) => (s + 1) % SCANNING_MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, [state]);

  // ── tRPC mutations ──────────────────────────────────────────────────────────

  // ── Pipeline status polling ──────────────────────────────────────────────────
  const utils = trpc.useUtils();
  useEffect(() => {
    if (state !== "analyzing" || !analysisData?.analysisId) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await utils.analysis.getStatus.fetch({ analysisId: analysisData.analysisId });
        if (cancelled) return;
        if (result.status === "processing") {
          setTimeout(poll, 3000);
        } else if (result.status === "failed") {
          if (result.errorCode === "NOT_A_QUOTE") {
            setState("not_a_quote");
          } else {
            toast.error("Analysis failed. Please try again.");
            setState("idle");
          }
        } else {
          setState("email_gate");
        }
      } catch {
        if (!cancelled) {
          setTimeout(() => { if (!cancelled) setState("email_gate"); }, 2000);
        }
      }
    };
    const t = setTimeout(poll, 3000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [state, analysisData?.analysisId, utils.analysis.getStatus]);

  const uploadMutation = trpc.analysis.upload.useMutation({
    onSuccess: (data) => {
      setAnalysisData({ analysisId: data.analysisId, tempSessionId: data.tempSessionId });
      setState("analyzing");
    },
    onError: (err) => {
      const isNotAQuote =
        err.message?.includes("NOT_A_QUOTE") ||
        (err.data as { code?: string } | undefined)?.code === "NOT_A_QUOTE" ||
        err.message?.toLowerCase().includes("not a window") ||
        err.message?.toLowerCase().includes("not a quote");
      if (isNotAQuote) {
        setState("not_a_quote");
        return;
      }
      toast.error(err.message || "Upload failed. Please try again.");
      setState("idle");
    },
  });

  const requestEmailMutation = trpc.analysis.requestEmailVerification.useMutation({
    onSuccess: () => setState("email_sent"),
    onError: (err) => toast.error(err.message || "Failed to send verification email."),
  });

  const lookupMutation = trpc.analysis.lookupPhone.useMutation({
    onSuccess: (data) => {
      setE164Phone(data.e164);
      sendPhoneOTPMutation.mutate({ leadId: analysisData?.leadId ?? "", phone: data.e164 });
    },
    onError: (err) => toast.error(err.message || "Unable to verify phone number."),
  });

  const sendPhoneOTPMutation = trpc.analysis.sendPhoneOTP.useMutation({
    onSuccess: () => {
      setState("otp_gate");
      setResendCooldown(30);
    },
    onError: (err) => toast.error(err.message || "Failed to send code."),
  });

  const verifyPhoneOTPMutation = trpc.analysis.verifyPhoneOTP.useMutation({
    onSuccess: async (data) => {
      setAnalysisData((prev) => prev ? { ...prev, fullAnalysis: data.fullAnalysis as Record<string, unknown> } : prev);
      setState("full_analysis");
      try {
        const [hashedEmail, hashedPhone] = await Promise.all([
          email ? hashPii(email) : Promise.resolve(undefined),
          e164Phone ? hashPii(e164Phone) : Promise.resolve(undefined),
        ]);
        firePhoneVerifiedConversion(
          { em: hashedEmail, ph: hashedPhone, leadId: data.leadId, eventId: crypto.randomUUID() },
          { isFraud: data.isFraud }
        );
      } catch {
        // Pixel fires are non-critical
      }
    },
    onError: (err) => toast.error(err.message || "Incorrect code. Please try again."),
  });

  // ── File handling ───────────────────────────────────────────────────────────

  const processFile = useCallback(async (f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Please upload a PDF, PNG, JPG, or WebP file.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setState("uploading");
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      uploadMutation.mutate({ fileName: f.name, mimeType: f.type, fileSizeBytes: f.size, fileBase64: base64 });
    };
    reader.readAsDataURL(f);
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleEmailSubmit = () => {
    if (!email.trim() || !analysisData) return;
    requestEmailMutation.mutate({ email: email.trim(), tempSessionId: analysisData.tempSessionId, origin: window.location.origin, honeypot: honeypotEmail || undefined });
  };

  const handlePhoneSubmit = () => {
    if (!phone.trim() || !analysisData?.leadId) return;
    lookupMutation.mutate({ phone });
  };

  const handleOTPComplete = (code: string) => {
    if (!analysisData?.leadId || !analysisData?.analysisId || !e164Phone) return;
    verifyPhoneOTPMutation.mutate({ leadId: analysisData.leadId, analysisId: analysisData.analysisId, phone: e164Phone, code });
  };

  const handleResendOTP = () => {
    if (resendCooldown > 0 || !e164Phone || !analysisData?.leadId) return;
    sendPhoneOTPMutation.mutate({ leadId: analysisData.leadId, phone: e164Phone });
    setResendCooldown(30);
  };

  const isPhoneLoading = lookupMutation.isPending || sendPhoneOTPMutation.isPending;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <section ref={ref} id="upload-zone" className="relative py-24 overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(8,145,178,0.2), transparent)" }} />

      <div className="relative z-10 container max-w-5xl">
        {/* Section label */}
        <div className={`flex items-center gap-2 mb-4 transition-all duration-600 ${isInView ? "opacity-100" : "opacity-0"}`}>
          <Upload className="w-4 h-4 text-cyan-600" />
          <span className="font-mono text-xs text-cyan-600 uppercase tracking-widest">The Decision Point</span>
        </div>

        <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 mb-12 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          Ready to See the Truth?
        </h2>

        {/* ── STATE: idle ── */}
        {state === "idle" && (
          <div className={`grid grid-cols-1 lg:grid-cols-5 gap-6 transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* LEFT: Upload Zone (3 cols - dominant) */}
            <div className="lg:col-span-3">
              <div
                className="relative rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer"
                style={{
                  background: dragOver ? "rgba(8,145,178,0.05)" : "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(20px)",
                  border: `2px dashed ${dragOver ? "#0891B2" : "rgba(8,145,178,0.25)"}`,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  transform: dragOver ? "scale(1.02)" : "scale(1)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileInput} />
                <FloatingChip distance={6} duration={3} delay={0}>
                  <CloudUpload className="w-16 h-16 text-cyan-600 mx-auto mb-6 opacity-60" />
                </FloatingChip>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Have Your Quote Ready?</h3>
                <p className="text-slate-700 mb-8">Let's analyze it. Drop your quote here or click to upload.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-all duration-300 hover:scale-105 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]"
                  >
                    <FileText className="w-4 h-4" />
                    Upload PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-cyan-700 border border-cyan-300 bg-white/70 hover:bg-white transition-all duration-300"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                </div>
                <p className="text-xs text-slate-700 font-mono">PDF, JPG, PNG, WebP • Max 10MB</p>
              </div>
            </div>

            {/* RIGHT: Demo Scan CTA (2 cols) */}
            <div className={`lg:col-span-2 transition-all duration-700 delay-400 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <div
                className="rounded-3xl p-8 h-full flex flex-col justify-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15"
              >
                <ScanLine className="w-10 h-10 text-cyan-600 mb-6 opacity-70" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Don't Have Your Quote?</h3>
                <p className="text-slate-700 text-sm mb-6 leading-relaxed">
                  See what our AI uncovers in a real contractor quote — a live demo scan of a Pompano Beach window job.
                </p>
                <button
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => setShowDemo(true)}
                >
                  🛡️ View a Demo Scan
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-slate-700 font-mono mt-4 text-center">Free • No credit card required</p>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE: uploading ── */}
        {state === "uploading" && (
          <div className="rounded-3xl border border-cyan-500/15 p-12 text-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)]">
            <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-900 font-semibold text-lg mb-2">Uploading your quote...</p>
            <p className="text-slate-700 text-sm">{file?.name}</p>
          </div>
        )}

        {/* ── STATE: not_a_quote ── */}
        {state === "not_a_quote" && (
          <div className="rounded-3xl p-10 text-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-slate-900 font-bold text-xl mb-3">That doesn't look like a quote</h3>
            <p className="text-slate-800 text-base mb-2">
              Upload a window or door quote or contract.
            </p>
            <p className="text-slate-700 text-sm mb-8 font-mono">
              We analyze window &amp; door replacement quotes only — PDFs, photos, or scans of contractor estimates.
            </p>
            <button
              onClick={() => { setState("idle"); setFile(null); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-all duration-300 hover:scale-105 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]"
            >
              <RefreshCw className="w-4 h-4" />
              Try a Different File
            </button>
          </div>
        )}

        {/* ── STATE: analyzing ── */}
        {state === "analyzing" && (
          <div className="rounded-3xl p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-cyan-50 border border-cyan-200">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-cyan-700 text-xs font-mono tracking-wider">AI SCANNING</span>
              </div>
              <h3 className="text-slate-900 font-bold text-xl mb-2">Analyzing your quote...</h3>
              <p className="text-slate-700 text-sm font-mono">{SCANNING_MESSAGES[scanStep]}</p>
            </div>
            <div className="space-y-2">
              {PILLAR_CONFIG.map((pillar, i) => (
                <PillarRow key={pillar.key} pillar={pillar} isScanning={i <= scanStep} />
              ))}
            </div>
          </div>
        )}

        {/* ── STATE: email_gate ── */}
        {state === "email_gate" && (
          <div className="rounded-3xl p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-200">
            {/* Blurred teaser */}
            <div className="relative mb-8">
              <div className="rounded-xl p-6 blur-sm select-none pointer-events-none bg-white/60 border border-cyan-500/15">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 w-24 rounded bg-slate-300" />
                  <div className="h-10 w-16 rounded-lg bg-cyan-100" />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-slate-100" />
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="rounded-xl px-6 py-4 text-center bg-white shadow-lg border border-cyan-200">
                  <Lock className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
                  <p className="text-slate-900 font-semibold text-sm">Analysis complete — verify to unlock</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-slate-900 font-bold text-xl mb-2">Your analysis is ready.</h3>
              <p className="text-slate-700 text-sm">Enter your email to receive a secure link to your results.</p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              {/* Honeypot field — CSS hidden, must stay empty for real users */}
              <input
                type="text"
                name="website"
                value={honeypotEmail}
                onChange={(e) => setHoneypotEmail(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden", opacity: 0 }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl text-slate-900 placeholder-slate-500 bg-white border border-cyan-500/15 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors text-sm"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={!email.trim() || requestEmailMutation.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {requestEmailMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send My Secure Link</>
                )}
              </button>
              <p className="text-center text-slate-700 text-xs">One-click verification link. No password required.</p>
            </div>
          </div>
        )}

        {/* ── STATE: email_sent ── */}
        {state === "email_sent" && (
          <div className="rounded-3xl p-10 text-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-500/15">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-emerald-50 border border-emerald-200">
              <Mail className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-slate-900 font-bold text-xl mb-3">Check your inbox</h3>
            <p className="text-slate-800 text-sm mb-2">
              We sent a secure link to <strong className="text-slate-900">{email}</strong>
            </p>
            <p className="text-slate-700 text-xs mb-6">The link expires in 6 hours. Check your spam folder if you don't see it.</p>
            <button onClick={() => setState("email_gate")} className="text-cyan-600 text-sm hover:underline flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-3 h-3" /> Use a different email
            </button>
          </div>
        )}

        {/* ── STATE: partial_preview ── */}
        {state === "partial_preview" && analysisData?.preview && (
          <div className="space-y-6">
            <div className="rounded-3xl p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-slate-700 text-sm mb-1">Overall Score</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-slate-900 font-mono">{analysisData.preview.score ?? "--"}</span>
                    <span className="text-slate-700 text-lg">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-700 text-sm mb-1">Grade</p>
                  <span className="text-4xl font-bold text-cyan-600 font-mono">{analysisData.preview.grade ?? "--"}</span>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {PILLAR_CONFIG.map((pillar) => (
                  <PillarRow key={pillar.key} pillar={pillar} status={analysisData.preview?.pillarStatuses?.[pillar.key]} />
                ))}
              </div>
              {Array.isArray(analysisData.preview.findings) && analysisData.preview.findings.length > 0 && (
                <div className="rounded-xl p-4 bg-white/60 border border-cyan-500/15">
                  <p className="text-slate-700 text-xs font-mono uppercase tracking-wider mb-3">Key Findings</p>
                  <ul className="space-y-2">
                    {analysisData.preview.findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <ChevronRight className="w-3 h-3 text-cyan-600 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Phone gate */}
            <div className="rounded-3xl p-8 bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-50 border border-cyan-200">
                  <Lock className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-slate-900 font-semibold">Unlock Full Analysis</p>
                  <p className="text-slate-700 text-xs">Verify your phone to see exact dollar amounts and line-item breakdowns.</p>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                  placeholder="(561) 555-0100"
                  className="w-full px-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 bg-white border border-cyan-500/15 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-colors text-sm"
                />
                <button
                  onClick={handlePhoneSubmit}
                  disabled={!phone.trim() || isPhoneLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPhoneLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><Phone className="w-4 h-4" /> Send Verification Code</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE: otp_gate ── */}
        {state === "otp_gate" && (
          <div className="rounded-3xl p-8 text-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-cyan-200">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-cyan-50 border border-cyan-200">
              <Phone className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="text-slate-900 font-bold text-xl mb-2">Enter verification code</h3>
            <p className="text-slate-800 text-sm mb-1">
              We sent a 6-digit code to <strong className="text-slate-900">{e164Phone}</strong>
            </p>
            <button
              onClick={() => { setState("partial_preview"); setPhone(""); setE164Phone(""); }}
              className="text-cyan-600 text-xs hover:underline mb-6 inline-block"
            >
              Wrong number? Edit
            </button>
            <div className="mb-6">
              <OTPInput onComplete={handleOTPComplete} disabled={verifyPhoneOTPMutation.isPending} />
            </div>
            {verifyPhoneOTPMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-slate-700 text-sm mb-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </div>
            )}
            <button
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 || sendPhoneOTPMutation.isPending}
              className="text-slate-700 text-sm hover:text-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        )}

        {/* ── STATE: full_analysis ── */}
        {state === "full_analysis" && analysisData?.analysisId && (
          analysisData?.fullAnalysis ? (
            <QuoteRevealGate
              scanId={analysisData.analysisId}
              scored={(analysisData.fullAnalysis as any).scored ?? analysisData.fullAnalysis}
            >
              <AnalysisReport
                signals={(analysisData.fullAnalysis as any).signals}
                scored={(analysisData.fullAnalysis as any).scored}
              />
            </QuoteRevealGate>
          ) : (
            <div className="rounded-3xl p-8 bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3">
                <Unlock className="w-5 h-5 text-emerald-500" />
                <p className="text-emerald-700 font-semibold text-sm">Full Analysis Unlocked</p>
              </div>
            </div>
          )
        )}

        {/* ── STATE: purged ── */}
        {state === "purged" && (
          <div className="rounded-3xl p-10 text-center bg-white/80 backdrop-blur-[24px] shadow-[0_25px_50px_-12px_rgba(44,62,80,0.10)] border border-amber-200">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-slate-900 font-bold text-xl mb-2">Upload expired</h3>
            <p className="text-slate-700 text-sm mb-6">Your temporary file was removed after 6 hours. Please re-upload your quote to continue.</p>
            <button
              onClick={() => { setState("idle"); setFile(null); setAnalysisData(null); setEmail(""); setPhone(""); }}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)] transition-colors shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]"
            >
              Re-upload Quote
            </button>
          </div>
        )}
      </div>

      {/* ── Demo Scan Overlay ── */}
      {showDemo && (
        <ManusPowerTool
          onClose={() => setShowDemo(false)}
          onUploadClick={() => {
            setShowDemo(false);
            document.getElementById("upload-zone")?.scrollIntoView({ behavior: "smooth" });
          }}
          onConsultClick={() => {
            setShowDemo(false);
            document.getElementById("qualification-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}
    </section>
  );
}
