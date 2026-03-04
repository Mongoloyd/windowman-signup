/**
 * WindowMan Native Truth Engine — analysisEngine.ts
 *
 * Gemini-powered AI analysis service for window/door replacement quotes.
 * Replaces the Lovable Analysis Authority stub with a fully native engine.
 *
 * Architecture rules (non-negotiable):
 * - All Gemini calls are server-side only — API key never reaches the browser.
 * - Strict Zod parse on every model response — fail-fast on schema drift.
 * - Preview fields come ONLY from the parsed AnalysisResultSchema.preview block.
 * - Full analysis JSON is NEVER sent to the browser before phone OTP is verified.
 * - On any failure: throw AnalysisEngineError so the caller sets status='failed'.
 *
 * Rubric injection point:
 * - Replace the RUBRIC_PLACEHOLDER constant below with the extraction rubric
 *   and scoring math provided in the next message.
 * - The system prompt is built from the rubric at module load time.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ENV } from "../_core/env";

// ─── Gemini model configuration ──────────────────────────────────────────────

/**
 * Model selection:
 * - gemini-2.5-flash: best accuracy-to-latency ratio for structured extraction
 * - gemini-2.0-flash: fallback if 2.5-flash is unavailable
 * Use the most capable flash model available for production accuracy.
 */
const GEMINI_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 90_000; // 90 seconds — multimodal analysis can take time

// ─── Rubric placeholder ───────────────────────────────────────────────────────

/**
 * RUBRIC_PLACEHOLDER — replace with the full extraction rubric and scoring math.
 * This string is injected into the Gemini system prompt verbatim.
 * It should define:
 *   1. What to extract from the quote document (line items, contractor info, etc.)
 *   2. The 5-pillar scoring model (safety, scope, price, fine_print, warranty)
 *   3. The overall score formula and grade thresholds
 *   4. The preview vs. full data contract (what is safe pre-OTP vs. post-OTP)
 */
const RUBRIC_PLACEHOLDER = `
[RUBRIC NOT YET INJECTED — awaiting extraction rubric and scoring math from product owner]

When the rubric is provided, replace this placeholder with:
- Extraction instructions (what fields to pull from the document)
- 5-pillar scoring definitions and weights
- Overall score formula and A/B/C/D/F grade thresholds
- Preview data contract (score, grade, risk_level, headline, warning_count, missing_item_count)
- Full data contract (dashboard, forensic, extracted_identity blocks)
`;

// ─── Zod response schema ──────────────────────────────────────────────────────

/**
 * Preview block — safe to show post-email, pre-phone-OTP.
 * Must NOT contain dollar amounts, contractor names, or line items.
 */
export const AnalysisPreviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  risk_level: z.enum(["critical", "high", "moderate", "acceptable"]),
  headline: z.string().min(1).max(200),
  warning_count: z.number().int().min(0),
  missing_item_count: z.number().int().min(0),
});

/**
 * Full block — NEVER sent to browser pre-phone-OTP.
 * Shape will be finalized once the rubric is injected.
 * Using passthrough() so the engine can evolve the full block
 * without requiring a schema migration on each rubric iteration.
 */
export const AnalysisFullSchema = z
  .object({
    dashboard: z.object({
      overall_score: z.number(),
      final_grade: z.string(),
      safety_score: z.number(),
      scope_score: z.number(),
      price_score: z.number(),
      fine_print_score: z.number(),
      warranty_score: z.number(),
      price_per_opening: z.string().optional(),
      warnings: z.array(z.string()),
      missing_items: z.array(z.string()),
      summary: z.string(),
    }),
    forensic: z.object({
      headline: z.string(),
      risk_level: z.enum(["critical", "high", "moderate", "acceptable"]),
      statute_citations: z.array(z.string()),
      questions_to_ask: z.array(z.string()),
      positive_findings: z.array(z.string()),
      hard_cap_applied: z.boolean(),
      hard_cap_reason: z.string().nullable(),
      hard_cap_statute: z.string().nullable(),
    }),
    extracted_identity: z.object({
      contractor_name: z.string().nullable(),
      license_number: z.string().nullable(),
      noa_numbers: z.array(z.string()),
    }),
  })
  .passthrough(); // allow rubric to add fields without breaking the schema

/**
 * Top-level result schema — the complete structured output from Gemini.
 */
export const AnalysisResultSchema = z.object({
  preview: AnalysisPreviewSchema,
  full: AnalysisFullSchema,
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalysisPreview = z.infer<typeof AnalysisPreviewSchema>;
export type AnalysisFull = z.infer<typeof AnalysisFullSchema>;

// ─── Custom error class ───────────────────────────────────────────────────────

export class AnalysisEngineError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFIG_MISSING"
      | "FILE_FETCH_FAILED"
      | "GEMINI_ERROR"
      | "SCHEMA_MISMATCH"
      | "TIMEOUT"
      | "UNKNOWN",
    public readonly rawResponse?: string
  ) {
    super(message);
    this.name = "AnalysisEngineError";
  }
}

