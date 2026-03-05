/**
 * /analysis/preview
 *
 * The landing page after a user clicks their magic link email.
 * Shows the partial preview (score, grade, pillar statuses, 2-3 generic findings)
 * with a phone OTP gate overlay to unlock the full analysis.
 *
 * URL params:
 *   ?id=<analysisId>   — the analysis to preview
 *   ?lead=<leadId>     — the verified lead
 *   ?noanalysis=1      — Flow B (no quote uploaded, just email verified)
 *
 * Security: Full JSON is never rendered here. The phone OTP gate
 * triggers verifyPhoneOTP which returns fullAnalysis only on success.
 */

import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Shield, FileSearch, Scale, FileText, Award,
  CheckCircle2, AlertTriangle, AlertCircle,
  Phone, Loader2, RefreshCw, ArrowLeft, Lock,
  Unlock, Star, TrendingDown, ChevronRight, ExternalLink,
  Clock, AlertOctagon
} from "lucide-react";
import { useOtpCooldown } from "@/hooks/useOtpCooldown";
import { firePhoneVerifiedConversion, hashPii } from "@/lib/pixels";
import QuoteRevealGate from "@/components/analysis/QuoteRevealGate";
import AnalysisReport from "@/pages/analysis-report";
import type { ScoredResult } from "@shared/scoredTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState = "loading" | "preview" | "otp_gate" | "full_analysis" | "no_analysis" | "error";

interface PillarResult {
  key: string;
  label: string;
  score: number;
  status: string;
  detail: string;
}

interface FullAnalysis {
  score: number;
  grade: string;
  pillars: PillarResult[];
  fileName?: string;
  analyzedAt?: string;
  overchargeEstimate?: { low: number; high: number; currency: string };
  recommendations?: string[];
  /** Raw fields from fullJson — used by QuoteAnalysisTheater + AnalysisReport */
  signals?: Record<string, unknown>;
  scored?: ScoredResult;
  forensic?: Record<string, unknown>;
  identity?: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLAR_CONFIG = [
  { key: "safety_code", icon: Shield, label: "Safety & Code Match" },
  { key: "install_scope", icon: FileSearch, label: "Install & Scope Clarity" },
  { key: "price_fairness", icon: Scale, label: "Price Fairness" },
  { key: "fine_print", icon: FileText, label: "Fine Print Transparency" },
  { key: "warranty", icon: Award, label: "Warranty Value" },
];

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#00D9FF",
  C: "#fbbf24",
  D: "#f87171",
  F: "#ef4444",
};

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
          className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-white/5 border-2 text-white focus:outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            borderColor: d ? "#00D9FF" : "rgba(255,255,255,0.12)",
            boxShadow: d ? "0 0 12px rgba(0,217,255,0.3)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Pillar Card ──────────────────────────────────────────────────────────────

function PillarCard({ pillar, status, score, detail, locked }: {
  pillar: typeof PILLAR_CONFIG[0];
  status?: string;
  score?: number;
  detail?: string;
  locked?: boolean;
}) {
  const Icon = pillar.icon;

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pass: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, label: "Pass", color: "#34d399", bg: "rgba(52,211,153,0.08)" },
    warn: { icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, label: "Warning", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
    fail: { icon: <AlertCircle className="w-4 h-4 text-red-400" />, label: "Flag", color: "#f87171", bg: "rgba(248,113,113,0.08)" },
  };

  const cfg = status ? statusConfig[status] ?? null : null;

  return (
    <div
      className="rounded-xl p-4 border transition-all duration-300"
      style={{
        background: locked ? "rgba(15,20,25,0.6)" : (cfg?.bg ?? "rgba(15,20,25,0.6)"),
        borderColor: locked ? "rgba(255,255,255,0.06)" : (cfg ? `${cfg.color}33` : "rgba(255,255,255,0.06)"),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0" style={{ color: locked ? "rgba(255,255,255,0.3)" : "#00D9FF" }} />
          <span className="text-sm font-semibold" style={{ color: locked ? "rgba(255,255,255,0.3)" : "white" }}>
            {pillar.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="w-3 h-3 text-slate-600" />
          ) : (
            <>
              {cfg?.icon as React.ReactNode}
              <span className="text-xs font-mono font-bold" style={{ color: cfg?.color }}>{cfg?.label}</span>
              {score !== undefined && (
                <span className="text-xs font-mono text-slate-500 ml-1">{score}/100</span>
              )}
            </>
          )}
        </div>
      </div>
      {!locked && detail && (
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{detail}</p>
      )}
      {locked && (
        <div className="h-3 rounded bg-white/5 mt-1" />
      )}
    </div>
  );
}

