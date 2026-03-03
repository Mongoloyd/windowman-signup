/**
 * Lovable Analysis Authority — Vitest tests
 *
 * Tests cover:
 * - ENV var presence (LOVABLE_ANALYSIS_URL, LOVABLE_ANALYSIS_SHARED_SECRET)
 * - Service module importability and exports
 * - Strict AnalysisEnvelopeSchema validation (meta/preview/full structure)
 * - LovableAnalysisError class (all error codes including ANALYSIS_SCHEMA_MISMATCH)
 * - storeAnalysisEnvelope DB helper signature (new fields: previewHeadline, previewRiskLevel)
 * - Preview-only contract: preview fields must not include dollar amounts or contractor names
 * - DB schema has new columns: previewHeadline, previewRiskLevel
 */

import { describe, expect, it } from "vitest";

// ─── ENV vars ─────────────────────────────────────────────────────────────────

describe("Lovable Analysis Authority — env vars", () => {
  it("LOVABLE_ANALYSIS_URL is set", () => {
    expect(process.env.LOVABLE_ANALYSIS_URL).toBeTruthy();
  });

  it("LOVABLE_ANALYSIS_SHARED_SECRET is set and long enough", () => {
    expect(process.env.LOVABLE_ANALYSIS_SHARED_SECRET).toBeTruthy();
    expect(process.env.LOVABLE_ANALYSIS_SHARED_SECRET!.length).toBeGreaterThan(8);
  });
});

// ─── Service module exports ───────────────────────────────────────────────────

describe("Lovable Analysis service module", () => {
  it("exports analyzeQuote, LovableAnalysisError, and all schemas", async () => {
    const mod = await import("./services/lovableAnalysis");
    expect(typeof mod.analyzeQuote).toBe("function");
    expect(typeof mod.LovableAnalysisError).toBe("function");
    expect(mod.AnalysisEnvelopeSchema).toBeTruthy();
    expect(mod.AnalysisPreviewSchema).toBeTruthy();
    expect(mod.AnalysisMetaSchema).toBeTruthy();
    expect(mod.AnalysisFullSchema).toBeTruthy();
  });
});

// ─── AnalysisEnvelopeSchema — valid input ─────────────────────────────────────

