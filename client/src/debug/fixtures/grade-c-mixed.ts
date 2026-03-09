/**
 * Fixture: grade-c-mixed
 * A mediocre quote with a mix of warnings and one flag.
 * Price is flagged, fine print has warnings.
 */
import type { ScoredResult } from "@shared/scoredTypes";

export const FIXTURE_GRADE_C_MIXED: ScoredResult = {
  overallScore: 62,
  finalGrade: "C",
  safetyScore: 78,
  scopeScore: 70,
  priceScore: 42,
  finePrintScore: 55,
  warrantyScore: 68,
  pillarStatuses: {
    safety: "ok",
    scope: "warn",
    price: "flag",
    fine_print: "warn",
    warranty: "ok",
  },
  warnings: [
    {
      text: "Scope of work does not specify window brand or model numbers.",
      pillar: "scope",
      severity: "warning",
    },
    {
      text: "Fine print includes a broad liability waiver that may limit your recourse.",
      pillar: "fine_print",
      severity: "warning",
    },
    {
      text: "Quote price is 28% above regional average for comparable scope.",
      pillar: "price",
      severity: "critical",
    },
    {
      text: "No mention of disposal fees for old windows — may be added later.",
      pillar: "price",
      severity: "warning",
    },
  ],
  missingItems: [
    {
      text: "Missing: Permit responsibility not assigned in contract.",
      pillar: "scope",
      severity: "warning",
    },
    {
      text: "Missing: No cancellation policy or cooling-off period stated.",
      pillar: "fine_print",
      severity: "warning",
    },
  ],
  hardCap: {
    applied: false,
    reason: null,
    statute: null,
    ceiling: null,
  },
  overchargeEstimate: { low: 1800, high: 3200, currency: "USD" },
};

export const FIXTURE_GRADE_C_MIXED_SIGNALS: Record<string, unknown> = {
  depositRisk: false,
  cancellationTrap: true,
  arbitrationClause: false,
  permitGap: true,
  insuranceGap: false,
  changeOrderRisk: true,
  warrantyVoid: false,
  materialSubstitution: false,
};
