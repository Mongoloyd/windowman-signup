/**
 * WindowMan Native Truth Engine — analysisEngine.ts
 *
 * Pipeline orchestrator: OCR → Proof-of-Read → Signal Extraction → Deterministic Scoring.
 * Gemini only does extraction; all scoring, preview, and forensics are deterministic TypeScript.
 *
 * Architecture rules (non-negotiable, per Master PRD vFinal):
 * - /server/scanner-brain has zero imports except zod.
 * - Gemini extracts; scoring.ts scores; forensic.ts builds forensics.
 * - Preview fields come ONLY from generateSafePreview() — never from Gemini.
 * - Full JSON is NEVER sent to the browser before phone OTP is verified.
 * - On any failure: throw AnalysisEngineError so the caller sets status='failed'.
 * - ExtractionSignalsSchema.strict().parse() is the bouncer with a single retry.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import {
  BRAIN_VERSION,
  EXTRACTION_RUBRIC,
  GRADING_RUBRIC,
  USER_PROMPT_TEMPLATE,
  ExtractionSignalsSchema,
  scoreFromSignals,
  generateSafePreview,
  generateForensicSummary,
  extractIdentity,
} from "../scanner-brain";
import {
  detectPromptInjection,
  buildGeminiInputText,
  PROMPT_HARDENING_APPENDIX,
} from "./promptInjection";
import type {
  ExtractionSignals,
  AnalysisContext,
  ScoredResult,
  SafePreview,
  ForensicSummary,
  ExtractedIdentity,
} from "../scanner-brain";

// ─── Configuration ───────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const TIMEOUT_MS = 90_000; // 90 seconds

// ─── Error class ─────────────────────────────────────────────────────────────

export class AnalysisEngineError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFIG_MISSING"
      | "OCR_FAILED"
      | "PROOF_EXTRACT_FAILED"
      | "SIGNALS_EXTRACT_FAILED"
      | "SIGNALS_SCHEMA_VALIDATION_FAILED"
      | "SCORING_FAILED"
      | "NOT_A_QUOTE"
      | "TIMEOUT"
      | "UNKNOWN",
    public readonly rawResponse?: string
  ) {
    super(message);
    this.name = "AnalysisEngineError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProofOfRead {
  contractor_name: string | null;
  contractor_license: string | null;
  city: string | null;
  zip: string | null;
  total_price: number | null;
  deposit: number | null;
  page_count: number | null;
  confidence_score: number | null;
  doc_date: string | null;
  product_keywords: string[];
}

export interface OcrResult {
  text: string;
  confidence_score: number;
  page_count: number | null;
}

export interface PipelineResult {
  ocrResult: OcrResult;
  ocrTextKey: string;
  ocrTextUrl: string;
  proofOfRead: ProofOfRead;
  signals: ExtractionSignals;
  scored: ScoredResult;
  preview: SafePreview;
  forensic: ForensicSummary;
  identity: ExtractedIdentity;
  fullJson: {
    signals: ExtractionSignals;
    scored: ScoredResult;
    forensic: ForensicSummary;
    identity: ExtractedIdentity;
  };
  rawExtractionOutput: string;
  rawOcrOutput: string;
}

export interface RunPipelineRequest {
  analysisId: string;
  fileUrl: string;
  mimeType: string;
  context?: AnalysisContext;
}

// ─── Vertex AI configuration ────────────────────────────────────────────────

const VERTEX_PROJECT = "gen-lang-client-0516998301";
const VERTEX_LOCATION = "global";

// ─── Gemini client singleton ─────────────────────────────────────────────────

function getGeminiClient(): GoogleGenAI {
  // Vertex AI mode with Application Default Credentials (ADC).
  // GOOGLE_APPLICATION_CREDENTIALS is set by bootstrapVertexAdc() at server startup.
  // apiKey must NOT be passed when vertexai: true — they are mutually exclusive.
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new AnalysisEngineError(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Call bootstrapVertexAdc() before using the analysis engine.",
      "CONFIG_MISSING"
    );
  }
  return new GoogleGenAI({
    vertexai: true,
    project: VERTEX_PROJECT,
    location: VERTEX_LOCATION,
  });
}

// ─── Step 1: OCR via Gemini ──────────────────────────────────────────────────

const OCR_SYSTEM_PROMPT = `You are a document OCR engine. Extract ALL text from the provided document image/PDF.
Return ONLY a JSON object with this exact shape:
{
  "text": "<full extracted text>",
  "confidence_score": <0.0 to 1.0>,
  "page_count": <integer or null>
}
Do NOT wrap in markdown fences. Do NOT add commentary.`;

export async function performOcr(
  fileUrl: string,
  mimeType: string
): Promise<{ ocrResult: OcrResult; rawOutput: string }> {
  const ai = getGeminiClient();

  let fileData: Uint8Array;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fileData = new Uint8Array(await response.arrayBuffer());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AnalysisEngineError(`File fetch failed for OCR: ${msg}`, "OCR_FAILED");
  }

  let rawText: string;
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: OCR_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: Buffer.from(fileData).toString("base64"),
              },
            },
            { text: "Extract all text from this document." },
          ],
        },
      ],
    });
    rawText = result.text ?? "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AnalysisEngineError(`Gemini OCR failed: ${msg}`, "OCR_FAILED");
  }

  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const ocrResult: OcrResult = {
      text: String(parsed.text ?? ""),
      confidence_score: Number(parsed.confidence_score ?? 0),
      page_count: parsed.page_count != null ? Number(parsed.page_count) : null,
    };
    return { ocrResult, rawOutput: rawText };
  } catch {
    throw new AnalysisEngineError(`OCR response parse failed: ${rawText.slice(0, 300)}`, "OCR_FAILED", rawText);
  }
}

// ─── Step 2: Proof-of-Read extraction ────────────────────────────────────────

const PROOF_OF_READ_SYSTEM_PROMPT = `You are a document data extractor. From the provided OCR text of a window/door replacement quote, extract ONLY these fields:
{
  "contractor_name": <string or null>,
  "contractor_license": <string or null>,
  "city": <string or null>,
  "zip": <string or null>,
  "total_price": <number or null>,
  "deposit": <number or null>,
  "page_count": <integer or null>,
  "confidence_score": <0.0 to 1.0>,
  "doc_date": <string ISO date or null>,
  "product_keywords": [<neutral product terms like "single-hung", "impact window">]
}
Rules:
- No scoring, no "ok/pass" judgments.
- If a field is not found, set it to null.
- product_keywords should be neutral descriptive terms only.
- Return ONLY valid JSON. No markdown fences. No commentary.`;

export async function extractProofOfRead(ocrText: string): Promise<ProofOfRead> {
  const ai = getGeminiClient();

  let rawText: string;
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: PROOF_OF_READ_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Extract proof-of-read fields from this OCR text:\n\n${ocrText}` }],
        },
      ],
    });
    rawText = result.text ?? "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AnalysisEngineError(`Proof-of-Read extraction failed: ${msg}`, "PROOF_EXTRACT_FAILED");
  }

  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      contractor_name: parsed.contractor_name ?? null,
      contractor_license: parsed.contractor_license ?? null,
      city: parsed.city ?? null,
      zip: parsed.zip ?? null,
      total_price: parsed.total_price != null ? Number(parsed.total_price) : null,
      deposit: parsed.deposit != null ? Number(parsed.deposit) : null,
      page_count: parsed.page_count != null ? Number(parsed.page_count) : null,
      confidence_score: parsed.confidence_score != null ? Number(parsed.confidence_score) : null,
      doc_date: parsed.doc_date ?? null,
      product_keywords: Array.isArray(parsed.product_keywords) ? parsed.product_keywords : [],
    };
  } catch {
    throw new AnalysisEngineError(
      `Proof-of-Read parse failed: ${rawText.slice(0, 300)}`,
      "PROOF_EXTRACT_FAILED",
      rawText
    );
  }
}

// ─── Step 3: Signal extraction with single retry ─────────────────────────────

export async function extractSignals(
  ocrText: string,
  context?: AnalysisContext,
  retryInstruction?: string
): Promise<{ signals: ExtractionSignals; rawOutput: string }> {
  const ai = getGeminiClient();

  // 1) Detect injection (deterministic, no side effects)
  const detection = detectPromptInjection(ocrText);

  // 2) Build hardened input text (wrap OCR as untrusted evidence)
  const hardenedOcrBlock = buildGeminiInputText(ocrText, detection);

  // 3) Build your existing user prompt, but feed hardenedOcrBlock instead of raw OCR
  const userPrompt = USER_PROMPT_TEMPLATE({
    ocrText: hardenedOcrBlock,
    context,
    retryInstruction,
  });

  let rawText: string;
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction:
          "You are Window Man's extraction engine. Return ONLY valid JSON matching the ExtractionSignals schema. No markdown fences. No commentary.\n\n" +
          PROMPT_HARDENING_APPENDIX,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
    });
    rawText = result.text ?? "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AnalysisEngineError(`Gemini signals extraction failed: ${msg}`, "SIGNALS_EXTRACT_FAILED");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AnalysisEngineError(
      `Signals response is not valid JSON: ${rawText.slice(0, 300)}`,
      "SIGNALS_EXTRACT_FAILED",
      rawText
    );
  }

  // Strict Zod parse — the bouncer
  try {
    const signals = ExtractionSignalsSchema.strict().parse(parsed);
    return { signals, rawOutput: rawText };
  } catch (err: unknown) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : String(err);
    throw new AnalysisEngineError(
      `Signals schema validation failed: ${issues}`,
      "SIGNALS_SCHEMA_VALIDATION_FAILED",
      rawText
    );
  }
}

// ─── Full Pipeline ───────────────────────────────────────────────────────────

/**
 * runPipeline — the full background pipeline per PRD §6.
 *
 * 1. OCR via Gemini → store ocrText to S3
 * 2. Proof-of-Read extraction (separate from signals)
 * 3. Signal extraction with single retry on schema failure
 * 4. Deterministic scoring + SafePreview + forensics
 *
 * Returns all results for the caller to persist.
 * Throws AnalysisEngineError on any failure — caller sets status='failed'.
 */