// ─── Grade Badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade, score, size = "lg" }: { grade: string; score: number; size?: "sm" | "lg" }) {
  const color = GRADE_COLORS[grade] ?? "#00D9FF";
  const isLg = size === "lg";

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${isLg ? "w-24 h-24 text-5xl" : "w-16 h-16 text-3xl"} rounded-2xl flex items-center justify-center font-black border-2`}
        style={{
          background: `${color}15`,
          borderColor: `${color}60`,
          color,
          boxShadow: `0 0 30px ${color}30`,
        }}
      >
        {grade}
      </div>
      <div>
        <div className={`${isLg ? "text-4xl" : "text-2xl"} font-black text-white`}>
          {score}<span className="text-slate-400 text-lg">/100</span>
        </div>
        <div className="text-sm text-slate-400 mt-1">Overall Score</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalysisPreview() {
  const [, navigate] = useLocation();

  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  const analysisId = params.get("id");
  const leadId = params.get("lead");
  const noAnalysis = params.get("noanalysis") === "1";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [phone, setPhone] = useState("");
  const [e164Phone, setE164Phone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const otpCooldown = useOtpCooldown();
  const sendCodeCooldown = useOtpCooldown(); // separate instance for the Send Code / phone lookup path

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── tRPC: Load preview data ─────────────────────────────────────────────────
  const { data: previewData, isLoading: previewLoading, error: previewError } = trpc.analysis.getPreview.useQuery(
    { analysisId: analysisId! },
    {
      enabled: !!analysisId && !noAnalysis,
      retry: false,
    }
  );

  useEffect(() => {
    if (noAnalysis) {
      setPageState("no_analysis");
      return;
    }
    // Guard: no analysisId in URL — show a clear error instead of spinning forever
    if (!analysisId) {
      setErrorMessage("No analysis ID found. Please use the link from your verification email, or upload a quote from the home page.");
      setPageState("error");
      return;
    }
    if (previewLoading) {
      setPageState("loading");
      return;
    }
    if (previewError) {
      // UNAUTHORIZED means the email session cookie is missing or expired
      if (previewError.data?.code === "UNAUTHORIZED") {
        setErrorMessage("Your verification session has expired. Please re-upload your quote and verify your email again.");
      } else {
        setErrorMessage(previewError.message || "Analysis not found.");
      }
      setPageState("error");
      return;
    }
    if (previewData) {
      if (previewData.isFullUnlocked) {
        // Already fully unlocked (return visit with phone-verified session)
        setPageState("full_analysis");
      } else {
        setPageState("preview");
      }
      return;
    }
    // Query is done (not loading, no error, no data) — analysis not found
    if (!previewLoading && !previewError && !previewData) {
      setErrorMessage("Analysis not found or has expired. Please upload your quote again.");
      setPageState("error");
    }
  }, [previewData, previewLoading, previewError, noAnalysis, analysisId]);

  // ── tRPC mutations ──────────────────────────────────────────────────────────

  // Helper to extract backoff data from any tRPC error
  const extractBackoff = (err: unknown) => {
    const data = (err as { data?: { backoff?: { cooldownRemainingMs?: number; captchaRequired?: boolean } } }).data;
    return {
      cooldownMs: data?.backoff?.cooldownRemainingMs ?? 0,
      captcha: data?.backoff?.captchaRequired ?? false,
    };
  };

  const lookupMutation = trpc.analysis.lookupPhone.useMutation({
    onSuccess: (data) => {
      setE164Phone(data.e164);
      sendOTPMutation.mutate({ leadId: leadId!, phone: data.e164 });
    },
    onError: (err) => {
      const { cooldownMs, captcha } = extractBackoff(err);
      if (cooldownMs > 0) {
        sendCodeCooldown.startCooldown(cooldownMs, captcha);
      } else {
        toast.error(err.message || "Unable to verify phone number.");
      }
    },
  });

  const sendOTPMutation = trpc.analysis.sendPhoneOTP.useMutation({
    onSuccess: () => {
      sendCodeCooldown.clearCooldown();
      setPageState("otp_gate");
      setResendCooldown(30);
    },
    onError: (err) => {
      const { cooldownMs, captcha } = extractBackoff(err);
      if (cooldownMs > 0) {
        sendCodeCooldown.startCooldown(cooldownMs, captcha);
      } else {
        toast.error(err.message || "Failed to send code.");
      }
    },
  });

  const verifyOTPMutation = trpc.analysis.verifyPhoneOTP.useMutation({
    onSuccess: async (data) => {
      otpCooldown.clearCooldown();
      setFullAnalysis(data.fullAnalysis as unknown as FullAnalysis);
      setPageState("full_analysis");
      toast.success("Phone verified! Full analysis unlocked.");
      // Fire conversion pixels — guarded by isFraud flag from server
      try {
        const hashedPhone = e164Phone ? await hashPii(e164Phone) : undefined;
        firePhoneVerifiedConversion(
          { ph: hashedPhone, leadId: data.leadId, eventId: crypto.randomUUID() },
          { isFraud: data.isFraud }
        );
      } catch {
        // Pixel fires are non-critical — never block the UX
      }
    },
    onError: (err) => {
      // Extract progressive backoff data from the custom errorFormatter (server/_core/trpc.ts)
      // The formatter forwards cause.cooldownRemainingMs and cause.captchaRequired into err.data.backoff
      const backoff = (err.data as { backoff?: { cooldownRemainingMs?: number; captchaRequired?: boolean } } | undefined)?.backoff;
      const cooldownMs = backoff?.cooldownRemainingMs ?? 0;
      const captcha = backoff?.captchaRequired ?? false;
      if (cooldownMs > 0) {
        otpCooldown.startCooldown(cooldownMs, captcha);
      }
      // Don't toast when countdown is shown — the inline UI provides the feedback
      if (cooldownMs === 0) {
        toast.error(err.message || "Incorrect code. Please try again.");
      }
    },
  });

  const handlePhoneSubmit = () => {
    if (!phone.trim() || !leadId) return;
    lookupMutation.mutate({ phone });
  };

  const handleOTPComplete = (code: string) => {
    if (!leadId || !analysisId || !e164Phone) return;
    verifyOTPMutation.mutate({ leadId, analysisId, phone: e164Phone, code });
  };

  const handleResendOTP = () => {
    if (resendCooldown > 0 || !e164Phone || !leadId) return;
    sendOTPMutation.mutate({ leadId, phone: e164Phone });
    setResendCooldown(30);
  };

  const isPhoneLoading = lookupMutation.isPending || sendOTPMutation.isPending;
  const isSendCodeBlocked = sendCodeCooldown.isBlocked;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0F1419] text-white" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header className="border-b border-white/6 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to WindowMan
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400">Email Verified</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* ── STATE: loading ── */}
        {pageState === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-[#00D9FF] animate-spin" />
            <p className="text-slate-400 font-mono text-sm">Loading your analysis...</p>
          </div>
        )}

        {/* ── STATE: error ── */}
        {pageState === "error" && (
          <div className="text-center py-24">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Analysis Not Found</h2>
            <p className="text-slate-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-lg font-semibold text-[#0F1419]"
              style={{ background: "#00D9FF" }}
            >
              Upload a New Quote
            </button>
          </div>
        )}

        {/* ── STATE: no_analysis (Flow B — email verified, no quote) ── */}
        {pageState === "no_analysis" && (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(0,217,255,0.1)", border: "1px solid rgba(0,217,255,0.3)" }}>
              <CheckCircle2 className="w-8 h-8 text-[#00D9FF]" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Email Verified!</h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Your account is ready. When you get a window quote, upload it here and we'll analyze it instantly — no waiting.
            </p>

            {/* Upload CTA */}
            <div
              className="rounded-2xl p-8 mb-6 border border-dashed cursor-pointer transition-all duration-300 hover:border-[#00D9FF] hover:bg-[rgba(0,217,255,0.04)]"
              style={{ borderColor: "rgba(0,217,255,0.3)", background: "rgba(15,20,25,0.8)" }}
              onClick={() => navigate("/#upload-zone")}
            >
              <FileText className="w-10 h-10 text-[#00D9FF] mx-auto mb-3 opacity-60" />
              <p className="text-white font-semibold mb-1">Upload Your Quote When Ready</p>
              <p className="text-sm text-slate-500">PDF, JPG, PNG — up to 10MB</p>
            </div>

            {/* Phone verification CTA */}
            <div className="rounded-xl p-6 border border-white/6" style={{ background: "rgba(15,20,25,0.6)" }}>
              <p className="text-sm text-slate-400 mb-4">
                Want a WindowMan expert to call you now? Verify your mobile number and we'll reach out within 24 hours.
              </p>
              <div className="flex gap-3">
                <input
                  type="tel"
                  placeholder="(561) 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#00D9FF] transition-colors"
                />
                <button
                  onClick={handlePhoneSubmit}
                  disabled={!phone.trim() || isPhoneLoading}
                  className="px-5 py-3 rounded-lg font-semibold text-[#0F1419] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  style={{ background: "#00D9FF" }}
                >
                  {isPhoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE: preview (partial — email verified, phone not yet) ── */}
        {(pageState === "preview" || pageState === "otp_gate") && previewData && (
          <div>
            {/* Page title */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">Partial Preview</span>
              </div>
              <h1 className="text-3xl font-black text-white mb-2">Your Quote Analysis</h1>
              <p className="text-slate-400">Verify your phone number to unlock the full report with detailed findings and savings estimates.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Score + Pillars */}
              <div className="lg:col-span-2 space-y-4">
                {/* Grade card */}
                <div className="rounded-2xl p-6 border border-white/6" style={{ background: "rgba(15,20,25,0.8)" }}>
                  <GradeBadge grade={previewData.preview?.finalGrade ?? "?"} score={previewData.preview?.overallScore ?? 0} />

                  {/* Findings */}
                  {(() => {
                    const findings = previewData.preview?.findings;
                    if (!findings || findings.length === 0) return null;
                    return (
                      <div className="mt-6 space-y-2">
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Key Findings</p>
                        {findings.map((f: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <ChevronRight className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
                            {f.label ?? f.tooltip ?? String(f)}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Pillar statuses */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">5-Pillar Analysis</p>
                  {PILLAR_CONFIG.map((pillar) => {
                    // Derive status from findings: if a finding matches this pillar, use its severity
                    const finding = previewData.preview?.findings?.find((f: any) => f.pillarKey === pillar.key || f.pillarLabel === pillar.label);
                    const status = finding ? (finding.severity === "flag" ? "fail" : "warn") : undefined;
                    return (
                      <PillarCard
                        key={pillar.key}
                        pillar={pillar}
                        status={status}
                        locked={false}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Right: Phone OTP Gate */}
              <div className="lg:col-span-1">
                <div
                  className="rounded-2xl p-6 border sticky top-6"
                  style={{ background: "rgba(0,217,255,0.04)", borderColor: "rgba(0,217,255,0.2)" }}
                >
                  {pageState === "preview" ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-5 h-5 text-[#00D9FF]" />
                        <span className="font-bold text-white">Unlock Full Report</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                        Enter your mobile number to unlock the complete analysis — including exact dollar overcharges, contractor comparisons, and negotiation scripts.
                      </p>

                      {/* Locked preview items */}
                      <div className="space-y-2 mb-5">
                        {["Exact overcharge amount", "Contractor comparison", "Negotiation scripts", "Fair price range"].map((item) => (
                          <div key={item} className="flex items-center gap-2 text-xs text-slate-500">
                            <Lock className="w-3 h-3" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mb-3">
                        <input
                          type="tel"
                          placeholder="(561) 555-0100"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                          className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-[#00D9FF] transition-colors"
                        />
                        <button
                          onClick={handlePhoneSubmit}
                          disabled={!phone.trim() || isPhoneLoading || isSendCodeBlocked}
                          className="px-4 py-2.5 rounded-lg font-semibold text-[#0F1419] disabled:opacity-50 text-sm whitespace-nowrap"
                          style={{ background: isSendCodeBlocked ? "#64748b" : "#00D9FF" }}
                        >
                          {isPhoneLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isSendCodeBlocked ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {sendCodeCooldown.formattedTime}
                            </span>
                          ) : (
                            "Send Code"
                          )}
                        </button>
                      </div>

                      {/* Send Code rate limit countdown banner */}
                      {isSendCodeBlocked && (
                        <div
                          className="rounded-xl px-4 py-3 flex flex-col gap-1.5 mb-3"
                          style={{
                            background: sendCodeCooldown.captchaRequired
                              ? "rgba(239,68,68,0.08)"
                              : "rgba(251,191,36,0.08)",
                            border: `1px solid ${sendCodeCooldown.captchaRequired ? "rgba(239,68,68,0.25)" : "rgba(251,191,36,0.25)"}`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {sendCodeCooldown.captchaRequired ? (
                              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            <span
                              className="text-sm font-semibold"
                              style={{ color: sendCodeCooldown.captchaRequired ? "#f87171" : "#fbbf24" }}
                            >
                              Too many attempts
                            </span>
                            <span
                              className="ml-auto text-sm font-mono font-bold tabular-nums"
                              style={{ color: sendCodeCooldown.captchaRequired ? "#f87171" : "#fbbf24" }}
                            >
                              {sendCodeCooldown.formattedTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {sendCodeCooldown.captchaRequired
                              ? "Too many requests from this device. Please wait before trying again."
                              : "Please wait before requesting another code."}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 text-center">Mobile numbers only. VOIP not accepted.</p>
                    </>
                  ) : (
                    /* OTP Gate */
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Phone className="w-5 h-5 text-[#00D9FF]" />
                        <span className="font-bold text-white">Enter Your Code</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-5">
                        We sent a 6-digit code to <span className="text-white font-mono">{e164Phone}</span>
                      </p>

                      <OTPInput
                        onComplete={handleOTPComplete}
                        disabled={verifyOTPMutation.isPending || otpCooldown.isBlocked}
                      />

                      {verifyOTPMutation.isPending && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <Loader2 className="w-4 h-4 animate-spin text-[#00D9FF]" />
                          <span className="text-sm text-slate-400">Verifying...</span>
                        </div>
                      )}

                      {/* Progressive backoff countdown */}
                      {otpCooldown.isBlocked && (
                        <div
                          className="mt-4 rounded-xl px-4 py-3 flex flex-col gap-2"
                          style={{
                            background: otpCooldown.captchaRequired
                              ? "rgba(239,68,68,0.08)"
                              : "rgba(251,191,36,0.08)",
                            border: `1px solid ${otpCooldown.captchaRequired ? "rgba(239,68,68,0.25)" : "rgba(251,191,36,0.25)"}`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {otpCooldown.captchaRequired ? (
                              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            <span
                              className="text-sm font-semibold"
                              style={{ color: otpCooldown.captchaRequired ? "#f87171" : "#fbbf24" }}
                            >
                              Too many attempts
                            </span>
                            <span
                              className="ml-auto text-sm font-mono font-bold tabular-nums"
                              style={{ color: otpCooldown.captchaRequired ? "#f87171" : "#fbbf24" }}
                            >
                              {otpCooldown.formattedTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {otpCooldown.captchaRequired
                              ? "Your account is temporarily locked. Please wait, then complete a verification challenge."
                              : "Please wait before trying again."}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-5 text-xs">
                        <button
                          onClick={() => { setPageState("preview"); setPhone(""); setE164Phone(""); }}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Wrong number? Edit
                        </button>
                        <button
                          onClick={handleResendOTP}
                          disabled={resendCooldown > 0}
                          className="flex items-center gap-1 text-slate-500 hover:text-[#00D9FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE: full_analysis ── */}
        {pageState === "full_analysis" && analysisId && (
          fullAnalysis?.scored ? (
            <QuoteRevealGate scanId={analysisId} scored={fullAnalysis.scored}>
              <AnalysisReport signals={fullAnalysis.signals} scored={fullAnalysis.scored} />
            </QuoteRevealGate>
          ) : (
            /* Return visit: isFullUnlocked but no fullJson in memory — show preview with unlocked badge */
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Full Analysis Unlocked</span>
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Complete Quote Report</h1>
                <p className="text-slate-400">Your full analysis is ready. Verify your phone to view the detailed report.</p>
              </div>
              {previewData?.preview && (
                <div className="rounded-2xl p-8 border border-white/6 mb-6" style={{ background: "rgba(15,20,25,0.8)" }}>
                  <GradeBadge
                    grade={previewData.preview.finalGrade ?? "?"}
                    score={previewData.preview.overallScore ?? 0}
                  />
                </div>
              )}
            </div>
          )
        )}

      </main>
    </div>
  );
}
