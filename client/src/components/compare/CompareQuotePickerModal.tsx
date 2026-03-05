/**
 * CompareQuotePickerModal
 *
 * Lets the user pick a second analysis to compare with the current one.
 * Calls listMyAnalyses (cookie-auth, no leadId param) and renders a list
 * of available scans. On selection, navigates to /compare/:idA/:idB
 *
 * Design tokens: SURFACE (#0F1419), SURFACE_INSET (#1A2030), cyan accent (#22D3EE).
 * Mobile: stacked, full-width. No horizontal scrolling.
 *
 * SPEC CHANGES (ContractorLabelResolver):
 * - contractorLabel is now the PRIMARY display (from server-side resolveContractorLabel)
 * - fileName is secondary (shown as subtitle only)
 * - leadId is NO LONGER in the navigation URL (server resolves from cookie)
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, GitCompare, FileText, AlertCircle, ChevronRight, Building2 } from "lucide-react";
import { fireDataLayerEvent } from "@/lib/pixels";

interface CompareQuotePickerModalProps {
  /** The currently viewed analysis ID (will be excluded from the picker list) */
  currentAnalysisId: string;
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
}

/** Grade color map — matches the report UI */
function gradeColor(grade: string | null): string {
  if (!grade) return "text-slate-400";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-cyan-400";
  if (g.startsWith("C")) return "text-yellow-400";
  return "text-rose-400";
}

/** Risk level badge class */
function riskBadgeClass(riskLevel: string | null): string {
  if (!riskLevel) return "bg-slate-700 text-slate-300";
  if (riskLevel === "Critical") return "bg-rose-900/60 text-rose-300 border border-rose-700/40";
  if (riskLevel === "Moderate") return "bg-amber-900/60 text-amber-300 border border-amber-700/40";
  return "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40";
}

/** Format a date as "Mar 5" */
function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CompareQuotePickerModal({
  currentAnalysisId,
  open,
  onClose,
}: CompareQuotePickerModalProps) {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = trpc.analysis.listMyAnalyses.useQuery(
    { excludeId: currentAnalysisId, limit: 10 },
    {
      enabled: open, // Only fetch when modal is open
      staleTime: 30_000, // 30s cache — picker list doesn't need to be real-time
    }
  );

  const analyses = data?.analyses ?? [];

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function handleCompare() {
    if (!selectedId) return;

    // Fire analytics event — no leadId in payload (server resolves from cookie)
    fireDataLayerEvent({
      event: "wm_compare_challenger_selected",
      idA: currentAnalysisId,
      idB: selectedId,
    });

    // Navigate to compare page — NO leadId in URL (server resolves from cookie)
    navigate(`/compare/${currentAnalysisId}/${selectedId}`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden border border-white/8"
        style={{ background: "#0F1419" }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,211,238,0.12)" }}
            >
              <GitCompare className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-semibold">
                Compare With Another Quote
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                Select a second scan to run a side-by-side forensic comparison.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="text-sm">Loading your scans…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 py-6 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Failed to load scans. Please try again.</span>
            </div>
          )}

          {!isLoading && !error && analyses.length === 0 && (
            <div className="py-8 text-center">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No other scans found</p>
              <p className="text-slate-500 text-xs mt-1 mb-4">
                Upload a second quote to enable comparison.
              </p>
              <Button
                onClick={() => {
                  fireDataLayerEvent({
                    event: "wm_compare_empty_state_cta_clicked",
                    currentAnalysisId,
                  });
                  navigate("/?compare=1");
                  onClose();
                }}
                className="gap-2 font-semibold"
                style={{
                  background: "rgba(34,211,238,0.15)",
                  color: "#22D3EE",
                  borderColor: "rgba(34,211,238,0.3)",
                }}
              >
                <FileText className="w-4 h-4" />
                Upload a Second Quote
              </Button>
            </div>
          )}

          {!isLoading && !error && analyses.length > 0 && (
            <div className="space-y-2">
              {analyses.map((item) => {
                const isSelected = selectedId === item.id;
                // contractorLabel is the canonical primary label from the server
                const label = (item as typeof item & { contractorLabel?: string }).contractorLabel
                  ?? item.fileName
                  ?? "Untitled Quote";
                const subtitle = (item as typeof item & { contractorLabel?: string }).contractorLabel
                  ? (item.fileName ?? null)
                  : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className="w-full text-left rounded-xl px-4 py-3 transition-all duration-150 border"
                    style={{
                      background: isSelected
                        ? "rgba(34,211,238,0.08)"
                        : "rgba(26,32,48,0.8)",
                      borderColor: isSelected
                        ? "rgba(34,211,238,0.4)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: contractor label (primary) + filename (secondary) + date */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-white text-sm font-semibold truncate">
                            {label}
                          </span>
                        </div>
                        {subtitle && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <FileText className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <span className="text-slate-500 text-xs truncate">{subtitle}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500 text-xs">
                            {formatDate(item.createdAt)}
                          </span>
                          {item.riskLevel && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${riskBadgeClass(item.riskLevel)}`}>
                              {item.riskLevel}
                            </span>
                          )}
                          {item.status === "persisted_email_verified" && (
                            <span className="text-xs text-amber-400/70">Email verified</span>
                          )}
                          {item.status === "full_unlocked" && (
                            <span className="text-xs text-emerald-400/70">Full unlock</span>
                          )}
                        </div>
                      </div>

                      {/* Right: grade + score */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.finalGrade && (
                          <span className={`text-xl font-black ${gradeColor(item.finalGrade)}`}>
                            {item.finalGrade}
                          </span>
                        )}
                        {item.overallScore != null && (
                          <span className="text-slate-400 text-xs">{item.overallScore}/100</span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 transition-colors ${isSelected ? "text-cyan-400" : "text-slate-600"}`}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedId}
            onClick={handleCompare}
            className="gap-2 font-semibold"
            style={{
              background: selectedId ? "rgba(34,211,238,0.15)" : undefined,
              color: selectedId ? "#22D3EE" : undefined,
              borderColor: selectedId ? "rgba(34,211,238,0.3)" : undefined,
            }}
          >
            <GitCompare className="w-4 h-4" />
            Compare Quotes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
