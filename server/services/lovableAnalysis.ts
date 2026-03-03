/**
 * Lovable Analysis Authority — service module
 *
 * Calls POST {LOVABLE_ANALYSIS_URL}/wm/analyze-quote with a short-TTL
 * signed S3 URL and optional context fields.
 *
 * Contract rules (non-negotiable):
 * - Preview fields ONLY come from envelope.preview — never derived from fullJson.
 * - The entire API response envelope is stored verbatim in analyses.lovable_envelope.
 * - analysis_version and trace_id are stored for debugging/replay.
 * - On any failure, throw LovableAnalysisError so the caller can set status='failed'.
 */

import { z } from "zod";
import { ENV } from "../_core/env";
import { storageGet } from "../storage";

// ─── Zod schema for the Lovable API response envelope ────────────────────────

/**
 * Pillar status values accepted from Lovable.
 * Stored verbatim — do not remap on our side.
 */
const PillarStatusSchema = z.enum(["pass", "warn", "flag"]);

/**
 * Preview block — safe to show post-email, pre-phone-OTP.
 * Must NOT contain dollar amounts or contractor names.
 */
export const LovablePreviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: z.string().min(1).max(4),
  /** 2-3 generic findings — no dollar amounts, no contractor names */
  findings: z.array(z.string()).min(1).max(5),
  /** Keyed by pillar slug, value is pass | warn | flag */
  pillar_statuses: z.record(z.string(), PillarStatusSchema),
});

/**
 * Full analysis block — NEVER sent to browser pre-phone-OTP.
 * Lovable owns this shape; we store it opaquely and return it verbatim.
 */
export const LovableFullSchema = z.object({
  score: z.number(),
  grade: z.string(),
  pillars: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      score: z.number(),
      status: PillarStatusSchema,
      detail: z.string(),
    })
  ),
  overcharge_estimate: z
    .object({
      low: z.number(),
      high: z.number(),
      currency: z.string(),
    })
    .optional(),
  recommendations: z.array(z.string()).optional(),
  contractor_name: z.string().optional(),
  line_items: z.array(z.unknown()).optional(),
}).passthrough(); // allow Lovable to add fields without breaking us

/**
 * Top-level response envelope from POST /wm/analyze-quote.
 */
export const LovableEnvelopeSchema = z.object({
  /** Lovable API version string, e.g. "wm-analysis-v1.2" */
  analysis_version: z.string(),
  /** Trace ID for cross-system debugging */
  trace_id: z.string(),
  /** Preview data — safe to expose pre-phone-OTP */
  preview: LovablePreviewSchema,
  /** Full analysis — hard-gated behind phone OTP on our side */
  full: LovableFullSchema,
});

export type LovableEnvelope = z.infer<typeof LovableEnvelopeSchema>;
export type LovablePreview = z.infer<typeof LovablePreviewSchema>;

// ─── Custom error class ───────────────────────────────────────────────────────

export class LovableAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFIG_MISSING"
      | "SIGNED_URL_FAILED"
      | "NETWORK_ERROR"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE"
      | "TIMEOUT",
    public readonly httpStatus?: number,
    public readonly rawBody?: string
  ) {
    super(message);
    this.name = "LovableAnalysisError";
  }
}

// ─── Request / response types ─────────────────────────────────────────────────

export interface AnalyzeQuoteRequest {
  /** S3 key of the uploaded file — used to generate a short-TTL signed URL */
  s3Key: string;
  mimeType: string;
  /** Optional context fields */
  openingCount?: number;
  areaName?: string;
  notesFromCalculator?: string;
  /** Trace ID we generate on our side for correlation */
  trace_id: string;
}

// ─── Main service function ────────────────────────────────────────────────────

const TIMEOUT_MS = 60_000; // 60 seconds — analysis can take time

export async function analyzeQuote(
  req: AnalyzeQuoteRequest
): Promise<LovableEnvelope> {
  const { lovableAnalysisUrl, lovableAnalysisSharedSecret } = ENV;

  if (!lovableAnalysisUrl || !lovableAnalysisSharedSecret) {
    throw new LovableAnalysisError(
      "LOVABLE_ANALYSIS_URL or LOVABLE_ANALYSIS_SHARED_SECRET is not configured.",
      "CONFIG_MISSING"
    );
  }

  // Generate a short-TTL signed URL for the S3 file
  let fileUrl: string;
  try {
    const result = await storageGet(req.s3Key);
    fileUrl = result.url;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new LovableAnalysisError(
      `Failed to generate signed S3 URL for key "${req.s3Key}": ${msg}`,
      "SIGNED_URL_FAILED"
    );
  }

  // Build the request payload
  const payload: Record<string, unknown> = {
    file_url: fileUrl,
    mime_type: req.mimeType,
    trace_id: req.trace_id,
  };
  if (req.openingCount !== undefined) payload.opening_count = req.openingCount;
  if (req.areaName) payload.area_name = req.areaName;
  if (req.notesFromCalculator) payload.notes_from_calculator = req.notesFromCalculator;

  const endpoint = `${lovableAnalysisUrl.replace(/\/+$/, "")}/wm/analyze-quote`;

  // Call the Lovable API with timeout
  let rawBody: string;
  let httpStatus: number;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableAnalysisSharedSecret}`,
        "X-Trace-Id": req.trace_id,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    httpStatus = response.status;
    rawBody = await response.text();

    if (!response.ok) {
      throw new LovableAnalysisError(
        `Lovable API returned HTTP ${httpStatus}: ${rawBody.slice(0, 500)}`,
        "HTTP_ERROR",
        httpStatus,
        rawBody
      );
    }
  } catch (err: unknown) {
    if (err instanceof LovableAnalysisError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("aborted") || msg.includes("abort");
    throw new LovableAnalysisError(
      isTimeout
        ? `Lovable API timed out after ${TIMEOUT_MS / 1000}s`
        : `Network error calling Lovable API: ${msg}`,
      isTimeout ? "TIMEOUT" : "NETWORK_ERROR"
    );
  }

  // Parse and validate the response envelope
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new LovableAnalysisError(
      `Lovable API returned non-JSON response: ${rawBody.slice(0, 200)}`,
      "INVALID_RESPONSE",
      httpStatus!,
      rawBody
    );
  }

  const result = LovableEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new LovableAnalysisError(
      `Lovable API response failed validation: ${issues}`,
      "INVALID_RESPONSE",
      httpStatus!,
      rawBody
    );
  }

  return result.data;
}