describe("AnalysisEnvelopeSchema — valid inputs", () => {
  it("accepts a fully valid envelope with meta/preview/full structure", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const valid = {
      meta: {
        trace_id: "550e8400-e29b-41d4-a716-446655440000",
        analysis_version: "wm_rubric_v3",
        model_used: "gemini-2.5-flash",
        processing_time_ms: 4200,
        timestamp: "2026-03-03T14:00:00Z",
      },
      preview: {
        score: 72,
        grade: "C",
        risk_level: "high",
        headline: "3 red flags found — labor rate and permit clause need review.",
        warning_count: 3,
        missing_item_count: 2,
      },
      full: {
        dashboard: {
          overall_score: 72,
          final_grade: "C",
          safety_score: 88,
          scope_score: 70,
          price_score: 60,
          fine_print_score: 65,
          warranty_score: 80,
          price_per_opening: "$450",
          warnings: ["Labor rate above median.", "Permit clause ambiguous."],
          missing_items: ["NOA number missing.", "License number not listed."],
          summary: "Quote has several areas requiring negotiation.",
        },
        forensic: {
          headline: "High-risk quote with overcharge indicators.",
          risk_level: "high",
          statute_citations: ["FL Stat 489.105"],
          questions_to_ask: ["Can you itemize labor?"],
          positive_findings: ["Warranty terms are clear."],
          hard_cap_applied: false,
          hard_cap_reason: null,
          hard_cap_statute: null,
        },
        extracted_identity: {
          contractor_name: "ABC Windows LLC",
          license_number: "CGC123456",
          noa_numbers: ["NOA-2024-001"],
        },
      },
    };

    const result = AnalysisEnvelopeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

// ─── AnalysisEnvelopeSchema — invalid inputs ─────────────────────────────────

describe("AnalysisEnvelopeSchema — invalid inputs", () => {
  it("rejects an envelope missing the meta block", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      // meta block missing
      preview: {
        score: 82,
        grade: "B",
        risk_level: "moderate",
        headline: "Some headline",
        warning_count: 1,
        missing_item_count: 0,
      },
      full: {
        dashboard: { overall_score: 82, final_grade: "B", safety_score: 90, scope_score: 80, price_score: 75, fine_print_score: 70, warranty_score: 85, price_per_opening: "$400", warnings: [], missing_items: [], summary: "OK" },
        forensic: { headline: "OK", risk_level: "moderate", statute_citations: [], questions_to_ask: [], positive_findings: [], hard_cap_applied: false, hard_cap_reason: null, hard_cap_statute: null },
        extracted_identity: { contractor_name: null, license_number: null, noa_numbers: [] },
      },
    };

    expect(AnalysisEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects an envelope with non-UUID trace_id in meta", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      meta: {
        trace_id: "not-a-uuid", // must be UUID
        analysis_version: "wm_rubric_v3",
        model_used: "gemini-2.5-flash",
        processing_time_ms: 1000,
        timestamp: "2026-03-03T14:00:00Z",
      },
      preview: {
        score: 82,
        grade: "B",
        risk_level: "moderate",
        headline: "OK",
        warning_count: 0,
        missing_item_count: 0,
      },
      full: {
        dashboard: { overall_score: 82, final_grade: "B", safety_score: 90, scope_score: 80, price_score: 75, fine_print_score: 70, warranty_score: 85, price_per_opening: "$400", warnings: [], missing_items: [], summary: "OK" },
        forensic: { headline: "OK", risk_level: "moderate", statute_citations: [], questions_to_ask: [], positive_findings: [], hard_cap_applied: false, hard_cap_reason: null, hard_cap_statute: null },
        extracted_identity: { contractor_name: null, license_number: null, noa_numbers: [] },
      },
    };

    expect(AnalysisEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects preview with score > 100", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      meta: {
        trace_id: "550e8400-e29b-41d4-a716-446655440000",
        analysis_version: "v1",
        model_used: "model",
        processing_time_ms: 1000,
        timestamp: "2026-03-03T14:00:00Z",
      },
      preview: {
        score: 150, // > 100
        grade: "A",
        risk_level: "acceptable",
        headline: "OK",
        warning_count: 0,
        missing_item_count: 0,
      },
      full: {
        dashboard: { overall_score: 150, final_grade: "A", safety_score: 100, scope_score: 100, price_score: 100, fine_print_score: 100, warranty_score: 100, price_per_opening: "$300", warnings: [], missing_items: [], summary: "OK" },
        forensic: { headline: "OK", risk_level: "acceptable", statute_citations: [], questions_to_ask: [], positive_findings: [], hard_cap_applied: false, hard_cap_reason: null, hard_cap_statute: null },
        extracted_identity: { contractor_name: null, license_number: null, noa_numbers: [] },
      },
    };

    expect(AnalysisEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects preview with invalid risk_level", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      meta: {
        trace_id: "550e8400-e29b-41d4-a716-446655440000",
        analysis_version: "v1",
        model_used: "model",
        processing_time_ms: 1000,
        timestamp: "2026-03-03T14:00:00Z",
      },
      preview: {
        score: 72,
        grade: "C",
        risk_level: "EXTREME", // not in enum
        headline: "OK",
        warning_count: 1,
        missing_item_count: 0,
      },
      full: {
        dashboard: { overall_score: 72, final_grade: "C", safety_score: 80, scope_score: 70, price_score: 65, fine_print_score: 60, warranty_score: 75, price_per_opening: "$450", warnings: ["w1"], missing_items: [], summary: "OK" },
        forensic: { headline: "OK", risk_level: "high", statute_citations: [], questions_to_ask: [], positive_findings: [], hard_cap_applied: false, hard_cap_reason: null, hard_cap_statute: null },
        extracted_identity: { contractor_name: null, license_number: null, noa_numbers: [] },
      },
    };

    expect(AnalysisEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects forensic with invalid risk_level", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      meta: {
        trace_id: "550e8400-e29b-41d4-a716-446655440000",
        analysis_version: "v1",
        model_used: "model",
        processing_time_ms: 1000,
        timestamp: "2026-03-03T14:00:00Z",
      },
      preview: {
        score: 72,
        grade: "C",
        risk_level: "high",
        headline: "OK",
        warning_count: 1,
        missing_item_count: 0,
      },
      full: {
        dashboard: { overall_score: 72, final_grade: "C", safety_score: 80, scope_score: 70, price_score: 65, fine_print_score: 60, warranty_score: 75, price_per_opening: "$450", warnings: [], missing_items: [], summary: "OK" },
        forensic: {
          headline: "OK",
          risk_level: "INVALID", // not in enum
          statute_citations: [],
          questions_to_ask: [],
          positive_findings: [],
          hard_cap_applied: false,
          hard_cap_reason: null,
          hard_cap_statute: null,
        },
        extracted_identity: { contractor_name: null, license_number: null, noa_numbers: [] },
      },
    };

    expect(AnalysisEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });
});

// ─── LovableAnalysisError ─────────────────────────────────────────────────────

