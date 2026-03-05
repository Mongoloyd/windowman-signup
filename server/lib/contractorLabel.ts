/**
 * contractorLabel.ts
 *
 * Canonical server-side ContractorLabelResolver.
 * Single source of truth for contractor label computation across:
 *   - picker modal (listMyAnalyses)
 *   - compare verdict banner
 *   - print view
 *   - future CRM exports
 *
 * Spec (final):
 *   Priority chain:
 *     1. signals.contractor_name
 *     2. signals.company_name
 *     3. signals.license_holder
 *     4. signals.pdf_header_company (only if it exists — not invented)
 *     5. contextual default ("The Challenger" in picker, "Quote A/B" in compare)
 *
 *   Sanitizer (applied to each candidate before accepting):
 *     - Reject if length < 3
 *     - Reject if matches garbage tokens: N/A, UNKNOWN, —, NONE, NULL (case-insensitive)
 *     - Reject if looks like a filename (.pdf, .jpg, etc.)
 *     - Reject if looks like a random token (all hex / UUID-like)
 *
 *   Confidence gate:
 *     - If confidence_score < 0.65 AND label is not a default → prefix "Possible: "
 *
 *   Normalization:
 *     - Trim, collapse spaces, strip leading punctuation/quotes, cap at 32 chars (UI)
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const UI_MAX = 32;

/** Exact garbage tokens to reject (case-insensitive match after trim) */
const GARBAGE_TOKENS = new Set(["n/a", "unknown", "—", "none", "null", "na", "n.a.", "tbd", "?", "-"]);

/** Filename extension pattern */
const FILENAME_RE = /\.[a-z]{2,5}$/i;

/** Random token / UUID-like pattern (all hex chars + dashes, no letters a-z outside hex) */
const RANDOM_TOKEN_RE = /^[0-9a-f\-]{8,}$/i;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal signals shape needed for label resolution.
 * Uses `unknown` for optional fields that may or may not exist in ExtractionSignals.
 */
export interface LabelSignals {
  contractor_name?: string | null;
  company_name?: string | null;
  license_holder?: string | null;
  pdf_header_company?: string | null;
  /** Overall extraction confidence (0–1). Used for confidence gate. */
  confidence_score?: number | null;
}

export interface ResolveContractorLabelOptions {
  signals: LabelSignals;
  /**
   * Context-specific fallback label.
   * - Picker list: "The Challenger"
   * - Compare column A: "Quote A"
   * - Compare column B: "The Challenger"
   */
  fallback: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize a raw string:
 * - trim
 * - collapse multiple spaces to one
 * - strip leading punctuation/quotes
 * - cap at UI_MAX chars
 */
function normalize(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^['""`\-–—.,:;!?]+/, "")
    .replace(/['""`]+$/, "")
    .trim()
    .slice(0, UI_MAX)
    .trim();
}

/**
 * Returns true if the candidate should be rejected as garbage.
 *
 * Rejection criteria:
 *   1. Empty or too short (< 3 chars after normalization)
 *   2. Exact match to known garbage tokens (case-insensitive)
 *   3. Looks like a filename (has a file extension)
 *   4. Looks like a random token (all hex chars + dashes, no real words)
 */
export function isGarbageLabel(candidate: string): boolean {
  const normalized = normalize(candidate);

  // 1. Too short
  if (normalized.length < 3) return true;

  // 2. Garbage token
  if (GARBAGE_TOKENS.has(normalized.toLowerCase())) return true;

  // 3. Filename pattern
  if (FILENAME_RE.test(normalized)) return true;

  // 4. Random token / UUID-like (all hex + dashes, ≥ 8 chars)
  if (RANDOM_TOKEN_RE.test(normalized)) return true;

  return false;
}

// ─── Main Resolver ────────────────────────────────────────────────────────────

/**
 * Resolve a deterministic contractor label from extraction signals.
 *
 * Returns the first non-garbage candidate from the priority chain,
 * with optional "Possible: " prefix when confidence is low.
 *
 * Never returns an empty string — always falls back to the provided `fallback`.
 */
export function resolveContractorLabel(opts: ResolveContractorLabelOptions): string {
  const { signals, fallback } = opts;

  // Priority chain per spec
  const candidates: (string | null | undefined)[] = [
    signals.contractor_name,
    signals.company_name,
    signals.license_holder,
    signals.pdf_header_company, // only if it exists — not invented
  ];

  let resolvedLabel: string | null = null;
  let isDefault = false;

  for (const raw of candidates) {
    if (!raw) continue;
    const normalized = normalize(raw);
    if (!isGarbageLabel(normalized)) {
      resolvedLabel = normalized;
      break;
    }
  }

  // Fall through to contextual default
  if (!resolvedLabel) {
    resolvedLabel = normalize(fallback);
    isDefault = true;
  }

  // Confidence gate — only if label came from signals (not a default)
  if (!isDefault) {
    const conf = signals.confidence_score;
    if (typeof conf === "number" && conf < 0.65) {
      const prefixed = `Possible: ${resolvedLabel}`;
      resolvedLabel = prefixed.slice(0, UI_MAX).trim();
    }
  }

  return resolvedLabel || fallback;
}

/**
 * Resolve labels for both quotes in a comparison.
 * Handles collision: if labelA === labelB → append " (Alt)" to B.
 *
 * Column A fallback: "Quote A"
 * Column B fallback: "The Challenger"
 */
export function resolveCompareLabelPair(
  signalsA: LabelSignals,
  signalsB: LabelSignals
): { labelA: string; labelB: string } {
  const labelA = resolveContractorLabel({ signals: signalsA, fallback: "Quote A" });
  let labelB = resolveContractorLabel({ signals: signalsB, fallback: "The Challenger" });

  // Collision handling
  if (labelA === labelB) {
    const alt = `${labelB} (Alt)`.slice(0, UI_MAX).trim();
    labelB = alt;
  }

  return { labelA, labelB };
}
