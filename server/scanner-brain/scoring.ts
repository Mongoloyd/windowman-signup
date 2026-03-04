import type { ExtractionSignals } from "./schema";

// ─── Tri-State Boolean Helpers (Phase 1 Patch) ──────────────────────────────
// null means "unknown or not mentioned". MUST NOT be treated as false.

export const isTrue = (v: boolean | null | undefined) => v === true;
export const isFalse = (v: boolean | null | undefined) => v === false;
export const isUnknown = (v: boolean | null | undefined) => v == null;

export const arr = <T>(v: T[] | null | undefined): T[] =>
  Array.isArray(v) ? v : [];

export const hasAny = <T>(v: T[] | null | undefined) =>
  arr(v).length > 0;

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
  pillarKey: PillarKey;
  pillarLabel: "Safety" | "Scope" | "Price" | "Fine Print" | "Warranty";
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

  if (isFalse(s.design_pressure_listed)) { score -= 15; missing.push("Design pressure not listed"); }
  if (isFalse(s.missile_impact_rated)) { score -= 15; missing.push("Missile impact rating not confirmed"); }
  if (!hasAny(s.noa_numbers)) { score -= 20; missing.push("No NOA numbers"); }
  if (!hasAny(s.fl_approval_numbers)) { score -= 10; missing.push("No FL approval numbers"); }
  if (!s.installation_method) { score -= 10; missing.push("Installation method not specified"); }
  if (isTrue(s.missing_noa)) { score -= 10; warnings.push("Impact products claimed but no NOA listed"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scoreScope(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (s.opening_count === null) { score -= 10; missing.push("Opening count not specified"); }
  if (!hasAny(s.product_types)) { score -= 10; missing.push("Product types not listed"); }
  if (isFalse(s.installation_included)) { score -= 15; missing.push("Installation not included"); }
  if (isFalse(s.removal_of_old_windows)) { score -= 5; missing.push("Old window removal not included"); }
  if (isFalse(s.permit_included)) { score -= 15; missing.push("Permit not included"); warnings.push("No permit reference"); }
  if (isFalse(s.inspection_included)) { score -= 10; missing.push("Inspection not included"); }
  if (isFalse(s.debris_cleanup_included)) { score -= 5; missing.push("Debris cleanup not included"); }
  if (isFalse(s.stucco_repair_included)) { score -= 5; missing.push("Stucco repair not included"); }
  if (isFalse(s.trim_wrap_included)) { score -= 5; missing.push("Trim wrap not included"); }
  if (isTrue(s.missing_permit_reference)) { score -= 10; warnings.push("Missing permit reference despite installation"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scorePrice(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (s.total_price === null) { score -= 20; missing.push("Total price not stated"); }
  if (isTrue(s.deposit_exceeds_statutory_limit)) { score -= 25; warnings.push("Deposit exceeds Florida statutory limit"); }
  if (isTrue(s.unusually_high_price)) { score -= 15; warnings.push("Price appears unusually high for region"); }
  if (isTrue(s.unusually_low_price)) { score -= 10; warnings.push("Price appears unusually low — potential bait"); }
  if (isFalse(s.payment_schedule_described)) { score -= 10; missing.push("Payment schedule not described"); }
  if (isFalse(s.tax_included)) { score -= 5; missing.push("Tax inclusion not stated"); }
  if (isTrue(s.today_only_pricing)) { score -= 15; warnings.push("Today-only pricing pressure tactic"); }

  return { score: Math.max(0, score), warnings, missing };
}

function scoreFinePrint(s: ExtractionSignals): { score: number; warnings: string[]; missing: string[] } {
  let score = 100;
  const warnings: string[] = [];
  const missing: string[] = [];

  if (isFalse(s.cancellation_clause)) { score -= 20; missing.push("No cancellation clause"); warnings.push("Missing cancellation clause"); }
  if (isTrue(s.cancellation_clause) && s.cancellation_window_days !== null && s.cancellation_window_days < 3) {
    score -= 15; warnings.push("Cancellation window less than 3 days (FL statute requires 3)");
  }
  if (isFalse(s.change_order_clause)) { score -= 10; missing.push("No change order clause"); }
  if (isFalse(s.lien_waiver_mentioned)) { score -= 10; missing.push("No lien waiver mentioned"); }
  if (isTrue(s.arbitration_clause)) { score -= 10; warnings.push("Mandatory arbitration clause present"); }
  if (isTrue(s.escalation_clause)) { score -= 10; warnings.push("Price escalation clause present"); }
  if (isFalse(s.completion_timeline_stated)) { score -= 10; missing.push("No completion timeline stated"); }
  if (isFalse(s.insurance_proof_mentioned)) { score -= 5; missing.push("No insurance proof mentioned"); }
  if (isFalse(s.license_number_on_contract)) { score -= 5; missing.push("License number not on contract"); }
  if (isTrue(s.pressure_tactics_detected)) { score -= 15; warnings.push("Pressure tactics detected"); }
  if (isTrue(s.verbal_promises_noted)) { score -= 10; warnings.push("Verbal promises noted — not in writing"); }

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

  if (isFalse(s.warranty_transferable)) { score -= 10; missing.push("Warranty not transferable"); }
  if (isTrue(s.warranty_exclusions_noted)) { score -= 5; warnings.push("Warranty exclusions noted"); }
  if (isTrue(s.lifetime_warranty_claimed) && s.manufacturer_warranty_years !== null && s.manufacturer_warranty_years < 25) {
    score -= 10; warnings.push("Lifetime warranty claimed but years < 25");
  }

  return { score: Math.max(0, score), warnings, missing };
}

function applyHardCaps(signals: ExtractionSignals, overallScore: number): { score: number; hardCap: HardCapResult } {
  // Hard cap: deposit exceeds statutory limit
  if (isTrue(signals.deposit_exceeds_statutory_limit)) {
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
  if (isTrue(signals.pressure_tactics_detected) && isTrue(signals.today_only_pricing)) {
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
  if (isFalse(signals.cancellation_clause)) {
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
  if (isFalse(signals.document_is_window_door_related)) {
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

  // Build partial result first, then derive pillar statuses from it
  const partialResult = {
    overallScore: cappedScore,
    finalGrade,
    safetyScore: safety.score,
    scopeScore: scope.score,
    priceScore: price.score,
    finePrintScore: finePrint.score,
    warrantyScore: warranty.score,
    pillarStatuses: {} as PillarStatuses, // placeholder
    warnings: allWarnings,
    missingItems: allMissing,
    hardCap,
  };

  partialResult.pillarStatuses = derivePillarStatuses(partialResult);

  return partialResult;
}

// ─── Phase 3 Patch: SafePreview + Pillar Status Bridge ──────────────────────

function statusFromScore(score: number): PillarStatus {
  if (score < 50) return "flag";
  if (score < 75) return "warn";
  return "ok";
}

/**
 * derivePillarStatuses — converts component scores into ok/warn/flag.
 * Hard-cap aware: if hardCap is applied, fine_print is forced to "flag".
 */
export function derivePillarStatuses(scored: ScoredResult): PillarStatuses {
  const base: PillarStatuses = {
    safety: statusFromScore(scored.safetyScore),
    scope: statusFromScore(scored.scopeScore),
    price: statusFromScore(scored.priceScore),
    fine_print: statusFromScore(scored.finePrintScore),
    warranty: statusFromScore(scored.warrantyScore),
  };

  if (scored.hardCap?.applied) {
    base.fine_print = "flag";
  }

  return base;
}

// ─── Label + Tooltip Maps ───────────────────────────────────────────────────

const PILLAR_LABEL: Record<PillarKey, PreviewFinding["pillarLabel"]> = {
  safety: "Safety",
  scope: "Scope",
  price: "Price",
  fine_print: "Fine Print",
  warranty: "Warranty",
};

const TOOLTIP_MAP: Record<
  PillarKey,
  {
    flag: Omit<PreviewFinding, "pillarKey" | "pillarLabel">;
    warn: Omit<PreviewFinding, "pillarKey" | "pillarLabel">;
  }
> = {
  safety: {
    flag: {
      severity: "flag",
      label: "Structural Risk",
      tooltip:
        "Missing or unclear NOA/DP/impact evidence. Hurricane compliance may fail inspection.",
    },
    warn: {
      severity: "warn",
      label: "Compliance Ambiguity",
      tooltip:
        "Some compliance signals present, but key documentation is incomplete or vague.",
    },
  },
  scope: {
    flag: {
      severity: "flag",
      label: "Scope Gaps",
      tooltip:
        "Install scope is missing critical details (permits, repairs, demo, waterproofing, cleanup).",
    },
    warn: {
      severity: "warn",
      label: "Vague Install Notes",
      tooltip:
        "Scope includes basics but lacks clarity on repairs, methods, or responsibilities.",
    },
  },
  price: {
    flag: {
      severity: "flag",
      label: "Financial Risk",
      tooltip:
        "Price structure is abnormal for Florida market norms given scope and product details.",
    },
    warn: {
      severity: "warn",
      label: "Pricing Anomaly",
      tooltip:
        "Price may be elevated or unclear. Verify line items and compare another quote.",
    },
  },
  fine_print: {
    flag: {
      severity: "flag",
      label: "Contract Trap Risk",
      tooltip:
        "Payment terms or clauses create outsized homeowner risk.",
    },
    warn: {
      severity: "warn",
      label: "Weakened Protections",
      tooltip:
        "Fine print contains gaps in payment schedule, cancellation window, or change orders.",
    },
  },
  warranty: {
    flag: {
      severity: "flag",
      label: "Warranty Gaps",
      tooltip:
        "Warranty language missing or unclear. Future liability may fall on the homeowner.",
    },
    warn: {
      severity: "warn",
      label: "Limited Coverage",
      tooltip:
        "Warranty exists but may lack labor coverage or transferability.",
    },
  },
};

// ─── Utility Functions ──────────────────────────────────────────────────────

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

function computeRiskLevel(score: number): SafePreview["riskLevel"] {
  if (score < 60) return "Critical";
  if (score < 80) return "Moderate";
  return "Acceptable";
}

function bucketWarnings(count: number): SafePreview["warningBucket"] {
  if (count <= 0) return "0";
  if (count <= 2) return "1-2";
  if (count <= 4) return "3+";
  return "5+";
}

// ─── SafePreview Gatekeeper ─────────────────────────────────────────────────

/**
 * generateSafePreview — the gatekeeper.
 * - Censors greens (ok pillars never appear)
 * - Returns max 3 findings, flags first
 * - Rounds score to nearest 5
 * - Buckets warning count (fog)
 * - Hard-cap aware: derivePillarStatuses forces fine_print to flag when hardCap applied
 */
export function generateSafePreview(scored: ScoredResult): SafePreview {
  const overallScore = roundToNearest5(scored.overallScore ?? 0);
  const finalGrade = scored.finalGrade ?? "—";
  const riskLevel = computeRiskLevel(overallScore);

  const pillarStatuses = derivePillarStatuses(scored);

  const findings: PreviewFinding[] = (
    Object.keys(pillarStatuses) as PillarKey[]
  )
    .flatMap((pillarKey) => {
      const status = pillarStatuses[pillarKey];

      if (status === "ok") return []; // Censor the Greens

      const tpl =
        status === "flag"
          ? TOOLTIP_MAP[pillarKey].flag
          : TOOLTIP_MAP[pillarKey].warn;

      return [
        {
          pillarKey,
          pillarLabel: PILLAR_LABEL[pillarKey],
          ...tpl,
        },
      ];
    })
    .sort((a, b) =>
      a.severity === b.severity
        ? 0
        : a.severity === "flag"
        ? -1
        : 1
    );

  const warningCount =
    (scored.warnings?.length ?? 0) +
    (scored.missingItems?.length ?? 0);

  if (findings.length === 0) {
    return {
      overallScore,
      finalGrade,
      riskLevel: "Acceptable",
      warningBucket: "0",
      findings: [],
    };
  }

  return {
    overallScore,
    finalGrade,
    riskLevel,
    warningBucket: bucketWarnings(warningCount || findings.length),
    findings: findings.slice(0, 3),
  };
}
