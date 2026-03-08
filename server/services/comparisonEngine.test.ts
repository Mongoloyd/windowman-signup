/**
 * comparisonEngine.test.ts
 * Moat unit tests for the deterministic comparison engine.
 * Tests: Tier 1 disqualifiers, Tier 2 permit, Tier 3 score tie-band,
 *        pricing null handling, negotiation scripts, liability computation.
 */

import { describe, it, expect } from "vitest";
import { compareFromSignals, LIABILITY_RULES } from "./comparisonEngine";
import type { CompareInput } from "./comparisonEngine";
import type { ExtractionSignals } from "../scanner-brain/schema";
import type { ScoredResult, ScoredItem } from "../scanner-brain/scoring";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSignals(overrides: Partial<ExtractionSignals> = {}): ExtractionSignals {
  return {
    // Defaults: all null / undefined (unknown state — not explicitly false)
    contractor_name: null,
    contractor_license: null,
    total_price: null,
    deposit_percentage: null,
    deposit_exceeds_statutory_limit: null,
    permit_included: null,
    inspection_included: null,
    debris_cleanup_included: null,
    labor_warranty_years: null,
    lien_waiver_mentioned: null,
    cancellation_clause: null,
    arbitration_clause: null,
    payment_schedule_described: null,
    design_pressure_listed: null,
    document_is_window_door_related: null,
    confidence_score: 0.9,
    ...overrides,
  } as ExtractionSignals;
}

function makeScored(overrides: Partial<ScoredResult> = {}): ScoredResult {
  return {
    overallScore: 75,
    finalGrade: "B",
    safetyScore: 75,
    scopeScore: 75,
    priceScore: 75,
    finePrintScore: 75,
    warrantyScore: 75,
    pillarStatuses: {
      safety: "ok",
      scope: "ok",
      price: "ok",
      fine_print: "ok",
      warranty: "ok",
    },
    warnings: [] as ScoredItem[],
    missingItems: [] as ScoredItem[],
    hardCap: {
      applied: false,
      reason: null,
      statute: null,
      ceiling: null,
    },
    ...overrides,
  } as unknown as ScoredResult;
}

function makeInput(id: string, signalOverrides: Partial<ExtractionSignals> = {}, scoredOverrides: Partial<ScoredResult> = {}): CompareInput {
  return {
    id,
    signals: makeSignals(signalOverrides),
    scored: makeScored(scoredOverrides),
  };
}

// ─── Tier 1: Statutory Disqualifiers ─────────────────────────────────────────

describe("Tier 1: Statutory Disqualifiers", () => {
  it("disqualifies quote A when deposit exceeds statutory limit", () => {
    const a = makeInput("a", { deposit_exceeds_statutory_limit: true });
    const b = makeInput("b");
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_1");
    expect(result.meta.verdictLevel).toBe("Disqualified");
    expect(result.meta.winnerId).toBe("b");
  });

  it("disqualifies quote B when no cancellation clause", () => {
    const a = makeInput("a");
    const b = makeInput("b", { cancellation_clause: false });
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_1");
    expect(result.meta.verdictLevel).toBe("Disqualified");
    expect(result.meta.winnerId).toBe("a");
  });

  it("disqualifies both when both have statutory failures", () => {
    const a = makeInput("a", { deposit_exceeds_statutory_limit: true });
    const b = makeInput("b", { cancellation_clause: false });
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_1");
    expect(result.meta.verdictLevel).toBe("Disqualified");
    expect(result.meta.winnerId).toBe("tie");
    expect(result.meta.verdictTitle).toContain("Both");
  });

  it("does NOT disqualify when cancellation_clause is null (unknown)", () => {
    // null = not mentioned, not explicitly false
    const a = makeInput("a", { cancellation_clause: null });
    const b = makeInput("b");
    const result = compareFromSignals(a, b);

    // Should NOT be TIER_1 (null is not a disqualifier)
    expect(result.meta.decisionPath).not.toBe("TIER_1");
  });

  it("disqualifies when document_is_window_door_related is false", () => {
    const a = makeInput("a", { document_is_window_door_related: false });
    const b = makeInput("b");
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_1");
    expect(result.meta.winnerId).toBe("b");
  });
});

// ─── Tier 2: Permit Tie-Breaker ───────────────────────────────────────────────