// ─── Request type ─────────────────────────────────────────────────────────────

export interface AnalyzeQuoteRequest {
  /** Publicly accessible URL of the uploaded file (S3 presigned or CDN) */
  fileUrl: string;
  /** MIME type of the file — used to select the correct Gemini part type */
  mimeType: string;
  /** Trace ID for cross-system debugging */
  traceId: string;
  /** Optional context fields for richer analysis */
  openingCount?: number;
  areaName?: string;
  notesFromCalculator?: string;
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the WindowMan Truth Engine — an expert AI analyst specializing in Florida window and door replacement contracts.

Your job is to analyze a quote document uploaded by a homeowner and return a structured JSON analysis.

${RUBRIC_PLACEHOLDER}

CRITICAL OUTPUT RULES:
1. Return ONLY valid JSON — no markdown fences, no prose, no explanation.
2. The JSON must match this exact shape:
{
  "preview": {
    "score": <0-100 integer>,
    "grade": <"A"|"B"|"C"|"D"|"F">,
    "risk_level": <"critical"|"high"|"moderate"|"acceptable">,
    "headline": <string, max 200 chars, no contractor names, no dollar amounts>,
    "warning_count": <non-negative integer>,
    "missing_item_count": <non-negative integer>
  },
  "full": {
    "dashboard": { ... },
    "forensic": { ... },
    "extracted_identity": { ... }
  }
}
3. The "preview" block must NEVER contain contractor names, license numbers, or dollar amounts.
4. The "full" block may contain all extracted details.
5. If the document is not a window/door quote, set score=0, grade="F", risk_level="critical", and explain in the headline.`;
}

// ─── Main service function ────────────────────────────────────────────────────

/**
 * analyzeQuote — calls Gemini with the uploaded quote document and returns
 * a strictly validated AnalysisResult.
 *
 * @throws AnalysisEngineError on any failure
 */
export async function analyzeQuote(
  req: AnalyzeQuoteRequest
): Promise<AnalysisResult> {
  const { geminiApiKey } = ENV;

  if (!geminiApiKey) {
    throw new AnalysisEngineError(
      "GEMINI_API_KEY is not configured.",
      "CONFIG_MISSING"
    );
  }

  // Fetch the file bytes so we can send them inline to Gemini
  let fileData: Uint8Array;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(req.fileUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    fileData = new Uint8Array(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("aborted") || msg.includes("abort");
    throw new AnalysisEngineError(
      isTimeout
        ? `File fetch timed out after ${TIMEOUT_MS / 1000}s for URL: ${req.fileUrl}`
        : `Failed to fetch file for analysis: ${msg}`,
      isTimeout ? "TIMEOUT" : "FILE_FETCH_FAILED"
    );
  }

  // Build context addendum from optional fields
  const contextLines: string[] = [];
  if (req.openingCount !== undefined)
    contextLines.push(`Opening count reported by homeowner: ${req.openingCount}`);
  if (req.areaName)
    contextLines.push(`Service area: ${req.areaName}`);
  if (req.notesFromCalculator)
    contextLines.push(`Calculator notes: ${req.notesFromCalculator}`);
  const contextAddendum =
    contextLines.length > 0
      ? `\n\nAdditional context from homeowner:\n${contextLines.join("\n")}`
      : "";

  // Call Gemini
  let rawText: string;
  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: buildSystemPrompt(),
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: req.mimeType,
                data: Buffer.from(fileData).toString("base64"),
              },
            },
            {
              text: `Analyze this window/door replacement quote document. Trace ID: ${req.traceId}${contextAddendum}`,
            },
          ],
        },
      ],
    });

    rawText = result.text ?? "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("timeout") || msg.includes("aborted");
    throw new AnalysisEngineError(
      isTimeout
        ? `Gemini timed out after ${TIMEOUT_MS / 1000}s (trace=${req.traceId})`
        : `Gemini API error (trace=${req.traceId}): ${msg}`,
      isTimeout ? "TIMEOUT" : "GEMINI_ERROR"
    );
  }

  // Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown fences if the model ignores responseMimeType
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AnalysisEngineError(
      `Gemini returned non-JSON response (trace=${req.traceId}): ${rawText.slice(0, 300)}`,
      "SCHEMA_MISMATCH",
      rawText
    );
  }

  // Strict Zod validation — fail-fast on schema drift
  let analysisResult: AnalysisResult;
  try {
    analysisResult = AnalysisResultSchema.parse(parsed);
  } catch (err: unknown) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : String(err);
    console.error(
      `[AnalysisEngine] Schema mismatch (trace=${req.traceId}): ${issues}`
    );
    throw new AnalysisEngineError(
      `Gemini response failed schema validation (trace=${req.traceId}): ${issues}`,
      "SCHEMA_MISMATCH",
      rawText
    );
  }

  return analysisResult;
}
