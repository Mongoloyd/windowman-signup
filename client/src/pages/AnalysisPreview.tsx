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
  Unlock, ChevronRight,
  Clock, AlertOctagon
} from "lucide-react";
import { useOtpCooldown } from "@/hooks/useOtpCooldown";
import { firePhoneVerifiedConversion, hashPii } from "@/lib/pixels";
import QuoteRevealGate from "@/components/analysis/QuoteRevealGate";
import AnalysisReport from "@/pages/analysis-report";
import { DownloadReportButton } from "@/components/analysis/DownloadReportButton";
import { CompareQuotePickerModal } from "@/components/compare/CompareQuotePickerModal";
import { GitCompare } from "lucide-react";
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
  B: "#0891b2",
  C: "#f59e0b",
  D: "#f87171",
  F: "#ef4444",
};

// Light design system tokens (local helpers)
const SURFACE =
  "bg-white/80 backdrop-blur-[24px] shadow-lg border border-cyan-500/15 rounded-3xl";
const SURFACE_INSET = "bg-slate-50/50 shadow-inner border border-cyan-500/15 rounded-2xl";
const HEADER_BAR = "bg-white/60 backdrop-blur-xl border-b border-cyan-500/10";
const PRIMARY_CTA =
  "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold shadow-[0_10px_30px_-5px_rgba(0,188,212,0.35)]";