describe("Tier 2: Permit Tie-Breaker", () => {
  it("picks quote with permit_included=true over permit_included=null", () => {
    const a = makeInput("a", { permit_included: true });
    const b = makeInput("b", { permit_included: null });
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_2");
    expect(result.meta.winnerId).toBe("a");
  });

  it("picks quote with permit_included=null over permit_included=false", () => {
    const a = makeInput("a", { permit_included: null });
    const b = makeInput("b", { permit_included: false });
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_2");
    expect(result.meta.winnerId).toBe("a");
  });

  it("picks quote with permit_included=true over permit_included=false", () => {
    const a = makeInput("a", { permit_included: false });
    const b = makeInput("b", { permit_included: true });
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_2");
    expect(result.meta.winnerId).toBe("b");
  });

  it("falls through to Tier 3 when both have same permit status", () => {
    const a = makeInput("a", { permit_included: true });
    const b = makeInput("b", { permit_included: true });
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_3");
  });
});

// ─── Tier 3: Score + Tie-band ─────────────────────────────────────────────────

describe("Tier 3: Score + Tie-band", () => {
  it("forces tie when abs(delta) < 3", () => {
    const a = makeInput("a", {}, { overallScore: 75 });
    const b = makeInput("b", {}, { overallScore: 73 }); // delta = 2 < 3
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_3");
    expect(result.meta.verdictLevel).toBe("Statistical Tie");
    expect(result.meta.winnerId).toBe("tie");
  });

  it("forces tie when delta is exactly 0", () => {
    const a = makeInput("a", {}, { overallScore: 80 });
    const b = makeInput("b", {}, { overallScore: 80 });
    const result = compareFromSignals(a, b);

    expect(result.meta.verdictLevel).toBe("Statistical Tie");
    expect(result.meta.winnerId).toBe("tie");
  });

  it("picks winner when delta >= 3", () => {
    const a = makeInput("a", {}, { overallScore: 80 });
    const b = makeInput("b", {}, { overallScore: 75 }); // delta = 5 >= 3
    const result = compareFromSignals(a, b);

    expect(result.meta.decisionPath).toBe("TIER_3");
    expect(result.meta.winnerId).toBe("a");
    expect(result.meta.deltaScore).toBe(5);
  });

  it("picks B as winner when B has higher score", () => {
    const a = makeInput("a", {}, { overallScore: 60 });
    const b = makeInput("b", {}, { overallScore: 75 });
    const result = compareFromSignals(a, b);

    expect(result.meta.winnerId).toBe("b");
    expect(result.meta.deltaScore).toBe(-15);
  });

  it("returns Clear Advantage when delta > 10", () => {
    const a = makeInput("a", {}, { overallScore: 90 });
    const b = makeInput("b", {}, { overallScore: 75 });
    const result = compareFromSignals(a, b);

    expect(result.meta.verdictLevel).toBe("Clear Advantage");
  });

  it("returns Slight Advantage when 3 <= delta <= 10", () => {
    const a = makeInput("a", {}, { overallScore: 80 });
    const b = makeInput("b", {}, { overallScore: 75 }); // delta = 5
    const result = compareFromSignals(a, b);

    expect(result.meta.verdictLevel).toBe("Slight Advantage");
  });
});

// ─── Pricing: Null Handling ───────────────────────────────────────────────────

describe("Pricing: Null Handling", () => {
  it("returns null adjusted price when base price is missing", () => {
    const a = makeInput("a", { total_price: null });
    const b = makeInput("b", { total_price: 5000 });
    const result = compareFromSignals(a, b);

    expect(result.pricing.quoteA.base).toBeNull();
    expect(result.pricing.quoteA.adjusted).toBeNull();
    expect(result.pricing.quoteB.base).toBe(5000);
  });

  it("returns null effectiveDelta when either base price is missing", () => {
    const a = makeInput("a", { total_price: null });
    const b = makeInput("b", { total_price: 5000 });
    const result = compareFromSignals(a, b);

    expect(result.pricing.effectiveDelta).toBeNull();
  });

  it("computes effectiveDelta correctly when both prices present", () => {
    const a = makeInput("a", {
      total_price: 5000,
      permit_included: false, // +1200 liability
    });
    const b = makeInput("b", { total_price: 6000 });
    const result = compareFromSignals(a, b);

    // A adjusted = 5000 + 1200 = 6200
    // B adjusted = 6000 + 0 = 6000
    // effectiveDelta = adjustedB - adjustedA = 6000 - 6200 = -200
    expect(result.pricing.quoteA.adjusted).toBe(6200);
    expect(result.pricing.quoteB.adjusted).toBe(6000);
    expect(result.pricing.effectiveDelta).toBe(-200);
  });

  it("does NOT add liability when signal is null (unknown)", () => {
    // permit_included = null → rule applies only when explicitly false
    const a = makeInput("a", { total_price: 5000, permit_included: null });
    const result = compareFromSignals(a, makeInput("b", { total_price: 5000 }));

    expect(result.pricing.quoteA.liabilities.some(l => l.label.includes("Permit"))).toBe(false);
  });

  it("adds permit liability only when permit_included is explicitly false", () => {
    const a = makeInput("a", { total_price: 5000, permit_included: false });
    const result = compareFromSignals(a, makeInput("b", { total_price: 5000 }));

    expect(result.pricing.quoteA.liabilities.some(l => l.label.includes("Permit"))).toBe(true);
    expect(result.pricing.quoteA.adjusted).toBe(5000 + 1200);
  });
});

