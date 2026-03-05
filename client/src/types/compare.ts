/**
 * compare.ts
 * Client-safe mirror of ComparisonResult from server/services/comparisonEngine.ts.
 * Keep in sync manually — these types are used by the Compare UI components.
 */

export type PillarKey = "safety" | "scope" | "price" | "fine_print" | "warranty";
export type PillarStatus = "ok" | "warn" | "flag";

export type Liability = {
  label: string;
  cost: number;
};

export interface ComparisonResult {
  meta: {
    winnerId: string | "tie";
    verdictTitle: string;
    verdictLevel: "Clear Advantage" | "Slight Advantage" | "Statistical Tie" | "Disqualified";
    confidence: number; // 0..1
    decisionPath: "TIER_1" | "TIER_2" | "TIER_3";
    deltaScore: number; // A - B
  };
  pricing: {
    quoteA: { base: number | null; adjusted: number | null; liabilities: Liability[] };
    quoteB: { base: number | null; adjusted: number | null; liabilities: Liability[] };
    effectiveDelta: number | null; // adjustedB - adjustedA
  };
  pillardiff: Record<PillarKey, {
    winnerId: string | "tie";
    labelA: string;
    labelB: string;
    severity: PillarStatus;
  }>;
  negotiationScript: { text: string; targetAnchor: string }[];
}

export interface QuoteInfo {
  id: string;
  contractorLabel: string;
  basePrice: number | null;
  hasBasePrice: boolean;
}

export interface CompareQuotesResult {
  input: { idA: string; idB: string };
  quoteA: QuoteInfo;
  quoteB: QuoteInfo;
  comparison: ComparisonResult;
}