const SECONDARY_BTN =
  "bg-white/70 hover:bg-white border border-slate-200 text-slate-900 font-semibold shadow-sm";

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
          className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/80 border-2 text-slate-900 focus:outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            borderColor: d ? "#0891B2" : "rgba(8,145,178,0.20)",
            boxShadow: d ? "0 0 12px rgba(8,145,178,0.20)" : "none",
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

  // Accessible pill styling: use bg-*/text-* combos (no neon)
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; pill: string; border: string }> = {
    pass: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />, label: "Pass", pill: "bg-emerald-50 text-emerald-800 border-emerald-200", border: "rgba(5,150,105,0.20)" },
    warn: { icon: <AlertTriangle className="w-4 h-4 text-amber-700" />, label: "Warning", pill: "bg-amber-50 text-amber-800 border-amber-200", border: "rgba(217,119,6,0.20)" },
    fail: { icon: <AlertCircle className="w-4 h-4 text-rose-700" />, label: "Flag", pill: "bg-rose-50 text-rose-800 border-rose-200", border: "rgba(225,29,72,0.20)" },
  };

  const cfg = status ? statusConfig[status] ?? null : null;

  return (
    <div
      className="rounded-2xl p-4 border transition-all duration-300"
      style={{
        background: locked ? "rgba(241,245,249,0.70)" : "rgba(255,255,255,0.80)",
        borderColor: locked ? "rgba(8,145,178,0.12)" : (cfg ? cfg.border : "rgba(8,145,178,0.15)"),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0" style={{ color: locked ? "rgba(100,116,139,0.45)" : "#0891B2" }} />
          <span className="text-sm font-semibold" style={{ color: locked ? "rgba(100,116,139,0.55)" : "#0f172a" }}>
            {pillar.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="w-3 h-3 text-slate-600" />
          ) : (
            <>
              {cfg?.icon as React.ReactNode}
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${cfg?.pill ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
                {cfg?.label ?? "—"}
              </span>
              {score !== undefined && (
                <span className="text-xs font-mono text-slate-600 ml-1">{score}/100</span>
              )}
            </>
          )}
        </div>
      </div>

      {!locked && detail && (
        <p className="text-xs text-slate-700 mt-1 leading-relaxed">{detail}</p>
      )}

      {locked && (
        <div className="h-3 rounded bg-slate-100 mt-1" />
      )}
    </div>
  );
}

// ─── Grade Badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade, score, size = "lg" }: { grade: string; score: number; size?: "sm" | "lg" }) {
  const color = GRADE_COLORS[grade] ?? "#0891b2";
  const isLg = size === "lg";

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${isLg ? "w-24 h-24 text-5xl" : "w-16 h-16 text-3xl"} rounded-2xl flex items-center justify-center font-black border-2`}
        style={{
          background: `${color}12`,
          borderColor: `${color}55`,
          color,
          boxShadow: `0 0 26px ${color}22`,
        }}
      >
        {grade}
      </div>
      <div>
        <div className={`${isLg ? "text-4xl" : "text-2xl"} font-black text-slate-900`}>
          {score}<span className="text-slate-600 text-lg">/100</span>
        </div>
        <div className="text-sm text-slate-700 mt-1 font-medium">Overall Score</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalysisPreview() {
  const [, navigate] = useLocation();
  const [compareModalOpen, setCompareModalOpen] = useState(false);

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
      const backoff = (err.data as { backoff?: { cooldownRemainingMs?: number; captchaRequired?: boolean } } | undefined)?.backoff;
      const cooldownMs = backoff?.cooldownRemainingMs ?? 0;
      const captcha = backoff?.captchaRequired ?? false;
      if (cooldownMs > 0) {
        otpCooldown.startCooldown(cooldownMs, captcha);
      }
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
    <div className="min-h-screen bg-transparent text-slate-900" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header className={`${HEADER_BAR} px-6 py-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to WindowMan
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-800">Email Verified</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* ── STATE: loading ── */}
        {pageState === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
            <p className="text-slate-700 font-mono text-sm">Loading your analysis...</p>
          </div>
        )}

        {/* ── STATE: error ── */}
        {pageState === "error" && (
          <div className="text-center py-24">
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Analysis Not Found</h2>
            <p className="text-slate-700 mb-6 font-medium">{errorMessage}</p>
            <button
              onClick={() => navigate("/")}
              className={`px-6 py-3 rounded-xl ${PRIMARY_CTA} transition-all duration-300`}
            >
              Upload a New Quote
            </button>
          </div>
        )}

        {/* ── STATE: no_analysis (Flow B — email verified, no quote) ── */}
        {pageState === "no_analysis" && (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-200 bg-emerald-50`}>
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Email Verified!</h1>
            <p className="text-slate-700 mb-8 leading-relaxed font-medium">
              Your account is ready. When you get a window quote, upload it here and we'll analyze it instantly — no waiting.
            </p>

            {/* Upload CTA */}
            <div
              className={`cursor-pointer transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-50/40 ${SURFACE} p-8 mb-6 border-2 border-dashed`}
              onClick={() => navigate("/#upload-zone")}
            >
              <FileText className="w-10 h-10 text-cyan-700 mx-auto mb-3 opacity-80" />
              <p className="text-slate-900 font-semibold mb-1">Upload Your Quote When Ready</p>
              <p className="text-sm text-slate-700 font-medium">PDF, JPG, PNG — up to 10MB</p>
            </div>

            {/* Phone verification CTA */}
            <div className={`${SURFACE} p-6`}>
              <p className="text-sm text-slate-700 mb-4 font-medium">
                Want a WindowMan expert to call you now? Verify your mobile number and we'll reach out within 24 hours.
              </p>
              <div className="flex gap-3">
                <input
                  type="tel"
                  placeholder="(561) 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                  className={`flex-1 px-4 py-3 rounded-xl ${SURFACE_INSET} text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 transition-colors`}
                />
                <button
                  onClick={handlePhoneSubmit}
                  disabled={!phone.trim() || isPhoneLoading}
                  className={`px-5 py-3 rounded-xl ${PRIMARY_CTA} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300`}
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
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-mono text-amber-800 uppercase tracking-widest">Partial Preview</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Your Quote Analysis</h1>
              <p className="text-slate-700 font-medium">
                Verify your phone number to unlock the full report with detailed findings and savings estimates.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Score + Pillars */}
              <div className="lg:col-span-2 space-y-4">
                {/* Grade card */}
                <div className={`${SURFACE} p-6`}>
                  <GradeBadge grade={previewData.preview?.finalGrade ?? "?"} score={previewData.preview?.overallScore ?? 0} />

                  {/* Findings */}
                  {(() => {
                    const findings = previewData.preview?.findings;
                    if (!findings || findings.length === 0) return null;
                    return (
                      <div className="mt-6 space-y-2">
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Key Findings</p>
                        {findings.map((f: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-800 font-medium">
                            <ChevronRight className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
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
                    const finding = previewData.preview?.findings?.find(
                      (f: any) => f.pillarKey === pillar.key || f.pillarLabel === pillar.label
                    );
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
                <div className={`${SURFACE} p-6 sticky top-6`}>
                  {pageState === "preview" ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-5 h-5 text-cyan-700" />
                        <span className="font-extrabold text-slate-900">Unlock Full Report</span>
                      </div>

                      <p className="text-sm text-slate-700 mb-5 leading-relaxed font-medium">
                        Enter your mobile number to unlock the complete analysis — including exact dollar overcharges,
                        contractor comparisons, and negotiation scripts.
                      </p>

                      {/* Locked preview items */}
                      <div className="space-y-2 mb-5">
                        {["Exact overcharge amount", "Contractor comparison", "Negotiation scripts", "Fair price range"].map((item) => (
                          <div key={item} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                            <Lock className="w-3 h-3 text-slate-500" />
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
                          className={`flex-1 px-3 py-2.5 rounded-xl ${SURFACE_INSET} text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 transition-colors`}
                        />

                        <button
                          onClick={handlePhoneSubmit}
                          disabled={!phone.trim() || isPhoneLoading || isSendCodeBlocked}
                          className={`px-4 py-2.5 rounded-xl disabled:opacity-50 text-sm whitespace-nowrap transition-all duration-300 shadow-sm ${
                            isSendCodeBlocked ? "bg-slate-400 text-white" : PRIMARY_CTA
                          }`}
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
                          className={`rounded-2xl px-4 py-3 flex flex-col gap-1.5 mb-3 border ${
                            sendCodeCooldown.captchaRequired
                              ? "bg-rose-50 border-rose-200"
                              : "bg-amber-50 border-amber-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {sendCodeCooldown.captchaRequired ? (
                              <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                            )}
                            <span
                              className={`text-sm font-semibold ${
                                sendCodeCooldown.captchaRequired ? "text-rose-800" : "text-amber-800"
                              }`}
                            >
                              Too many attempts
                            </span>
                            <span
                              className={`ml-auto text-sm font-mono font-bold tabular-nums ${
                                sendCodeCooldown.captchaRequired ? "text-rose-800" : "text-amber-800"
                              }`}
                            >
                              {sendCodeCooldown.formattedTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">
                            {sendCodeCooldown.captchaRequired
                              ? "Too many requests from this device. Please wait before trying again."
                              : "Please wait before requesting another code."}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-slate-700 text-center font-medium">Mobile numbers only. VOIP not accepted.</p>
                    </>
                  ) : (
                    /* OTP Gate */
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Phone className="w-5 h-5 text-cyan-700" />
                        <span className="font-extrabold text-slate-900">Enter Your Code</span>
                      </div>

                      <p className="text-sm text-slate-700 mb-5 font-medium">
                        We sent a 6-digit code to{" "}
                        <span className="text-slate-900 font-mono font-bold">{e164Phone}</span>
                      </p>

                      <OTPInput
                        onComplete={handleOTPComplete}
                        disabled={verifyOTPMutation.isPending || otpCooldown.isBlocked}
                      />

                      {verifyOTPMutation.isPending && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                          <span className="text-sm text-slate-700 font-medium">Verifying...</span>
                        </div>
                      )}

                      {/* Progressive backoff countdown */}
                      {otpCooldown.isBlocked && (
                        <div
                          className={`mt-4 rounded-2xl px-4 py-3 flex flex-col gap-2 border ${
                            otpCooldown.captchaRequired ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {otpCooldown.captchaRequired ? (
                              <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                            )}
                            <span className={`text-sm font-semibold ${otpCooldown.captchaRequired ? "text-rose-800" : "text-amber-800"}`}>
                              Too many attempts
                            </span>
                            <span className={`ml-auto text-sm font-mono font-bold tabular-nums ${otpCooldown.captchaRequired ? "text-rose-800" : "text-amber-800"}`}>
                              {otpCooldown.formattedTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">
                            {otpCooldown.captchaRequired
                              ? "Your account is temporarily locked. Please wait, then complete a verification challenge."
                              : "Please wait before trying again."}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-5 text-xs">
                        <button
                          onClick={() => { setPageState("preview"); setPhone(""); setE164Phone(""); }}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors font-medium"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Wrong number? Edit
                        </button>
                        <button
                          onClick={handleResendOTP}
                          disabled={resendCooldown > 0}
                          className="flex items-center gap-1 text-slate-600 hover:text-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
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
            <>
              <div className="mb-6 flex items-center justify-end gap-3">
                {/* Compare Quotes entry point */}
                <button
                  onClick={() => setCompareModalOpen(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${SECONDARY_BTN} hover:border-cyan-300/60`}
                >
                  <GitCompare className="w-4 h-4 text-cyan-700" />
                  Compare Quotes
                </button>

                <DownloadReportButton
                  scanId={analysisId}
                  contractorName={String(fullAnalysis.identity?.contractor_name ?? "Quote")}
                  scored={fullAnalysis.scored}
                  signals={fullAnalysis.signals}
                  variant="primary"
                />
              </div>

              {/* Compare Quote Picker Modal */}
              <CompareQuotePickerModal
                currentAnalysisId={analysisId}
                open={compareModalOpen}
                onClose={() => setCompareModalOpen(false)}
              />

              <QuoteRevealGate scanId={analysisId} scored={fullAnalysis.scored}>
                <AnalysisReport
                  signals={fullAnalysis.signals}
                  scored={fullAnalysis.scored}
                  onBeatYourQuoteClick={() => setCompareModalOpen(true)}
                />
              </QuoteRevealGate>
            </>
          ) : (
            /* Return visit: isFullUnlocked but no fullJson in memory — show preview with unlocked badge */
            <>
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Unlock className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-mono text-emerald-800 uppercase tracking-widest">Full Analysis Unlocked</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Complete Quote Report</h1>
                <p className="text-slate-700 font-medium">Your full analysis is ready. Verify your phone to view the detailed report.</p>
              </div>

              {previewData?.preview && (
                <div className={`${SURFACE} p-8 mb-6`}>
                  <GradeBadge
                    grade={previewData.preview.finalGrade ?? "?"}
                    score={previewData.preview.overallScore ?? 0}
                  />
                </div>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
