import { describe, it, expect } from "vitest";
import {
  generateSafePreview,
  type ScoredResult,
  type PillarStatuses,
  type HardCapResult,
} from "./scanner-brain/scoring";

// ─── Test Helpers ──────────────────────────────────────────────────────────────

const NO_HARD_CAP: HardCapResult = {
  applied: false,
  reason: null,
  statute: null,
  ceiling: null,
};

function makeScoredResult(overrides: Partial<ScoredResult> = {}): ScoredResult {
  const defaults: ScoredResult = {
    overallScore: 75,
    finalGrade: "C",
    safetyScore: 75,
    scopeScore: 75,
    priceScore: 75,
    finePrintScore: 75,
    warrantyScore: 75,
    pillarStatuses: {
      safety: "warn",
      scope: "warn",
      price: "warn",
      fine_print: "warn",
      warranty: "warn",
    },
    warnings: [],
    missingItems: [],
    hardCap: NO_HARD_CAP,
  };
  return { ...defaults, ...overrides };
}

// ─── Phase 4 Acceptance Tests ──────────────────────────────────────────────────

describe("generateSafePreview — CRO Preview Constraints", () => {
  // Test 1: No Green Leakage
  it("does NOT include a pillar with score >= 75 (ok) in findings", () => {
    const scored = makeScoredResult({
      safetyScore: 90, // ok — must NOT appear
      scopeScore: 40, // flag
      priceScore: 60, // warn
      finePrintScore: 80, // ok — must NOT appear
      warrantyScore: 30, // flag
      pillarStatuses: {
        safety: "ok",
        scope: "flag",
        price: "warn",
        fine_print: "ok",
        warranty: "flag",
      },
    });

    const preview = generateSafePreview(scored);

    // Safety (ok) must NOT appear
    const safetyFinding = preview.findings.find(
      (f) => f.pillarKey === "safety"
    );
    expect(safetyFinding).toBeUndefined();

    // Fine Print (ok) must NOT appear
    const finePrintFinding = preview.findings.find(
      (f) => f.pillarKey === "fine_print"
    );
    expect(finePrintFinding).toBeUndefined();

    // Only non-ok pillars should appear
    for (const f of preview.findings) {
      expect(f.severity).not.toBe("ok");
    }
  });

  // Test 2: Max 3 Vulnerabilities
  it("returns at most 3 findings even when all 5 pillars are flagged", () => {
    const scored = makeScoredResult({
      overallScore: 30,
      finalGrade: "F",
      safetyScore: 20,
      scopeScore: 25,
      priceScore: 30,
      finePrintScore: 15,
      warrantyScore: 10,
      pillarStatuses: {
        safety: "flag",
        scope: "flag",
        price: "flag",
        fine_print: "flag",
        warranty: "flag",
      },
      warnings: ["w1", "w2", "w3", "w4", "w5"],
    });

    const preview = generateSafePreview(scored);
    expect(preview.findings.length).toBe(3);
  });

  // Test 3: Flag Ordering (flags before warns)
  it("sorts flags before warns in findings", () => {
    const scored = makeScoredResult({
      overallScore: 55,
      finalGrade: "D",
      safetyScore: 60, // warn
      scopeScore: 40, // flag
      priceScore: 65, // warn
      finePrintScore: 30, // flag
      warrantyScore: 80, // ok
      pillarStatuses: {
        safety: "warn",
        scope: "flag",
        price: "warn",
        fine_print: "flag",
        warranty: "ok",
      },
      warnings: ["w1", "w2"],
    });

    const preview = generateSafePreview(scored);

    // Find the index where flags end and warns begin
    const severities = preview.findings.map((f) => f.severity);
    const lastFlagIdx = severities.lastIndexOf("flag");
    const firstWarnIdx = severities.indexOf("warn");

    // All flags must come before all warns
    if (lastFlagIdx !== -1 && firstWarnIdx !== -1) {
      expect(lastFlagIdx).toBeLessThan(firstWarnIdx);
    }
  });

  // Test 4: Score Rounding to nearest 5
  it("rounds overallScore to the nearest 5", () => {
    const scored = makeScoredResult({ overallScore: 82 });
    const preview = generateSafePreview(scored);

    // 82 rounds to 80 (Math.round(82/5)*5 = Math.round(16.4)*5 = 16*5 = 80)
    expect(preview.overallScore).toBe(80);

    // Also test 83 → 85
    const scored2 = makeScoredResult({ overallScore: 83 });
    const preview2 = generateSafePreview(scored2);
    expect(preview2.overallScore).toBe(85);

    // Verify it's always a multiple of 5
    expect(preview.overallScore % 5).toBe(0);
    expect(preview2.overallScore % 5).toBe(0);
  });

  // Test 5: Zero Findings when all pillars are clean
  it("returns empty findings and warningBucket '0' when all pillars >= 80", () => {
    const scored = makeScoredResult({
      overallScore: 92,
      finalGrade: "A",
      safetyScore: 85,
      scopeScore: 90,
      priceScore: 88,
      finePrintScore: 82,
      warrantyScore: 95,
      pillarStatuses: {
        safety: "ok",
        scope: "ok",
        price: "ok",
        fine_print: "ok",
        warranty: "ok",
      },
      warnings: [],
      missingItems: [],
    });

    const preview = generateSafePreview(scored);
    expect(preview.findings.length).toBe(0);
    expect(preview.warningBucket).toBe("0");
    expect(preview.riskLevel).toBe("Acceptable");
  });
});
