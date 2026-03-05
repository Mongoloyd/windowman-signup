/**
 * ComparePrintView.tsx
 * Print-safe single-page compare summary.
 * Includes Print/Save PDF button (window.print).
 * Uses @media print styles from index.css.
 */

import { useRef } from "react";
import { formatCurrency } from "@/lib/formatters";
import { fireDataLayerEvent } from "@/lib/pixels";
import type { ComparisonResult, QuoteInfo } from "@/types/compare";

interface ComparePrintViewProps {
  quoteA: QuoteInfo;
  quoteB: QuoteInfo;
  comparison: ComparisonResult;
  onAnalyticsEvent?: (event: string, payload: Record<string, unknown>) => void;
}

export function ComparePrintView({
  quoteA,
  quoteB,
  comparison,
  onAnalyticsEvent,
}: ComparePrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    onAnalyticsEvent?.("wm_compare_print_clicked", {
      idA: quoteA.id,
      idB: quoteB.id,
      winnerId: comparison.meta.winnerId,
    });
    fireDataLayerEvent({
      event: "wm_compare_print_clicked",
      idA: quoteA.id,
      idB: quoteB.id,
      winnerId: comparison.meta.winnerId,
      confidence: comparison.meta.confidence,
    });
    window.print();
  }

  const { meta, pricing } = comparison;
  const winnerLabel =
    meta.winnerId === "tie"
      ? "Statistical Tie"
      : meta.deltaScore > 0
      ? quoteA.contractorLabel
      : quoteB.contractorLabel;

  return (
    <>
      {/* Print trigger button — shown in UI, hidden in print */}
      <button
        onClick={handlePrint}
        className="no-print flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-colors shadow-sm"
      >
        🖨️ Print / Save PDF
      </button>

      {/* Print-safe content — only visible in print */}
      <div
        ref={printRef}
        className="compare-print-view hidden print:block"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* Header */}
        <div style={{ borderBottom: "2px solid #0891b2", paddingBottom: "12px", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Window Man — Quote Comparison Report
          </h1>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>
            Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Verdict */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#0369a1", margin: "0 0 4px" }}>
            Verdict
          </p>
          <p style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            {meta.verdictTitle}
          </p>
          <p style={{ fontSize: "11px", color: "#475569", margin: "4px 0 0" }}>
            Winner: <strong>{winnerLabel}</strong> · Confidence: {Math.round(meta.confidence * 100)}% · Decision: {meta.decisionPath}
          </p>
        </div>

        {/* Price Comparison Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 900, color: "#64748b", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em", border: "1px solid #e2e8f0" }}>
                Item
              </th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 900, color: "#64748b", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em", border: "1px solid #e2e8f0" }}>
                {quoteA.contractorLabel}
              </th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 900, color: "#64748b", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em", border: "1px solid #e2e8f0" }}>
                {quoteB.contractorLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", color: "#475569" }}>Sticker Price</td>
              <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>
                {pricing.quoteA.base != null ? formatCurrency(pricing.quoteA.base) : "Not stated"}
              </td>
              <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>
                {pricing.quoteB.base != null ? formatCurrency(pricing.quoteB.base) : "Not stated"}
              </td>
            </tr>
            <tr style={{ background: "#fef2f2" }}>
              <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", color: "#dc2626", fontWeight: 700 }}>Hidden Liabilities</td>
              <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #e2e8f0", fontFamily: "monospace", color: "#dc2626" }}>
                +{formatCurrency(pricing.quoteA.liabilities.reduce((s, l) => s + l.cost, 0))}
              </td>
              <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #e2e8f0", fontFamily: "monospace", color: "#dc2626" }}>
                +{formatCurrency(pricing.quoteB.liabilities.reduce((s, l) => s + l.cost, 0))}
              </td>
            </tr>
            <tr style={{ background: "#f0fdf4", fontWeight: 900 }}>
              <td style={{ padding: "8px 12px", border: "1px solid #e2e8f0", color: "#166534" }}>True Real Cost™</td>
              <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #e2e8f0", fontFamily: "monospace", color: "#166534" }}>
                {pricing.quoteA.adjusted != null ? formatCurrency(pricing.quoteA.adjusted) : "N/A"}
              </td>
              <td style={{ padding: "8px 12px", textAlign: "right", border: "1px solid #e2e8f0", fontFamily: "monospace", color: "#166534" }}>
                {pricing.quoteB.adjusted != null ? formatCurrency(pricing.quoteB.adjusted) : "N/A"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Pillar Summary */}
        <p style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", margin: "0 0 8px" }}>
          Pillar Summary
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Pillar", quoteA.contractorLabel, quoteB.contractorLabel].map((h) => (
                <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 900, color: "#64748b", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em", border: "1px solid #e2e8f0" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.entries(comparison.pillardiff) as [string, { labelA: string; labelB: string; winnerId: string }][]).map(([key, diff]) => (
              <tr key={key}>
                <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: 700, textTransform: "capitalize" }}>
                  {key.replace("_", " ")}
                </td>
                <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{diff.labelA}</td>
                <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{diff.labelB}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "16px" }}>
          <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>
            Window Man Forensic Audit · itswindowman.com · Structured data retained. Documents auto-deleted after 90 days. Download a copy to keep it on your device.
          </p>
        </div>
      </div>
    </>
  );
}
