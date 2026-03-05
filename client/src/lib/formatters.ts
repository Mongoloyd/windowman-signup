/**
 * formatters.ts
 * Shared formatting utilities for currency, numbers, and labels.
 */

/**
 * Format a dollar amount with tabular-nums font for alignment.
 * Returns "$X,XXX" or "N/A" if null.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a confidence score (0..1) as a percentage string.
 * e.g. 0.94 → "94%"
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Format a delta as a signed dollar amount.
 * e.g. 1200 → "+$1,200" | -450 → "-$450"
 */
export function formatDelta(delta: number | null): string {
  if (delta == null) return "N/A";
  const abs = Math.abs(delta);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return delta >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Confidence level label based on score.
 */
export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.7) return "Medium";
  return "Low";
}
