/**
 * /verify-email
 *
 * Client-side page for handling email verification after magic link click.
 * Reads query params: token, session (tempSessionId), attach (deprecated)
 * Calls analysis.verifyEmail tRPC procedure.
 * 
 * Handles:
 * - Same-device flow: token + session → analysis attached
 * - Cross-device flow: token only → no analysis attached, show soft error
 * - Flow B: token only → no analysis, show account ready message
 * 
 * Error states:
 * - Email verified but no analysis attached → show recovery CTA
 * - Email verification failed → show error with retry link
 */

import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

type PageState = "loading" | "success" | "success_no_analysis" | "error";

interface ErrorDetails {
  code: string;
  message: string;
  recoveryAction?: string;
}

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const tempSessionId = params.get("session");

  // Call verifyEmail mutation
  const verifyEmailMutation = trpc.analysis.verifyEmail.useMutation();

  useEffect(() => {
    async function handleVerifyEmail() {
      if (!token) {
        setPageState("error");
        setErrorDetails({
          code: "invalid_link",
          message: "This verification link is invalid or missing. Please check your email and try again.",
        });
        return;
      }

      try {
        const result = await verifyEmailMutation.mutateAsync({
          token,
          tempSessionId: tempSessionId ?? undefined,
        });

        setLeadId(result.leadId);

        if (result.analysisId) {
          // Same-device or cross-device with attached analysis
          setAnalysisId(result.analysisId);
          setPageState("success");
          toast.success("Email verified! Loading your analysis...");
          // Redirect after brief delay
          setTimeout(() => {
            navigate(`/analysis/preview?id=${result.analysisId}&lead=${result.leadId}`);
          }, 1500);
        } else {
          // Email verified but no analysis attached
          setPageState("success_no_analysis");
          toast.info("Email verified! Your account is ready.");
        }
      } catch (err) {
        setPageState("error");
        const errorMessage = err instanceof Error ? err.message : "Verification failed";

        // Map error codes to user-friendly messages
        if (errorMessage.includes("invalid or has already been used")) {
          setErrorDetails({
            code: "link_used",
            message: "This verification link has already been used. Please request a new one.",
            recoveryAction: "Request New Link",
          });
        } else if (errorMessage.includes("expired")) {
          setErrorDetails({
            code: "link_expired",
            message: "This verification link has expired (6 hour limit). Please re-upload your file to get a new link.",
            recoveryAction: "Upload New Quote",
          });
        } else {
          setErrorDetails({
            code: "server_error",
            message: "Something went wrong during verification. Please try again or contact support.",
            recoveryAction: "Try Again",
          });
        }

        toast.error(errorDetails?.message || "Verification failed");
      }
    }

    handleVerifyEmail();
  }, [token, tempSessionId, verifyEmailMutation, navigate]);

  // ─── LOADING STATE ───────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Verifying your email...</h1>
          <p className="text-slate-400">Please wait while we confirm your email address.</p>
        </div>
      </div>
    );
  }

  // ─── SUCCESS STATE (with analysis) ───────────────────────────────────────
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Email Verified!</h1>
          <p className="text-slate-400 mb-6">
            Your email has been confirmed. We're loading your analysis now...
          </p>
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ─── SUCCESS STATE (no analysis — Flow B or cross-device) ────────────────
  if (pageState === "success_no_analysis") {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center p-4">
        <div className="max-w-lg">
          <div className="text-center mb-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-slate-400 mb-6">
              Your account is ready. When you get a window quote, upload it here and we'll analyze it instantly.
            </p>
          </div>

          {/* Info box */}
          <div className="rounded-2xl p-6 bg-slate-900 border border-white/10 mb-6">
            <p className="text-sm text-slate-300 mb-4">
              <strong>What's next?</strong> Upload your window quote PDF or image to get a forensic safety audit with:
            </p>
            <ul className="text-sm text-slate-400 space-y-2 mb-4">
              <li>✓ Safety & licensing check</li>
              <li>✓ Scope clarity analysis</li>
              <li>✓ Price fairness estimate</li>
              <li>✓ Fine print review</li>
              <li>✓ Warranty assessment</li>
            </ul>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/#upload-zone")}
              className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Upload Your Quote Now
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ─────────────────────────────────────────────────────────
  if (pageState === "error" && errorDetails) {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center p-4">
        <div className="max-w-lg">
          <div className="text-center mb-8">
            <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Verification Failed</h1>
          </div>

          {/* Error message */}
          <div className="rounded-2xl p-6 bg-rose-500/10 border border-rose-500/30 mb-6">
            <p className="text-sm text-rose-300 leading-relaxed">
              {errorDetails.message}
            </p>
          </div>

          {/* Recovery info box (if no analysis was attached) */}
          {errorDetails.code === "link_used" && (
            <div className="rounded-2xl p-6 bg-amber-500/10 border border-amber-500/30 mb-6">
              <p className="text-sm text-amber-300 leading-relaxed">
                <strong>If you just verified on another device:</strong> Your email is confirmed, but we couldn't attach your scan. 
                Please return to the upload tab and re-open your scan to continue.
              </p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            {errorDetails.recoveryAction === "Request New Link" && (
              <>
                <button
                  onClick={() => navigate("/#upload-zone")}
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Upload New Quote
                </button>
              </>
            )}
            {errorDetails.recoveryAction === "Upload New Quote" && (
              <>
                <button
                  onClick={() => navigate("/#upload-zone")}
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Upload Your Quote
                </button>
              </>
            )}
            {errorDetails.recoveryAction === "Try Again" && (
              <>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </>
            )}
            <button
              onClick={() => navigate("/")}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
