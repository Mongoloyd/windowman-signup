/**
 * Client-safe mirror of the ScoredResult type from server/scanner-brain/scoring.ts.
 * Keep in sync manually — these types are used by the QuoteAnalysisTheater and
 * AnalysisReport components on the client side.
 */

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
  overchargeEstimate?: { low: number; high: number; currency: string };
};