export async function runPipeline(req: RunPipelineRequest): Promise<PipelineResult> {
  // Step 1: OCR
  const { ocrResult, rawOutput: rawOcrOutput } = await performOcr(req.fileUrl, req.mimeType);

  // Store OCR text to S3
  const ocrTextKey = `ocr/${req.analysisId}.txt`;
  const { url: ocrTextUrl } = await storagePut(ocrTextKey, ocrResult.text, "text/plain");

  // Step 2: Proof-of-Read
  const proofOfRead = await extractProofOfRead(ocrResult.text);

  // Step 3: Signal extraction with single retry
  let signals: ExtractionSignals;
  let rawExtractionOutput: string;

  try {
    const result = await extractSignals(ocrResult.text, req.context);
    signals = result.signals;
    rawExtractionOutput = result.rawOutput;
  } catch (firstErr: unknown) {
    // Single retry with instruction
    if (
      firstErr instanceof AnalysisEngineError &&
      firstErr.code === "SIGNALS_SCHEMA_VALIDATION_FAILED"
    ) {
      console.warn(
        `[Pipeline] Signals schema validation failed on first attempt for ${req.analysisId}. Retrying...`
      );
      try {
        const retryResult = await extractSignals(
          ocrResult.text,
          req.context,
          `Your previous response failed schema validation. Errors: ${firstErr.message}. Please fix ALL issues and return a valid ExtractionSignals JSON object.`
        );
        signals = retryResult.signals;
        rawExtractionOutput = retryResult.rawOutput;
      } catch (retryErr: unknown) {
        // Both attempts failed — persist raw output and fail
        const raw =
          retryErr instanceof AnalysisEngineError
            ? retryErr.rawResponse ?? ""
            : firstErr instanceof AnalysisEngineError
              ? firstErr.rawResponse ?? ""
              : "";
        throw new AnalysisEngineError(
          `Signals extraction failed after retry for ${req.analysisId}`,
          "SIGNALS_SCHEMA_VALIDATION_FAILED",
          raw
        );
      }
    } else {
      throw firstErr;
    }
  }

  // D-001 Gate: Reject non-window/door documents before scoring runs
  if (signals.document_is_window_door_related === false) {
    throw new AnalysisEngineError(
      "Not a window/door quote or contract.",
      "NOT_A_QUOTE",
      rawExtractionOutput
    );
  }

  // Step 4: Deterministic scoring + preview + forensics
  let scored: ScoredResult;
  let preview: SafePreview;
  let forensic: ForensicSummary;
  let identity: ExtractedIdentity;

  try {
    scored = scoreFromSignals(signals);
    preview = generateSafePreview(scored);
    forensic = generateForensicSummary(scored, signals);
    identity = extractIdentity(signals);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AnalysisEngineError(
      `Scoring/forensics failed for ${req.analysisId}: ${msg}`,
      "SCORING_FAILED",
      rawExtractionOutput
    );
  }

  const fullJson = { signals, scored, forensic, identity };

  return {
    ocrResult,
    ocrTextKey,
    ocrTextUrl,
    proofOfRead,
    signals,
    scored,
    preview,
    forensic,
    identity,
    fullJson,
    rawExtractionOutput,
    rawOcrOutput,
  };
}

// Re-export for convenience
export { BRAIN_VERSION };
export type { ExtractionSignals, SafePreview, ForensicSummary, ExtractedIdentity };