// ─── Liability Rules ──────────────────────────────────────────────────────────

describe("Liability Rules", () => {
  it("applies all 5 rules when all flags are explicitly false/short", () => {
    const signals = makeSignals({
      permit_included: false,
      inspection_included: false,
      debris_cleanup_included: false,
      labor_warranty_years: 1, // < 2
      lien_waiver_mentioned: false,
    });

    const liabilities = LIABILITY_RULES.filter(r => r.applies(signals));
    expect(liabilities).toHaveLength(5);
  });

  it("applies no rules when all signals are null", () => {
    const signals = makeSignals();
    const liabilities = LIABILITY_RULES.filter(r => r.applies(signals));
    expect(liabilities).toHaveLength(0);
  });

  it("applies warranty rule only when labor_warranty_years < 2", () => {
    const rule = LIABILITY_RULES.find(r => r.label.includes("warranty"))!;
    expect(rule.applies(makeSignals({ labor_warranty_years: 1 }))).toBe(true);
    expect(rule.applies(makeSignals({ labor_warranty_years: 2 }))).toBe(false);
    expect(rule.applies(makeSignals({ labor_warranty_years: null }))).toBe(false);
  });
});

// ─── Negotiation Scripts ──────────────────────────────────────────────────────

describe("Negotiation Scripts", () => {
  it("always returns exactly 3 scripts", () => {
    // Even with no issues, should pad to 3
    const a = makeInput("a", {}, { overallScore: 80 });
    const b = makeInput("b", {}, { overallScore: 75 });
    const result = compareFromSignals(a, b);

    expect(result.negotiationScript).toHaveLength(3);
  });

  it("returns 3 scripts even when no issues found (fallback padding)", () => {
    // All signals null → no rules apply → should pad with fallbacks
    const a = makeInput("a", {}, { overallScore: 80 });
    const b = makeInput("b", {}, { overallScore: 75 });
    const result = compareFromSignals(a, b);

    expect(result.negotiationScript.length).toBe(3);
    expect(result.negotiationScript[0].text.length).toBeGreaterThan(10);
  });

  it("includes deposit script when deposit exceeds statutory limit", () => {
    // Both disqualified so scripts come from loser (a)
    const a = makeInput("a", { deposit_exceeds_statutory_limit: true });
    const b = makeInput("b", { cancellation_clause: false });
    const result = compareFromSignals(a, b);

    // loserSignals = a.signals (disqA is true)
    const hasDepositScript = result.negotiationScript.some(s =>
      s.text.toLowerCase().includes("deposit") || s.text.toLowerCase().includes("10%")
    );
    expect(hasDepositScript).toBe(true);
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe("Determinism", () => {
  it("returns identical results for same inputs called twice", () => {
    const a = makeInput("a", { permit_included: true, total_price: 5000 }, { overallScore: 80 });
    const b = makeInput("b", { permit_included: false, total_price: 6000 }, { overallScore: 70 });

    const r1 = compareFromSignals(a, b);
    const r2 = compareFromSignals(a, b);

    expect(r1.meta.winnerId).toBe(r2.meta.winnerId);
    expect(r1.meta.decisionPath).toBe(r2.meta.decisionPath);
    expect(r1.pricing.effectiveDelta).toBe(r2.pricing.effectiveDelta);
    expect(r1.negotiationScript[0].text).toBe(r2.negotiationScript[0].text);
  });
});
