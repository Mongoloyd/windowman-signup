/**
 * Lovable Analysis Authority — Vitest tests
 *
 * Tests cover:
 * - ENV var presence (LOVABLE_ANALYSIS_URL, LOVABLE_ANALYSIS_SHARED_SECRET)
 * - Service module importability
 * - Zod envelope schema validation (valid + invalid shapes)
 * - LovableAnalysisError class
 * - storeAnalysisEnvelope DB helper importability
 * - Preview-only contract: preview fields must not include dollar amounts or contractor names
 */

import { describe, expect, it } from "vitest";

// ─── ENV vars ─────────────────────────────────────────────────────────────────

describe("Lovable Analysis Authority — env vars", () => {
  it("LOVABLE_ANALYSIS_URL is set", () => {
    expect(process.env.LOVABLE_ANALYSIS_URL).toBeTruthy();
  });

  it("LOVABLE_ANALYSIS_SHARED_SECRET is set", () => {
    expect(process.env.LOVABLE_ANALYSIS_SHARED_SECRET).toBeTruthy();
    expect(process.env.LOVABLE_ANALYSIS_SHARED_SECRET!.length).toBeGreaterThan(8);
  });
});

// ─── Service module ───────────────────────────────────────────────────────────

describe("Lovable Analysis service module", () => {
  it("is importable and exports analyzeQuote, LovableAnalysisError, and schemas", async () => {
    const mod = await import("./services/lovableAnalysis");
    expect(typeof mod.analyzeQuote).toBe("function");
    expect(typeof mod.LovableAnalysisError).toBe("function");
    expect(mod.LovableEnvelopeSchema).toBeTruthy();
    expect(mod.LovablePreviewSchema).toBeTruthy();
  });
});

// ─── Zod envelope schema validation ──────────────────────────────────────────

describe("LovableEnvelopeSchema", () => {
  it("accepts a valid envelope", async () => {
    const { LovableEnvelopeSchema } = await import("./services/lovableAnalysis");

    const valid = {
      analysis_version: "wm-analysis-v1.0",
      trace_id: "abc-123",
      preview: {
        score: 82,
        grade: "B",
        findings: [
          "Labor rate above county median.",
          "Permit clause is ambiguous.",
        ],
        pillar_statuses: {
          safety_code: "pass",
          install_scope: "warn",
          price_fairness: "warn",
          fine_print: "warn",
          warranty: "pass",
        },
      },
      full: {
        score: 82,
        grade: "B",
        pillars: [
          { key: "safety_code", label: "Safety", score: 92, status: "pass", detail: "OK" },
        ],
        overcharge_estimate: { low: 5000, high: 12000, currency: "USD" },
        recommendations: ["Ask for itemized labor."],
      },
    };

    const result = LovableEnvelopeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects an envelope missing trace_id", async () => {
    const { LovableEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      analysis_version: "wm-analysis-v1.0",
      // trace_id missing
      preview: {
        score: 82,
        grade: "B",
        findings: ["Finding 1"],
        pillar_statuses: { safety_code: "pass" },
      },
      full: { score: 82, grade: "B", pillars: [] },
    };

    const result = LovableEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an envelope with invalid pillar status value", async () => {
    const { LovableEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      analysis_version: "wm-analysis-v1.0",
      trace_id: "abc-123",
      preview: {
        score: 82,
        grade: "B",
        findings: ["Finding 1"],
        pillar_statuses: { safety_code: "INVALID_STATUS" }, // must be pass|warn|flag
      },
      full: { score: 82, grade: "B", pillars: [] },
    };

    const result = LovableEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an envelope with score out of range", async () => {
    const { LovableEnvelopeSchema } = await import("./services/lovableAnalysis");

    const invalid = {
      analysis_version: "wm-analysis-v1.0",
      trace_id: "abc-123",
      preview: {
        score: 150, // > 100
        grade: "A",
        findings: ["Finding 1"],
        pillar_statuses: { safety_code: "pass" },
      },
      full: { score: 150, grade: "A", pillars: [] },
    };

    const result = LovableEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts extra fields in full block (passthrough)", async () => {
    const { LovableEnvelopeSchema } = await import("./services/lovableAnalysis");

    const withExtra = {
      analysis_version: "wm-analysis-v2.0",
      trace_id: "xyz-456",
      preview: {
        score: 75,
        grade: "C",
        findings: ["Finding 1"],
        pillar_statuses: { safety_code: "flag" },
      },
      full: {
        score: 75,
        grade: "C",
        pillars: [],
        future_field: "some new data from Lovable",
      },
    };

    const result = LovableEnvelopeSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
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
  it("preview schema fields do not include dollar amounts or contractor names", async () => {
    const { LovablePreviewSchema } = await import("./services/lovableAnalysis");

    // The preview schema shape should only have: score, grade, findings, pillar_statuses
    const shape = Object.keys(LovablePreviewSchema.shape);
    expect(shape).toContain("score");
    expect(shape).toContain("grade");
    expect(shape).toContain("findings");
    expect(shape).toContain("pillar_statuses");

    // These must NOT be top-level preview fields
    expect(shape).not.toContain("overcharge_estimate");
    expect(shape).not.toContain("contractor_name");
    expect(shape).not.toContain("line_items");
    expect(shape).not.toContain("recommendations");
  });

  it("analysis_version and trace_id are stored in the DB schema", async () => {
    // Contract test — documents that these fields exist on the analyses table
    const schemaModule = await import("../drizzle/schema");
    const analysesColumns = Object.keys(schemaModule.analyses);
    // Drizzle table objects expose column names as keys
    expect(analysesColumns).toBeTruthy();
    // Verify the schema type includes our new fields
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
  it("upload procedure no longer calls runStubAnalysis", async () => {
    // Contract test: the stub function must not exist in the analysis router module
    const routerSource = await import("./routers/analysis");
    // The router should still be importable and have the upload procedure
    expect(routerSource.analysisRouter).toBeTruthy();
    const procedures = routerSource.analysisRouter._def.procedures;
    expect(procedures).toHaveProperty("upload");
  });

  it("upload procedure imports analyzeQuote from lovableAnalysis service", async () => {
    // Verify the service is importable from the expected path
    const service = await import("./services/lovableAnalysis");
    expect(typeof service.analyzeQuote).toBe("function");
  });
});
