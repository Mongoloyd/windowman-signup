/**
 * DownloadReportButton.tsx
 * 
 * Triggers PDF download using react-to-print.
 * Shows Loader2 spinner during generation.
 * Fires wm_report_download analytics event.
 */

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Download, Loader2 } from "lucide-react";
import { fireDataLayerEvent } from "@/lib/pixels";
import { generateReportFilename, computeRiskLevel } from "@/lib/reportPdf";
import ReportPrintView from "./ReportPrintView";
import type { ScoredResult } from "@shared/scoredTypes";

interface DownloadReportButtonProps {
  scanId: string;
  contractorName?: string;
  scored?: ScoredResult;
  signals?: Record<string, unknown>;
  className?: string;
  variant?: "primary" | "secondary";
}

export function DownloadReportButton({
  scanId,
  contractorName = "Quote",
  scored,
  signals,
  className = "",
  variant = "primary",
}: DownloadReportButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: generateReportFilename(contractorName, scanId),
    onBeforePrint: async () => {
      setIsLoading(true);
    },
    onAfterPrint: async () => {
      setIsLoading(false);

      // Fire analytics event
      const overallScore = scored?.overallScore ?? 0;
      const riskLevel = computeRiskLevel(overallScore);

      fireDataLayerEvent({
        event: "wm_report_download",
        scanId,
        contractorName,
        grade: scored?.finalGrade ?? "?",
        overallScore,
        riskLevel,
      });
    },
    onPrintError: async () => {
      setIsLoading(false);
    },
  });

  const buttonClass =
    variant === "primary"
      ? "inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      : "inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <button
        onClick={() => handlePrint()}
        disabled={isLoading}
        className={`${buttonClass} ${className}`}
        title="Download report as PDF"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </>
        )}
      </button>

      {/* Hidden print view — only rendered when printing */}
      <div ref={printRef} style={{ display: "none" }}>
        <ReportPrintView
          signals={signals}
          scored={scored}
          contractorName={contractorName}
          scanId={scanId}
        />
      </div>
    </>
  );
}

export default DownloadReportButton;
