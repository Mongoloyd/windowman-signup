/**
 * comparisonEngine.ts
 *
 * Pure deterministic comparison engine for WindowMan quote analysis.
 * No LLM logic. No randomness. Same inputs → same output always.
 *
 * Tier 1: Statutory & Survival Disqualifiers
 * Tier 2: Permit Tie-Breaker
 * Tier 3: Score + Tie-band (abs(delta) < 3 → force tie)
 */

import type { ExtractionSignals } from "../scanner-brain/schema";
import type { ScoredResult, PillarKey, PillarStatus } from "../scanner-brain/scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Liability = { label: string; cost: number };

export type LiabilityRule = {
  label: string;
  cost: number;
  applies: (s: ExtractionSignals) => boolean;
};

export type CompareInput = {
  id: string;
  signals: ExtractionSignals;
  scored: ScoredResult;
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

// ─── Liability Rules (Default Mode: penalize only explicit false) ─────────────

export const LIABILITY_RULES: LiabilityRule[] = [
  {
    label: "Permit & expediting liability",
    cost: 1200,
    applies: (s) => s.permit_included === false,
  },
  {
    label: "Inspection coordination liability",
    cost: 250,
    applies: (s) => s.inspection_included === false,
  },
  {
    label: "Debris hauling/disposal liability",
    cost: 450,
    applies: (s) => s.debris_cleanup_included === false,
  },
  {
    label: "Short labor warranty service-call risk",
    cost: 500,
    applies: (s) =>
      typeof s.labor_warranty_years === "number" && s.labor_warranty_years < 2,
  },
  {
    label: "Lien waiver omission legal exposure (risk-weighted)",
    cost: 2000,
    applies: (s) => s.lien_waiver_mentioned === false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computeLiabilities(signals: ExtractionSignals): Liability[] {
  return LIABILITY_RULES.filter((rule) => rule.applies(signals)).map((rule) => ({
    label: rule.label,
    cost: rule.cost,
  }));
}

function computeAdjustedPrice(
  base: number | null,
  liabilities: Liability[]
): number | null {
  if (base === null) return null; // never fake dollars
  return base + liabilities.reduce((sum, l) => sum + l.cost, 0);
}

/** Pillar status order: ok > warn > flag */
const STATUS_ORDER: Record<PillarStatus, number> = { ok: 2, warn: 1, flag: 0 };

function betterStatus(a: PillarStatus, b: PillarStatus): "a" | "b" | "tie" {
  if (STATUS_ORDER[a] > STATUS_ORDER[b]) return "a";
  if (STATUS_ORDER[b] > STATUS_ORDER[a]) return "b";
  return "tie";
}

function worseStatus(a: PillarStatus, b: PillarStatus): PillarStatus {
  return STATUS_ORDER[a] <= STATUS_ORDER[b] ? a : b;
}

// ─── Pillar Labels (Deterministic from Signals) ───────────────────────────────

function getPillarLabels(
  signals: ExtractionSignals
): Record<PillarKey, string> {
  return {
    scope: signals.permit_included === true
      ? "Permit Included"
      : signals.permit_included === false
      ? "Permit Not Included"
      : "Permit Not Mentioned",
    fine_print: signals.cancellation_clause === true
      ? "Cancellation Clause Present"
      : signals.cancellation_clause === false
      ? "No Cancellation Clause"
      : "Cancellation Not Mentioned",
    price: signals.payment_schedule_described === true
      ? "Payment Schedule Described"
      : signals.payment_schedule_described === false
      ? "Payment Schedule Missing"
      : "Payment Schedule Not Mentioned",
    warranty: typeof signals.labor_warranty_years === "number"
      ? `${signals.labor_warranty_years}yr Labor Warranty`
      : "Warranty Not Stated",
    safety: signals.design_pressure_listed === true
      ? "DP Listed"
      : "Safety Signals Present",
  };
}

// ─── Negotiation Scripts (Deterministic, 3 bullets) ──────────────────────────

type NegotiationRule = {
  applies: (s: ExtractionSignals) => boolean;
  text: (s: ExtractionSignals) => string;
  targetAnchor: string;
};

const NEGOTIATION_RULES: NegotiationRule[] = [
  {
    applies: (s) => s.cancellation_clause === false,
    text: () =>
      "Add a 3-day right-of-rescission clause per Florida Statute §501.021. This is a statutory right — any contractor who refuses to include it is a red flag.",
    targetAnchor: "#fineprint-cancellation",
  },
  {
    applies: (s) => s.deposit_exceeds_statutory_limit === true,
    text: (s) => {
      const pct = s.deposit_percentage != null ? `${s.deposit_percentage}%` : "the requested deposit";
      return `Florida law caps deposits at 10% before work begins. ${pct} exceeds this limit. Request a revised payment schedule or walk away.`;
    },
    targetAnchor: "#price-deposit",
  },
  {
    applies: (s) => s.permit_included === false || s.permit_included === null,
    text: (s) =>
      s.permit_included === false
        ? "Permits are required for window replacement in Florida. Demand written confirmation that permits are included in the quoted price — unpermitted work voids your homeowner's insurance."
        : "Confirm in writing whether permits are included. Unpermitted window replacements can void homeowner's insurance and create resale complications.",
    targetAnchor: "#scope-permits",
  },
  {
    applies: (s) => s.lien_waiver_mentioned === false,
    text: () =>
      "Request a lien waiver upon final payment. Without it, subcontractors can place a lien on your property even after you've paid the general contractor in full.",
    targetAnchor: "#fineprint-lienwaiver",
  },
  {
    applies: (s) => s.arbitration_clause === true,
    text: () =>
      "The contract includes a mandatory arbitration clause that waives your right to sue in court. Request removal or ensure it includes a carve-out for claims under $10,000.",
    targetAnchor: "#fineprint-arbitration",
  },
  {
    applies: (s) =>
      typeof s.labor_warranty_years === "number" && s.labor_warranty_years < 2,
    text: (s) =>
      `The labor warranty is only ${s.labor_warranty_years} year(s). Industry standard is 2+ years. Request an extended labor warranty in writing before signing.`,
    targetAnchor: "#warranty-labor",
  },
  {
    applies: (s) => s.inspection_included === false,
    text: () =>
      "Inspection coordination is not included. Confirm who is responsible for scheduling the final inspection — this is required to close the permit and avoid fines.",
    targetAnchor: "#scope-inspection",
  },
  {
    applies: (s) => s.debris_cleanup_included === false,
    text: () =>
      "Debris removal is not included. Get written confirmation of who handles disposal — dumpster fees and hauling can add $300–$600 to your total cost.",
    targetAnchor: "#scope-debris",
  },
];

function buildNegotiationScripts(
  loserSignals: ExtractionSignals
): { text: string; targetAnchor: string }[] {
  const scripts: { text: string; targetAnchor: string }[] = [];
  for (const rule of NEGOTIATION_RULES) {
    if (scripts.length >= 3) break;
    if (rule.applies(loserSignals)) {
      scripts.push({
        text: rule.text(loserSignals),
        targetAnchor: rule.targetAnchor,
      });
    }
  }
  // Pad to exactly 3 if fewer issues found
  const fallbacks = [
    {
      text: "Request a detailed itemized breakdown of all labor and material costs before signing. This gives you leverage to negotiate line-by-line.",
      targetAnchor: "#findings",
    },
    {
      text: "Ask for references from at least 3 recent jobs in your county. Verify the contractor's license is active at myfloridalicense.com before signing.",
      targetAnchor: "#findings",
    },
    {
      text: "Get a written completion timeline with a penalty clause for delays. Vague timelines are a common source of disputes.",
      targetAnchor: "#findings",
    },
  ];
  let fi = 0;
  while (scripts.length < 3 && fi < fallbacks.length) {
    scripts.push(fallbacks[fi++]);
  }
  return scripts.slice(0, 3);
}

// ─── Tier 1: Statutory Disqualifiers ─────────────────────────────────────────

function isDisqualified(signals: ExtractionSignals): boolean {
  return (
    signals.deposit_exceeds_statutory_limit === true ||
    signals.cancellation_clause === false ||
    signals.document_is_window_door_related === false
  );
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function compareFromSignals(
  a: CompareInput,
  b: CompareInput
): ComparisonResult {
  const PILLAR_KEYS: PillarKey[] = ["safety", "scope", "price", "fine_print", "warranty"];

  // ── Confidence ──────────────────────────────────────────────────────────────
  const confidence = clamp01(
    Math.min(a.signals.confidence_score ?? 0, b.signals.confidence_score ?? 0)
  );

  // ── Pricing ─────────────────────────────────────────────────────────────────
  const liabilitiesA = computeLiabilities(a.signals);
  const liabilitiesB = computeLiabilities(b.signals);
  const baseA = typeof a.signals.total_price === "number" ? a.signals.total_price : null;
  const baseB = typeof b.signals.total_price === "number" ? b.signals.total_price : null;
  const adjustedA = computeAdjustedPrice(baseA, liabilitiesA);
  const adjustedB = computeAdjustedPrice(baseB, liabilitiesB);
  const effectiveDelta =
    adjustedA !== null && adjustedB !== null ? adjustedB - adjustedA : null;

  // ── Pillar Diff ──────────────────────────────────────────────────────────────
  const labelsA = getPillarLabels(a.signals);
  const labelsB = getPillarLabels(b.signals);
  const pillardiff = {} as ComparisonResult["pillardiff"];

  for (const key of PILLAR_KEYS) {
    const statusA = a.scored.pillarStatuses[key];
    const statusB = b.scored.pillarStatuses[key];
    const better = betterStatus(statusA, statusB);
    pillardiff[key] = {
      winnerId: better === "a" ? a.id : better === "b" ? b.id : "tie",
      labelA: labelsA[key],
      labelB: labelsB[key],
      severity: worseStatus(statusA, statusB),
    };
  }

  // ── Tier 1: Statutory Disqualifiers ─────────────────────────────────────────
  const disqA = isDisqualified(a.signals);
  const disqB = isDisqualified(b.signals);

  if (disqA || disqB) {
    let winnerId: string | "tie";
    let verdictTitle: string;

    if (disqA && disqB) {
      winnerId = "tie";
      verdictTitle = "Both Quotes Have Critical Compliance Failures";
    } else if (disqA) {
      winnerId = b.id;
      verdictTitle = `Quote B is the Safer Investment`;
    } else {
      winnerId = a.id;
      verdictTitle = `Quote A is the Safer Investment`;
    }

    const loserSignals = disqA ? a.signals : b.signals;
    const negotiationScript = buildNegotiationScripts(loserSignals);

    return {
      meta: {
        winnerId,
        verdictTitle,
        verdictLevel: "Disqualified",
        confidence,
        decisionPath: "TIER_1",
        deltaScore: a.scored.overallScore - b.scored.overallScore,
      },
      pricing: {
        quoteA: { base: baseA, adjusted: adjustedA, liabilities: liabilitiesA },
        quoteB: { base: baseB, adjusted: adjustedB, liabilities: liabilitiesB },
        effectiveDelta,
      },
      pillardiff,
      negotiationScript,
    };
  }

  // ── Tier 2: Permit Tie-Breaker ───────────────────────────────────────────────
  const permitA = a.signals.permit_included;
  const permitB = b.signals.permit_included;

  if (permitA !== permitB) {
    // true beats null; true beats false; null beats false
    const aWins =
      (permitA === true && permitB !== true) ||
      (permitA === null && permitB === false);
    const bWins =
      (permitB === true && permitA !== true) ||
      (permitB === null && permitA === false);

    if (aWins || bWins) {
      const winnerId = aWins ? a.id : b.id;
      const loserSignals = aWins ? b.signals : a.signals;
      const negotiationScript = buildNegotiationScripts(loserSignals);

      return {
        meta: {
          winnerId,
          verdictTitle: `${aWins ? "Quote A" : "Quote B"} is the Safer Investment`,
          verdictLevel: "Slight Advantage",
          confidence,
          decisionPath: "TIER_2",
          deltaScore: a.scored.overallScore - b.scored.overallScore,
        },
        pricing: {
          quoteA: { base: baseA, adjusted: adjustedA, liabilities: liabilitiesA },
          quoteB: { base: baseB, adjusted: adjustedB, liabilities: liabilitiesB },
          effectiveDelta,
        },
        pillardiff,
        negotiationScript,
      };
    }
  }

  // ── Tier 3: Score + Tie-band ─────────────────────────────────────────────────
  const scoreA = a.scored.overallScore;
  const scoreB = b.scored.overallScore;
  const delta = scoreA - scoreB;
  const absDelta = Math.abs(delta);

  // Tie-band: abs(delta) < 3 → force tie
  const isTie = absDelta < 3;
  const winnerId = isTie ? "tie" : delta > 0 ? a.id : b.id;

  let verdictLevel: ComparisonResult["meta"]["verdictLevel"];
  let verdictTitle: string;

  if (isTie) {
    verdictLevel = "Statistical Tie";
    verdictTitle = "Statistically Equal Risk";
  } else if (absDelta > 10) {
    verdictLevel = "Clear Advantage";
    verdictTitle = `${delta > 0 ? "Quote A" : "Quote B"} is the Safer Investment`;
  } else {
    verdictLevel = "Slight Advantage";
    verdictTitle = `${delta > 0 ? "Quote A" : "Quote B"} is the Safer Investment`;
  }

  const loserSignals = isTie
    ? a.signals // for tie, use A's signals for scripts
    : delta > 0
    ? b.signals
    : a.signals;

  const negotiationScript = buildNegotiationScripts(loserSignals);

  return {
    meta: {
      winnerId,
      verdictTitle,
      verdictLevel,
      confidence,
      decisionPath: "TIER_3",
      deltaScore: delta,
    },
    pricing: {
      quoteA: { base: baseA, adjusted: adjustedA, liabilities: liabilitiesA },
      quoteB: { base: baseB, adjusted: adjustedB, liabilities: liabilitiesB },
      effectiveDelta,
    },
    pillardiff,
    negotiationScript,
  };
}
