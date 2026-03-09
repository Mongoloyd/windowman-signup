/**
 * Fixture: low-confidence
 * Simulates a quote where OCR/AI had low confidence — scores cluster near 50
 * with null-ish pillar statuses defaulting to "warn".
 * No hard cap, but many items are ambiguous.
 */
import type { ScoredResult } from "@shared/scoredTypes";

export const FIXTURE_LOW_CONFIDENCE: ScoredResult = {
  overallScore: 51,
  finalGrade: "D",
  safetyScore: 50,
  scopeScore: 52,
  priceScore: 48,
  finePrintScore: 55,
  warrantyScore: 50,
  pillarStatuses: {
    safety: "warn",
    scope: "warn",
    price: "warn",
    fine_print: "warn",
    warranty: "warn",
  },
  warnings: [
    {
      text: "Document quality was poor — some text could not be reliably extracted.",
      pillar: "general",
      severity: "warning",
    },
    {
      text: "Safety section partially illegible — license number may be present but unreadable.",
      pillar: "safety",
      severity: "warning",
    },
    {
      text: "Scope details are ambiguous — could not determine exact window count.",
      pillar: "scope",
      severity: "warning",
    },
    {
      text: "Price total found but line items are blurred or missing.",
      pillar: "price",
      severity: "warning",
    },
    {
      text: "Fine print section appears to exist but text extraction failed for 40% of content.",
      pillar: "fine_print",
      severity: "warning",
    },
    {
      text: "Warranty terms mentioned but duration and coverage details are unclear.",
      pillar: "warranty",
      severity: "warning",
    },
  ],
  missingItems: [
    {
      text: "Missing: Could not confirm contractor license number (may be present but unreadable).",
      pillar: "safety",
      severity: "warning",
    },
    {
      text: "Missing: Itemized pricing breakdown not detected.",
      pillar: "price",
      severity: "warning",
    },
  ],
  hardCap: {
    applied: false,
    reason: null,
    statute: null,
    ceiling: null,
  },
};

export const FIXTURE_LOW_CONFIDENCE_SIGNALS: Record<string, unknown> = {
  depositRisk: false,
  cancellationTrap: false,
  arbitrationClause: false,
  permitGap: false,
  insuranceGap: false,
  changeOrderRisk: false,
  warrantyVoid: false,
  materialSubstitution: false,
};
