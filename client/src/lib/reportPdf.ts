/**
 * Report PDF utilities
 * Filename sanitization and print-safe helpers
 */

/**
 * Sanitize a contractor name for use in PDF filename
 * Removes spaces, special characters, and normalizes to lowercase
 * Example: "ABC Window Co." → "abc-window-co"
 */
export function sanitizeFilenamePart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .slice(0, 50); // Limit length
}

/**
 * Generate PDF filename for report download
 * Format: windowman-quote-audit-{contractorName}-{scanId}.pdf
 */
export function generateReportFilename(contractorName: string, scanId: string): string {
  const sanitized = sanitizeFilenamePart(contractorName || 'quote');
  const shortId = scanId.split('-')[0]; // Use first 8 chars of UUID
  return `windowman-quote-audit-${sanitized}-${shortId}.pdf`;
}

/**
 * Compute risk level from overall score
 * Used for analytics event payload
 */
export function computeRiskLevel(score: number): 'critical' | 'moderate' | 'acceptable' {
  if (score < 50) return 'critical';
  if (score < 75) return 'moderate';
  return 'acceptable';
}
