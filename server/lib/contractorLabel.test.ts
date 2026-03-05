/**
 * contractorLabel.test.ts
 *
 * Unit tests for the ContractorLabelResolver:
 *   - isGarbageLabel: sanitizer rules
 *   - resolveContractorLabel: priority chain + confidence gate
 *   - resolveCompareLabelPair: collision handling
 */

import { describe, it, expect } from "vitest";
import {
  isGarbageLabel,
  resolveContractorLabel,
  resolveCompareLabelPair,
} from "./contractorLabel";

// ─── isGarbageLabel ───────────────────────────────────────────────────────────

describe("isGarbageLabel", () => {
  it("rejects empty string", () => {
    expect(isGarbageLabel("")).toBe(true);
  });

  it("rejects strings shorter than 3 chars", () => {
    expect(isGarbageLabel("AB")).toBe(true);
    expect(isGarbageLabel("A")).toBe(true);
  });

  it("accepts strings with exactly 3 chars", () => {
    expect(isGarbageLabel("ABC")).toBe(false);
  });

  it("rejects N/A (case-insensitive)", () => {
    expect(isGarbageLabel("N/A")).toBe(true);
    expect(isGarbageLabel("n/a")).toBe(true);
    expect(isGarbageLabel("  N/A  ")).toBe(true);
  });

  it("rejects UNKNOWN (case-insensitive)", () => {
    expect(isGarbageLabel("UNKNOWN")).toBe(true);
    expect(isGarbageLabel("unknown")).toBe(true);
  });

  it("rejects NONE, NULL, TBD, ?", () => {
    expect(isGarbageLabel("NONE")).toBe(true);
    expect(isGarbageLabel("NULL")).toBe(true);
    expect(isGarbageLabel("TBD")).toBe(true);
    expect(isGarbageLabel("?")).toBe(true);
  });

  it("rejects em-dash and hyphen", () => {
    expect(isGarbageLabel("—")).toBe(true);
    expect(isGarbageLabel("-")).toBe(true);
  });

  it("rejects filenames with extensions", () => {
    expect(isGarbageLabel("quote.pdf")).toBe(true);
    expect(isGarbageLabel("window_quote.jpg")).toBe(true);
    expect(isGarbageLabel("document.docx")).toBe(true);
  });

  it("rejects UUID-like random tokens", () => {
    expect(isGarbageLabel("a1b2c3d4-e5f6")).toBe(true);
    expect(isGarbageLabel("deadbeef1234")).toBe(true);
  });

  it("accepts a real contractor name", () => {
    expect(isGarbageLabel("Sunshine Windows LLC")).toBe(false);
    expect(isGarbageLabel("ABC Glass Co")).toBe(false);
    expect(isGarbageLabel("Bob's Windows")).toBe(false);
  });

  it("accepts names with numbers that are not UUID-like", () => {
    expect(isGarbageLabel("Window Pro 360")).toBe(false);
    expect(isGarbageLabel("A1 Glass Services")).toBe(false);
  });
});

// ─── resolveContractorLabel ───────────────────────────────────────────────────

describe("resolveContractorLabel", () => {
  it("uses contractor_name as priority 1", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "Sunshine Windows LLC",
        company_name: "Other Company",
        license_holder: "John Doe",
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Sunshine Windows LLC");
  });

  it("falls back to company_name when contractor_name is null", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: null,
        company_name: "ABC Glass Co",
        license_holder: "John Doe",
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("ABC Glass Co");
  });

  it("falls back to license_holder when contractor_name and company_name are garbage", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "N/A",
        company_name: "UNKNOWN",
        license_holder: "John Smith",
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("John Smith");
  });

  it("falls back to pdf_header_company when all others are garbage", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: null,
        company_name: null,
        license_holder: null,
        pdf_header_company: "Premier Window Solutions",
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Premier Window Solutions");
  });

  it("falls back to contextual default when all signals are garbage", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "N/A",
        company_name: "UNKNOWN",
        license_holder: null,
        pdf_header_company: null,
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("The Challenger");
  });

  it("falls back to contextual default when all signals are null", () => {
    const label = resolveContractorLabel({
      signals: {},
      fallback: "Quote A",
    });
    expect(label).toBe("Quote A");
  });

  it("adds 'Possible: ' prefix when confidence < 0.65", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "Sunshine Windows LLC",
        confidence_score: 0.5,
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Possible: Sunshine Windows LLC");
  });

  it("does NOT add prefix when confidence >= 0.65", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "Sunshine Windows LLC",
        confidence_score: 0.65,
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Sunshine Windows LLC");
  });

  it("does NOT add prefix when confidence is exactly 0.65 (boundary)", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "Sunshine Windows LLC",
        confidence_score: 0.65,
      },
      fallback: "The Challenger",
    });
    expect(label).not.toContain("Possible:");
  });

  it("does NOT add prefix to fallback defaults (even with low confidence)", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: null,
        confidence_score: 0.1,
      },
      fallback: "The Challenger",
    });
    // Fallback defaults should never get the "Possible: " prefix
    expect(label).toBe("The Challenger");
    expect(label).not.toContain("Possible:");
  });

  it("caps label at 32 chars", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "A Very Long Contractor Name That Exceeds The Limit",
      },
      fallback: "The Challenger",
    });
    expect(label.length).toBeLessThanOrEqual(32);
  });

  it("strips leading punctuation from contractor name", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: '"Sunshine Windows LLC"',
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Sunshine Windows LLC");
  });

  it("collapses multiple spaces", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "Sunshine  Windows   LLC",
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Sunshine Windows LLC");
  });

  it("rejects filename as contractor_name and falls back", () => {
    const label = resolveContractorLabel({
      signals: {
        contractor_name: "quote_document.pdf",
        company_name: "Real Company Inc",
      },
      fallback: "The Challenger",
    });
    expect(label).toBe("Real Company Inc");
  });
});

// ─── resolveCompareLabelPair ──────────────────────────────────────────────────

describe("resolveCompareLabelPair", () => {
  it("returns distinct labels for two different contractors", () => {
    const { labelA, labelB } = resolveCompareLabelPair(
      { contractor_name: "Sunshine Windows LLC" },
      { contractor_name: "Premier Glass Co" }
    );
    expect(labelA).toBe("Sunshine Windows LLC");
    expect(labelB).toBe("Premier Glass Co");
  });

  it("uses Quote A / The Challenger as fallbacks", () => {
    const { labelA, labelB } = resolveCompareLabelPair({}, {});
    expect(labelA).toBe("Quote A");
    expect(labelB).toBe("The Challenger");
  });

  it("appends (Alt) to labelB when both labels are the same", () => {
    const { labelA, labelB } = resolveCompareLabelPair(
      { contractor_name: "Same Company" },
      { contractor_name: "Same Company" }
    );
    expect(labelA).toBe("Same Company");
    expect(labelB).toBe("Same Company (Alt)");
  });

  it("handles collision with fallback defaults (both garbage signals)", () => {
    // Both fall back to different defaults (Quote A vs The Challenger) — no collision
    const { labelA, labelB } = resolveCompareLabelPair(
      { contractor_name: "N/A" },
      { contractor_name: "N/A" }
    );
    expect(labelA).toBe("Quote A");
    expect(labelB).toBe("The Challenger");
    // No collision since defaults are different
    expect(labelA).not.toBe(labelB);
  });

  it("caps collision label at 32 chars", () => {
    const longName = "A Very Long Contractor Name That";
    const { labelB } = resolveCompareLabelPair(
      { contractor_name: longName },
      { contractor_name: longName }
    );
    expect(labelB.length).toBeLessThanOrEqual(32);
  });
});
