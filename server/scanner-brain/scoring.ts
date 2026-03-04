import type { ExtractionSignals } from "./schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PillarKey = "safety" | "scope" | "price" | "fine_print" | "warranty";
export type PillarStatus = "ok" | "warn" | "flag";
export type PillarStatuses = Record<PillarKey, PillarStatus>;

export type HardCapResult = {
  applied: boolean;
  reason: string | null;
  statute: string | null;
  ceiling: number | null;
};

export type ScoredResult = {
  overallScore: number;
  finalGrade: string;
  safetyScore: number;
  scopeScore: number;
  priceScore: number;
  finePrintScore: number;
  warrantyScore: number;
  pillarStatuses: PillarStatuses;
  warnings: string[];
  missingItems: string[];
  hardCap: HardCapResult;
};

export type PreviewFinding = {
  pillar: "Safety" | "Scope" | "Price" | "FinePrint" | "Warranty";
  severity: "warn" | "flag"; // ok is forbidden
  label: string;
  tooltip: string;
};

export type SafePreview = {
  overallScore: number; // rounded to nearest 5
  finalGrade: string; // e.g., "B-"
  riskLevel: "Critical" | "Moderate" | "Acceptable";
  warningBucket: "0" | "1-2" | "3+" | "5+";
  findings: PreviewFinding[]; // max 3; flags first
};

// ─── Deterministic Scoring ────────────────────────────────────────────────────

