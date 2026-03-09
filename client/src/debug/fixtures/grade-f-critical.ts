/**
 * Fixture: grade-f-critical
 * A terrible quote with critical violations across multiple pillars.
 * Hard cap applied due to missing contractor license.
 */
import type { ScoredResult } from "@shared/scoredTypes";

export const FIXTURE_GRADE_F_CRITICAL: ScoredResult = {
  overallScore: 28,
  finalGrade: "F",
  safetyScore: 15,
  scopeScore: 35,
  priceScore: 22,
  finePrintScore: 30,
  warrantyScore: 40,
  pillarStatuses: {
    safety: "flag",
    scope: "flag",
    price: "flag",
    fine_print: "flag",
    warranty: "warn",
  },
  warnings: [
    {
      text: "No contractor license number found on quote.",
      pillar: "safety",
      severity: "critical",
    },
    {
      text: "No proof of insurance or bond referenced.",
      pillar: "safety",
      severity: "critical",
    },
    {
      text: "Scope is vague — 'replace windows as needed' with no specifications.",
      pillar: "scope",
      severity: "critical",
    },
    {
      text: "Quote price is 52% above regional average with no justification.",
      pillar: "price",
      severity: "critical",
    },
    {
      text: "50% deposit required upfront — exceeds legal limit in most states.",
      pillar: "price",
      severity: "critical",
    },
    {
      text: "Contract includes mandatory binding arbitration clause.",
      pillar: "fine_print",
      severity: "critical",
    },
    {
      text: "Cancellation penalty of 25% of total contract value.",
      pillar: "fine_print",
      severity: "critical",
    },
    {
      text: "Warranty excludes labor — materials only for 1 year.",
      pillar: "warranty",
      severity: "warning",
    },
  ],
  missingItems: [
    {
      text: "Missing: No permit plan or building code references.",
      pillar: "safety",
      severity: "critical",
    },
    {
      text: "Missing: No window specifications, brands, or energy ratings.",
      pillar: "scope",
      severity: "critical",
    },
    {
      text: "Missing: No itemized pricing breakdown.",
      pillar: "price",
      severity: "critical",
    },
    {
      text: "Missing: No completion timeline or penalty for delays.",
      pillar: "fine_print",
      severity: "warning",
    },
  ],
  hardCap: {
    applied: true,
    reason: "No contractor license number found. This is a legal requirement in all 50 states for work exceeding $500.",
    statute: "State Contractor Licensing Act (varies by state)",
    ceiling: 35,
  },
  overchargeEstimate: { low: 4200, high: 7800, currency: "USD" },
};

export const FIXTURE_GRADE_F_CRITICAL_SIGNALS: Record<string, unknown> = {
  depositRisk: true,
  cancellationTrap: true,
  arbitrationClause: true,
  permitGap: true,
  insuranceGap: true,
  changeOrderRisk: true,
  warrantyVoid: false,
  materialSubstitution: true,
};
