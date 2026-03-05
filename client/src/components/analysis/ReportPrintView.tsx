/**
 * ReportPrintView.tsx
 * 
 * Print-safe rendering of the forensic analysis report.
 * This component is hidden by default and shown only when printing/exporting to PDF.
 * 
 * Design rules:
 * - Light background for print (white)
 * - No SVG elements (use simple div-based bars)
 * - No gradients or shadows
 * - Explicit page breaks
 * - Print-friendly typography
 */

import type { ScoredResult } from "@shared/scoredTypes";

interface ReportPrintViewProps {
  signals?: Record<string, unknown>;
  scored?: ScoredResult;
  contractorName?: string;
  scanId?: string;
}

const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  signals,
  scored,
  contractorName = "Unknown Contractor",
  scanId = "N/A",
}) => {
  const grade = scored?.finalGrade ?? "?";
  const overall = Math.round(scored?.overallScore ?? 0);
  const overcharge = scored?.overchargeEstimate;

  // Pillar configuration
  type PillarKey = "safety" | "scope" | "price" | "fine_print" | "warranty";
  const PILLAR_META: Record<PillarKey, { label: string }> = {
    safety: { label: "Safety & Licensing" },
    scope: { label: "Scope of Work" },
    price: { label: "Price Fairness" },
    fine_print: { label: "Fine Print" },
    warranty: { label: "Warranty" },
  };

  const pillarStatuses = scored?.pillarStatuses ?? ({} as Record<string, "ok" | "warn" | "flag">);
  const pillarScores: Record<PillarKey, number> = {
    safety: Math.round(scored?.safetyScore ?? 0),
    scope: Math.round(scored?.scopeScore ?? 0),
    price: Math.round(scored?.priceScore ?? 0),
    fine_print: Math.round(scored?.finePrintScore ?? 0),
    warranty: Math.round(scored?.warrantyScore ?? 0),
  };

  // Extract risk flags
  const riskFlags: string[] = [];
  if (signals) {
    const flagKeys = [
      { key: "depositRisk", label: "Deposit Risk" },
      { key: "cancellationTrap", label: "Cancellation Trap" },
      { key: "arbitrationClause", label: "Arbitration Clause" },
      { key: "permitGap", label: "Permit Gap" },
      { key: "insuranceGap", label: "Insurance Gap" },
      { key: "changeOrderRisk", label: "Change-Order Risk" },
      { key: "warrantyVoid", label: "Warranty Void Risk" },
      { key: "materialSubstitution", label: "Material Substitution" },
    ];
    for (const { key, label } of flagKeys) {
      if ((signals as any)[key]) riskFlags.push(label);
    }
  }

  // Fallback: derive from pillar statuses
  if (riskFlags.length === 0) {
    for (const [key, status] of Object.entries(pillarStatuses)) {
      if (status === "flag") {
        const meta = PILLAR_META[key as PillarKey];
        if (meta) riskFlags.push(meta.label);
      }
    }
  }

  // Simple bar component (print-safe, no SVG)
  const SimpleBar = ({ pct, status }: { pct: number; status: "ok" | "warn" | "flag" }) => {
    const w = Math.max(0, Math.min(100, pct));
    let barColor = "#10b981"; // emerald
    if (status === "warn") barColor = "#f59e0b"; // amber
    if (status === "flag") barColor = "#ef4444"; // rose

    return (
      <div style={{ width: "100%", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            backgroundColor: barColor,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    );
  };

  // Grade badge color
  const getGradeColor = (g: string) => {
    const upper = g?.toUpperCase() ?? "F";
    if (upper.startsWith("A")) return "#10b981"; // emerald
    if (upper.startsWith("B")) return "#10b981"; // emerald
    if (upper.startsWith("C")) return "#f59e0b"; // amber
    if (upper.startsWith("D")) return "#ef4444"; // rose
    return "#dc2626"; // dark red
  };

  // Status label color
  const getStatusColor = (status: "ok" | "warn" | "flag") => {
    if (status === "flag") return "#ef4444";
    if (status === "warn") return "#f59e0b";
    return "#10b981";
  };

  return (
    <div style={{ backgroundColor: "white", color: "#000", fontFamily: "Arial, sans-serif", padding: "40px" }}>
      {/* ─── PAGE 1: COVER ─── */}
      <div style={{ pageBreakAfter: "always", textAlign: "center", paddingBottom: "60px" }}>
        <div style={{ marginBottom: "60px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#00d9ff", marginBottom: "10px" }}>
            Window Man
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#000", marginBottom: "30px" }}>
            Quote Safety Audit
          </div>
        </div>

        <div style={{ marginBottom: "40px", borderTop: "2px solid #e5e7eb", borderBottom: "2px solid #e5e7eb", padding: "20px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
            {contractorName}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Forensic Consumer Protection Analysis
          </div>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: getGradeColor(grade), marginBottom: "10px" }}>
            {grade}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>Overall Grade</div>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "36px", fontWeight: "bold", color: "#000" }}>
            {overall}/100
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>Overall Score</div>
        </div>

        <div style={{ marginTop: "60px", fontSize: "12px", color: "#999" }}>
          <div>Scan ID: {scanId}</div>
          <div>Generated: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* ─── PAGE 2: EXECUTIVE SUMMARY ─── */}
      <div style={{ pageBreakAfter: "always", paddingBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#000" }}>
          Executive Summary
        </h2>

        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px", color: "#000" }}>
            Risk Classification
          </h3>
          <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
            {overall >= 75 ? (
              <span>
                <strong>Acceptable Risk:</strong> This quote meets standard industry practices. Review the findings below for any items to clarify before signing.
              </span>
            ) : overall >= 50 ? (
              <span>
                <strong>Moderate Risk:</strong> This quote contains several items that warrant discussion with the contractor before committing. See recommendations below.
              </span>
            ) : (
              <span>
                <strong>Critical Risk:</strong> This quote contains significant red flags. We strongly recommend addressing these items before signing.
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", color: "#000" }}>
            5-Pillar Score Summary
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            {(Object.keys(PILLAR_META) as PillarKey[]).map((key) => {
              const meta = PILLAR_META[key];
              const status = (pillarStatuses[key] ?? "warn") as "ok" | "warn" | "flag";
              const score = pillarScores[key];
              return (
                <div key={key} style={{ pageBreakInside: "avoid", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "13px" }}>{meta.label}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: getStatusColor(status),
                        textTransform: "uppercase",
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <SimpleBar pct={score} status={status} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "bold", minWidth: "30px", textAlign: "right" }}>
                      {score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Immediate Risks */}
        {riskFlags.length > 0 && (
          <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#fef3c7", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#b45309", marginBottom: "8px", textTransform: "uppercase" }}>
              Immediate Risks Detected
            </div>
            <div style={{ fontSize: "13px", color: "#333" }}>
              {riskFlags.join(" • ")}
            </div>
          </div>
        )}
      </div>

      {/* ─── PAGE 3: FINANCIAL EXPOSURE ─── */}
      <div style={{ pageBreakAfter: "always", paddingBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#000" }}>
          Financial Exposure
        </h2>

        {overcharge ? (
          <div style={{ padding: "20px", backgroundColor: "#f3f4f6", borderRadius: "8px", marginBottom: "20px" }}>
            <div style={{ marginBottom: "15px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Estimated Overcharge Range</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}>
                ${overcharge.low?.toLocaleString() ?? "?"} – ${overcharge.high?.toLocaleString() ?? "?"}
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.5" }}>
              This range represents potential savings if contract terms are negotiated to market standards before signing.
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px", backgroundColor: "#fef3c7", borderRadius: "8px", marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", color: "#b45309" }}>
              See pillar details for specific cost concerns.
            </div>
          </div>
        )}

        <div style={{ marginTop: "30px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", color: "#000" }}>
            Recommendations
          </h3>
          <ul style={{ fontSize: "13px", color: "#333", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>Review all scope items with the contractor before signing</li>
            <li>Clarify payment schedule and deposit terms</li>
            <li>Verify warranty coverage and duration</li>
            <li>Confirm insurance and licensing requirements</li>
            <li>Discuss any contract terms you don't fully understand</li>
          </ul>
        </div>
      </div>

      {/* ─── PAGE 4: DETAILED FINDINGS ─── */}
      <div style={{ pageBreakAfter: "always", paddingBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#000" }}>
          Detailed Findings by Pillar
        </h2>

        {(Object.keys(PILLAR_META) as PillarKey[]).map((key) => {
          const meta = PILLAR_META[key];
          const status = (pillarStatuses[key] ?? "warn") as "ok" | "warn" | "flag";
          const score = pillarScores[key];

          return (
            <div key={key} style={{ marginBottom: "30px", pageBreakInside: "avoid" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "10px", gap: "10px" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(status),
                  }}
                />
                <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#000" }}>
                  {meta.label}
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: getStatusColor(status),
                    textTransform: "uppercase",
                    marginLeft: "auto",
                  }}
                >
                  {status}
                </span>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <SimpleBar pct={score} status={status} />
              </div>

              <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.6" }}>
                {status === "flag" && (
                  <p>
                    <strong>Action Required:</strong> This pillar has critical issues that should be addressed before signing.
                  </p>
                )}
                {status === "warn" && (
                  <p>
                    <strong>Review Recommended:</strong> This pillar has items worth clarifying with the contractor.
                  </p>
                )}
                {status === "ok" && (
                  <p>
                    <strong>Status OK:</strong> This pillar meets standard industry practices.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── PAGE 5: FOOTER / DISCLAIMER ─── */}
      <div style={{ pageBreakAfter: "always", paddingBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#000" }}>
          Before You Sign
        </h2>

        <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.8", marginBottom: "30px" }}>
          <p>
            Many homeowners lose thousands due to contract traps that are easy to fix before signing. This Window Man audit is designed to help you identify and address potential issues.
          </p>

          <p style={{ marginTop: "15px" }}>
            <strong>Next Steps:</strong>
          </p>
          <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
            <li>Share this report with your contractor for discussion</li>
            <li>Request clarification or changes for any flagged items</li>
            <li>Get written confirmation of all agreed-upon changes</li>
            <li>Do not sign until you are fully satisfied with the terms</li>
          </ul>
        </div>

        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#999" }}>
          <div>Generated by Window Man AI</div>
          <div>Scan ID: {scanId}</div>
          <div>Date: {new Date().toLocaleString()}</div>
          <div style={{ marginTop: "10px" }}>
            This report is for informational purposes only and should not be considered legal advice. Always consult with a qualified professional before signing any contract.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPrintView;