function scoreSafety(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (!s.design_pressure_listed) { score -= 15; missing.push("Design pressure not listed"); }
  if (!s.missile_impact_rated) { score -= 15; missing.push("Missile impact rating not confirmed"); }
  if (!s.noa_numbers || s.noa_numbers.length === 0) { score -= 20; missing.push("No NOA numbers"); }
  if (!s.fl_approval_numbers || s.fl_approval_numbers.length === 0) { score -= 10; missing.push("No FL approval numbers"); }
  if (!s.installation_method) { score -= 10; missing.push("Installation method not specified"); }
  if (s.missing_noa) { score -= 10; warnings.push("Impact products claimed but no NOA listed"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scoreScope(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (s.opening_count === null) { score -= 10; missing.push("Opening count not specified"); }
  if (!s.product_types || s.product_types.length === 0) { score -= 10; missing.push("Product types not listed"); }
  if (!s.installation_included) { score -= 15; missing.push("Installation not included"); }
  if (!s.removal_of_old_windows) { score -= 5; missing.push("Old window removal not included"); }
  if (!s.permit_included) { score -= 15; missing.push("Permit not included"); warnings.push("No permit reference"); }
  if (!s.inspection_included) { score -= 10; missing.push("Inspection not included"); }
  if (!s.debris_cleanup_included) { score -= 5; missing.push("Debris cleanup not included"); }
  if (!s.stucco_repair_included) { score -= 5; missing.push("Stucco repair not included"); }
  if (!s.trim_wrap_included) { score -= 5; missing.push("Trim wrap not included"); }
  if (s.missing_permit_reference) { score -= 10; warnings.push("Missing permit reference despite installation"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scorePrice(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (s.total_price === null) { score -= 20; missing.push("Total price not stated"); }
  if (s.deposit_exceeds_statutory_limit) { score -= 25; warnings.push("Deposit exceeds Florida statutory limit"); }
  if (s.unusually_high_price) { score -= 15; warnings.push("Price appears unusually high for region"); }
  if (s.unusually_low_price) { score -= 10; warnings.push("Price appears unusually low — potential bait"); }
  if (!s.payment_schedule_described) { score -= 10; missing.push("Payment schedule not described"); }
  if (!s.tax_included) { score -= 5; missing.push("Tax inclusion not stated"); }
  if (s.today_only_pricing) { score -= 15; warnings.push("Today-only pricing pressure tactic"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scoreFinePrint(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (!s.cancellation_clause) { score -= 20; missing.push("No cancellation clause"); warnings.push("Missing cancellation clause"); }
  if (s.cancellation_clause && s.cancellation_window_days !== null && s.cancellation_window_days < 3) {
    score -= 15; warnings.push("Cancellation window less than 3 days (FL statute requires 3)");
  }
  if (!s.change_order_clause) { score -= 10; missing.push("No change order clause"); }
  if (!s.lien_waiver_mentioned) { score -= 10; missing.push("No lien waiver mentioned"); }
  if (s.arbitration_clause) { score -= 10; warnings.push("Mandatory arbitration clause present"); }
  if (s.escalation_clause) { score -= 10; warnings.push("Price escalation clause present"); }
  if (!s.completion_timeline_stated) { score -= 10; missing.push("No completion timeline stated"); }
  if (!s.insurance_proof_mentioned) { score -= 5; missing.push("No insurance proof mentioned"); }
  if (!s.license_number_on_contract) { score -= 5; missing.push("License number not on contract"); }
  if (s.pressure_tactics_detected) { score -= 15; warnings.push("Pressure tactics detected"); }
  if (s.verbal_promises_noted) { score -= 10; warnings.push("Verbal promises noted — not in writing"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scoreWarranty(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (s.manufacturer_warranty_years === null) { score -= 20; missing.push("Manufacturer warranty not stated"); }
  else if (s.manufacturer_warranty_years < 10) { score -= 10; warnings.push("Manufacturer warranty under 10 years"); }

  if (s.labor_warranty_years === null) { score -= 20; missing.push("Labor warranty not stated"); }
  else if (s.labor_warranty_years < 2) { score -= 15; warnings.push("Labor warranty under 2 years"); }
  else if (s.labor_warranty_years < 5) { score -= 5; warnings.push("Labor warranty under 5 years"); }

  if (!s.warranty_transferable) { score -= 10; missing.push("Warranty not transferable"); }
  if (s.warranty_exclusions_noted) { score -= 5; warnings.push("Warranty exclusions noted"); }
  if (s.lifetime_warranty_claimed && s.manufacturer_warranty_years !== null && s.manufacturer_warranty_years < 25) {
    score -= 10; warnings.push("Lifetime warranty claimed but years < 25");
  }

  return { score: Math.max(0, score), warnings, missing };
}

function applyHardCaps(signals: ExtractionSignals, overallScore: number): { score: number; hardCap: HardCapResult } {
  // Hard cap: deposit exceeds statutory limit
  if (signals.deposit_exceeds_statutory_limit) {
    return {
      score: Math.min(overallScore, 45),
      hardCap: {
        applied: true,
        reason: "Deposit exceeds Florida statutory limit (§489.126)",
        statute: "FL §489.126",
        ceiling: 45,
      },
    };
  }

  // Hard cap: pressure tactics + today-only pricing combo
  if (signals.pressure_tactics_detected && signals.today_only_pricing) {
    return {
      score: Math.min(overallScore, 50),
      hardCap: {
        applied: true,
        reason: "Pressure tactics combined with today-only pricing",
        statute: null,
        ceiling: 50,
      },
    };
  }

  // Hard cap: no cancellation clause
  if (!signals.cancellation_clause) {
    return {
      score: Math.min(overallScore, 55),
      hardCap: {
        applied: true,
        reason: "Missing cancellation clause (FL 3-day right to cancel)",
        statute: "FL §501.025",
        ceiling: 55,
      },
    };
  }

  // Hard cap: not a window/door document
  if (!signals.document_is_window_door_related) {
    return {
      score: 0,
      hardCap: {
        applied: true,
        reason: "Document is not window/door related",
        statute: null,
        ceiling: 0,
      },
    };
  }

  return {
    score: overallScore,
    hardCap: { applied: false, reason: null, statute: null, ceiling: null },
  };
}

export function calculateLetterGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

/**
 * scoreFromSignals — deterministic scoring engine.
 * Gemini only extracts signals; all scoring is local TypeScript logic.
 */
export function scoreFromSignals(signals: ExtractionSignals): ScoredResult {
  const safety = scoreSafety(signals);
  const scope = scoreScope(signals);
  const price = scorePrice(signals);
  const finePrint = scoreFinePrint(signals);
  const warranty = scoreWarranty(signals);

  // Weighted average: Safety 25%, Scope 20%, Price 25%, FinePrint 20%, Warranty 10%
  const rawScore = Math.round(
    safety.score * 0.25 +
    scope.score * 0.20 +
    price.score * 0.25 +
    finePrint.score * 0.20 +
    warranty.score * 0.10
  );

  const { score: cappedScore, hardCap } = applyHardCaps(signals, rawScore);
  const finalGrade = calculateLetterGrade(cappedScore);

  const allWarnings = [
    ...safety.warnings,
    ...scope.warnings,
    ...price.warnings,
    ...finePrint.warnings,
    ...warranty.warnings,
  ];

  const allMissing = [
    ...safety.missing,
    ...scope.missing,
    ...price.missing,
    ...finePrint.missing,
    ...warranty.missing,
  ];

  const pillarStatuses = derivePillarStatuses({
    safetyScore: safety.score,
    scopeScore: scope.score,
    priceScore: price.score,
    finePrintScore: finePrint.score,
    warrantyScore: warranty.score,
  });

  return {
    overallScore: cappedScore,
    finalGrade,
    safetyScore: safety.score,
    scopeScore: scope.score,
    priceScore: price.score,
    finePrintScore: finePrint.score,
    warrantyScore: warranty.score,
    pillarStatuses,
    warnings: allWarnings,
    missingItems: allMissing,
    hardCap,
  };
}

// ─── Addendum A: SafePreview Compatibility Patch ──────────────────────────────

/**
 * derivePillarStatuses — converts component scores into ok/warn/flag.
 * Deterministic, aligns to existing score thresholds.
 */
export function derivePillarStatuses(scored: Pick<ScoredResult, "safetyScore" | "scopeScore" | "priceScore" | "finePrintScore" | "warrantyScore">): PillarStatuses {
  const statusFromScore = (n: number): PillarStatus => {
    if (n < 50) return "flag";
    if (n < 75) return "warn";
    return "ok";
  };

  return {
    safety: statusFromScore(scored.safetyScore),
    scope: statusFromScore(scored.scopeScore),
    price: statusFromScore(scored.priceScore),
    fine_print: statusFromScore(scored.finePrintScore),
    warranty: statusFromScore(scored.warrantyScore),
  };
}

// ─── SafePreview Gatekeeper ───────────────────────────────────────────────────

const TOOLTIP_MAP: Record<
  PreviewFinding["pillar"],
  { flag: PreviewFinding; warn: PreviewFinding }
> = {
  Safety: {
    flag: { pillar: "Safety", severity: "flag", label: "Structural Risk", tooltip: "Structural Risk Detected. Gaps here can compromise installation integrity. Verify specs before you sign." },
    warn: { pillar: "Safety", severity: "warn", label: "Compliance Ambiguity", tooltip: "Compliance Ambiguity. Specs are vague enough to cause disputes later. Confirm approvals in writing." },
  },
  Scope: {
    flag: { pillar: "Scope", severity: "flag", label: "Significant Scope Gaps", tooltip: "Significant Scope Gaps. Missing install details can trigger change-orders. Lock the scope before you pay." },
    warn: { pillar: "Scope", severity: "warn", label: "Vague Install Notes", tooltip: "Vague Installation Notes. Room for 'that's not included' later. Require a written checklist." },
  },
  Price: {
    flag: { pillar: "Price", severity: "flag", label: "Financial Risk", tooltip: "Financial Risk Detected. Pricing patterns look off for your region. Validate before you commit." },
    warn: { pillar: "Price", severity: "warn", label: "Pricing Anomaly", tooltip: "Pricing Anomaly. Could be markup hiding in plain sight. Compare and confirm line-by-line." },
  },
  FinePrint: {
    flag: { pillar: "FinePrint", severity: "flag", label: "Predatory Clause Hint", tooltip: "Predatory Clause Hint. Terms may shift liability or money onto you. Protect yourself before signing." },
    warn: { pillar: "FinePrint", severity: "warn", label: "Weakened Protections", tooltip: "Weakened Protections. Standard homeowner safeguards look thin. Demand stronger terms." },
  },
  Warranty: {
    flag: { pillar: "Warranty", severity: "flag", label: "Significant Warranty Gaps", tooltip: "Significant Warranty Gaps. Ambiguity here becomes future liability. Confirm coverage in writing." },
    warn: { pillar: "Warranty", severity: "warn", label: "Limited Coverage", tooltip: "Limited Coverage. Short warranty windows can leave you exposed. Get the warranty clarified." },
  },
};

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

function bucketWarnings(count: number): SafePreview["warningBucket"] {
  if (count <= 0) return "0";
  if (count <= 2) return "1-2";
  if (count <= 4) return "3+";
  return "5+";
}

function computeRiskLevel(score: number): SafePreview["riskLevel"] {
  if (score < 60) return "Critical";
  if (score < 80) return "Moderate";
  return "Acceptable";
}

/**
 * generateSafePreview — the gatekeeper.
 * - Censors greens (ok pillars never appear)
 * - Returns max 3 findings, flags first
 * - Rounds score to nearest 5
 * - Buckets warning count (fog)
 * - Hard-cap aware only via score/riskLevel (no statute leaks)
 */
export function generateSafePreview(scored: ScoredResult): SafePreview {
  const overallScore = roundToNearest5(scored.overallScore ?? 0);
  const finalGrade = scored.finalGrade ?? "—";
  const riskLevel = computeRiskLevel(overallScore);

  // Use real warning count if present; otherwise fall back to pillar findings
  const warningCount = Array.isArray(scored.warnings) ? scored.warnings.length : 0;

  // Derive statuses
  const statuses = scored.pillarStatuses;

  // Build vulnerability-only findings (no greens)
  const findings: PreviewFinding[] = [];

  const map: Array<{ key: PillarKey; pillar: PreviewFinding["pillar"] }> = [
    { key: "safety", pillar: "Safety" },
    { key: "scope", pillar: "Scope" },
    { key: "price", pillar: "Price" },
    { key: "fine_print", pillar: "FinePrint" },
    { key: "warranty", pillar: "Warranty" },
  ];

  for (const { key, pillar } of map) {
    const status = statuses[key];
    if (status === "flag") findings.push(TOOLTIP_MAP[pillar].flag);
    if (status === "warn") findings.push(TOOLTIP_MAP[pillar].warn);
    // ok is intentionally omitted ("Censor the Greens")
  }

  // Severity sort: flags first
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "flag" ? -1 : 1));

  // If truly clean: return empty findings (no praise leak)
  if (warningCount === 0 && findings.length === 0) {
    return {
      overallScore,
      finalGrade,
      riskLevel: "Acceptable",
      warningBucket: "0",
      findings: [],
    };
  }

  // If warnings exist but findings are empty (edge case), still keep curiosity gap
  const effectiveCount = Math.max(warningCount, findings.length);

  return {
    overallScore,
    finalGrade,
    riskLevel,
    warningBucket: bucketWarnings(effectiveCount),
    findings: findings.slice(0, 3),
  };
}