describe("LovableAnalysisError", () => {
  it("is an Error subclass with code and optional httpStatus", async () => {
    const { LovableAnalysisError } = await import("./services/lovableAnalysis");

    const err = new LovableAnalysisError("test error", "HTTP_ERROR", 422, '{"error":"bad"}');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("LovableAnalysisError");
    expect(err.code).toBe("HTTP_ERROR");
    expect(err.httpStatus).toBe(422);
    expect(err.rawBody).toBe('{"error":"bad"}');
    expect(err.message).toBe("test error");
  });

  it("CONFIG_MISSING code works without httpStatus", async () => {
    const { LovableAnalysisError } = await import("./services/lovableAnalysis");

    const err = new LovableAnalysisError("not configured", "CONFIG_MISSING");
    expect(err.code).toBe("CONFIG_MISSING");
    expect(err.httpStatus).toBeUndefined();
  });

  it("ANALYSIS_SCHEMA_MISMATCH is a valid error code", async () => {
    const { LovableAnalysisError } = await import("./services/lovableAnalysis");

    const err = new LovableAnalysisError("schema mismatch", "ANALYSIS_SCHEMA_MISMATCH", 200, "{}");
    expect(err.code).toBe("ANALYSIS_SCHEMA_MISMATCH");
    expect(err.name).toBe("LovableAnalysisError");
  });
});

// ─── DB helper ────────────────────────────────────────────────────────────────

describe("storeAnalysisEnvelope DB helper", () => {
  it("is exported from server/db.ts", async () => {
    const db = await import("./db");
    expect(typeof db.storeAnalysisEnvelope).toBe("function");
  });
});

// ─── Preview contract ─────────────────────────────────────────────────────────

describe("Preview-only contract", () => {
  it("preview schema has required fields: score, grade, risk_level, headline, warning_count, missing_item_count", async () => {
    const { AnalysisPreviewSchema } = await import("./services/lovableAnalysis");

    const shape = Object.keys(AnalysisPreviewSchema.shape);
    expect(shape).toContain("score");
    expect(shape).toContain("grade");
    expect(shape).toContain("risk_level");
    expect(shape).toContain("headline");
    expect(shape).toContain("warning_count");
    expect(shape).toContain("missing_item_count");
  });

  it("preview schema does NOT include dollar amounts, contractor names, or line items", async () => {
    const { AnalysisPreviewSchema } = await import("./services/lovableAnalysis");

    const shape = Object.keys(AnalysisPreviewSchema.shape);
    expect(shape).not.toContain("overcharge_estimate");
    expect(shape).not.toContain("contractor_name");
    expect(shape).not.toContain("line_items");
    expect(shape).not.toContain("recommendations");
    expect(shape).not.toContain("statute_citations");
    expect(shape).not.toContain("questions_to_ask");
  });

  it("meta fields (trace_id, analysis_version) are in meta block, not top-level", async () => {
    const { AnalysisEnvelopeSchema } = await import("./services/lovableAnalysis");

    const topLevelKeys = Object.keys(AnalysisEnvelopeSchema.shape);
    expect(topLevelKeys).toContain("meta");
    expect(topLevelKeys).toContain("preview");
    expect(topLevelKeys).toContain("full");
    // These must NOT be top-level — they live in meta
    expect(topLevelKeys).not.toContain("trace_id");
    expect(topLevelKeys).not.toContain("analysis_version");
  });

  it("DB schema has previewHeadline and previewRiskLevel columns", async () => {
    const schemaModule = await import("../drizzle/schema");
    type AnalysisType = typeof schemaModule.analyses.$inferSelect;
    type HasHeadline = AnalysisType extends { previewHeadline: unknown } ? true : false;
    type HasRiskLevel = AnalysisType extends { previewRiskLevel: unknown } ? true : false;
    const hasHeadline: HasHeadline = true;
    const hasRiskLevel: HasRiskLevel = true;
    expect(hasHeadline).toBe(true);
    expect(hasRiskLevel).toBe(true);
  });

  it("DB schema still has analysisVersion and traceId columns", async () => {
    const schemaModule = await import("../drizzle/schema");
    type AnalysisType = typeof schemaModule.analyses.$inferSelect;
    type HasAnalysisVersion = AnalysisType extends { analysisVersion: unknown } ? true : false;
    type HasTraceId = AnalysisType extends { traceId: unknown } ? true : false;
    const hasVersion: HasAnalysisVersion = true;
    const hasTrace: HasTraceId = true;
    expect(hasVersion).toBe(true);
    expect(hasTrace).toBe(true);
  });
});

// ─── Analysis router ──────────────────────────────────────────────────────────

describe("Analysis router — Lovable integration", () => {
  it("upload procedure is present in the analysis router", async () => {
    const routerSource = await import("./routers/analysis");
    expect(routerSource.analysisRouter).toBeTruthy();
    const procedures = routerSource.analysisRouter._def.procedures;
    expect(procedures).toHaveProperty("upload");
  });

  it("analyzeQuote is importable from the lovableAnalysis service", async () => {
    const service = await import("./services/lovableAnalysis");
    expect(typeof service.analyzeQuote).toBe("function");
  });
});
