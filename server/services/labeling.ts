/**
 * labeling.ts
 *
 * Shared contractor label helper — single source of truth.
 * Prevents drift between compare view, report page, and modals.
 *
 * Fallback chain (per spec):
 *   1. signals.contractor_name
 *   2. signals.company_name (if field exists)
 *   3. signals.license_holder (if field exists)
 *   4. signals.contractor_license (formatted as "License #XXXXXX")
 *   5. sanitized fileName (only if ≥3 letters after stripping extension)
 *   6. contextual default ("Quote A" / "The Challenger" / "Previous Scan")
 *
 * Normalization: trim, collapse spaces, strip leading punctuation/quotes, cap at 32 chars (UI) / 48 chars (print).
 * Confidence guard: only if contractor_name_confidence exists and < 0.65 → prefix "Possible: ".
 * Collision: if labelA === labelB → append "(Alt Quote)" to B.
 */

import type { ExtractionSignals } from "../scanner-brain/schema";

const UI_MAX = 32;
const PRINT_MAX = 48;

/**
 * Normalize a raw label string:
 * - trim
 * - collapse multiple spaces to one
 * - remove surrounding quotes and leading punctuation
 * - cap length
 */
function normalize(raw: string, maxLen = UI_MAX): string {
  let s = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^['""`\-–—.,:;!?]+/, "")
    .replace(/['""`]+$/, "")
    .trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).trim();
  }
  return s;
}

/**
 * Sanitize a file name for use as a label:
 * - strip extension
 * - replace underscores/hyphens with spaces
 * - only use if result contains ≥3 letters
 */
function sanitizeFileName(fileName: string): string | null {
  const noExt = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ");
  const letters = noExt.match(/[A-Za-z]/g);
  if (!letters || letters.length < 3) return null;
  return normalize(noExt);
}

export interface GetContractorLabelOptions {
  signals: ExtractionSignals & {
    // Optional fields that may or may not exist in schema
    company_name?: string | null;
    license_holder?: string | null;
    contractor_name_confidence?: number | null;
  };
  analysisFileName?: string | null;
  /** Contextual default — "Quote A", "The Challenger", "Previous Scan · Feb 28", etc. */
  fallbackName: string;
  /** Use print-safe max length (48 chars) instead of UI max (32 chars) */
  printMode?: boolean;
}

/**
 * Compute a deterministic, normalized contractor label.
 * Server-side only — never write to DB.
 */
export function getContractorLabel(opts: GetContractorLabelOptions): string {
  const { signals, analysisFileName, fallbackName, printMode = false } = opts;
  const maxLen = printMode ? PRINT_MAX : UI_MAX;

  const candidates: (string | null | undefined)[] = [
    signals.contractor_name,
    (signals as any).company_name,
    (signals as any).license_holder,
    signals.contractor_license ? `License #${signals.contractor_license}` : null,
    analysisFileName ? sanitizeFileName(analysisFileName) : null,
  ];

  let label: string | null = null;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalize(candidate, maxLen);
    if (normalized.length > 0) {
      label = normalized;
      break;
    }
  }

  if (!label) {
    label = normalize(fallbackName, maxLen);
  }

  // Confidence guard — only if contractor_name_confidence exists
  const nameConf = (signals as any).contractor_name_confidence;
  if (
    label &&
    typeof nameConf === "number" &&
    nameConf < 0.65 &&
    // Only prefix if the label came from contractor_name (first candidate)
    signals.contractor_name &&
    normalize(signals.contractor_name, maxLen) === label
  ) {
    const prefixed = `Possible: ${label}`;
    label = normalize(prefixed, maxLen);
  }

  return label || fallbackName;
}

/**
 * Resolve labels for both quotes in a comparison.
 * Handles collision: if labelA === labelB → append "(Alt Quote)" to B.
 */
export function resolveCompareLabels(
  aOpts: GetContractorLabelOptions,
  bOpts: GetContractorLabelOptions
): { labelA: string; labelB: string } {
  const labelA = getContractorLabel(aOpts);
  let labelB = getContractorLabel(bOpts);

  if (labelA === labelB) {
    const alt = `${labelB} (Alt Quote)`;
    labelB = normalize(alt, aOpts.printMode ? PRINT_MAX : UI_MAX);
  }

  return { labelA, labelB };
}
