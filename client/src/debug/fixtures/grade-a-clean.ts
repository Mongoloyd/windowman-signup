/**
 * Fixture: grade-a-clean
 * A near-perfect quote with all pillars passing.
 * No warnings, no missing items, no hard cap.
 */
import type { ScoredResult } from "@shared/scoredTypes";

export const FIXTURE_GRADE_A_CLEAN: ScoredResult = {
  overallScore: 92,
  finalGrade: "A",
  safetyScore: 95,
  scopeScore: 90,
  priceScore: 88,
  finePrintScore: 93,
  warrantyScore: 91,
  pillarStatuses: {
    safety: "ok",
    scope: "ok",
    price: "ok",
    fine_print: "ok",
    warranty: "ok",
  },
  warnings: [],
  missingItems: [],
  hardCap: {
    applied: false,
    reason: null,
    statute: null,
    ceiling: null,
  },
  overchargeEstimate: { low: 0, high: 200, currency: "USD" },
};

export const FIXTURE_GRADE_A_CLEAN_SIGNALS: Record<string, unknown> = {
  depositRisk: false,
  cancellationTrap: false,
  arbitrationClause: false,
  permitGap: false,
  insuranceGap: false,
  changeOrderRisk: false,
  warrantyVoid: false,
  materialSubstitution: false,
};
