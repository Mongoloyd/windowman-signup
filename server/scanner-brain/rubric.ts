import type { AnalysisContext } from "./schema";
import { sanitizeForPrompt } from "./schema";

/**
 * EXTRACTION_RUBRIC — canonical Consumer Scanner Rubric (Family A).
 * Verbatim from Lovable quote-scanner/rubric.ts.
 *
 * Gemini must follow these phases exactly to extract ExtractionSignals.
 */
export const EXTRACTION_RUBRIC = `
## Window Man Consumer Scanner — Extraction Rubric v3.0

You are analyzing a window/door replacement quote or contract document for a Florida homeowner.
Your job is to extract EVERY field in the ExtractionSignals schema with maximum accuracy.

### Phase 1: Document Classification
- Determine if this is a quote, contract, or unrelated document.
- Set document_is_quote, document_is_contract, document_is_window_door_related accordingly.
- If the document is NOT window/door related, set all other fields to null and confidence_score to 0.1.

### Phase 2: Identity Extraction
- Extract contractor_name, contractor_license, contractor_address, contractor_phone, contractor_email, contractor_website.
- Extract homeowner_name, homeowner_address, homeowner_city, homeowner_zip.
- Extract doc_date (the date on the quote/contract, ISO format YYYY-MM-DD if possible).
- If a field is not found in the document, set it to null. Do NOT guess or fabricate.

### Phase 3: Scope & Product Extraction
- Count the number of window/door openings (opening_count).
- List product_types (e.g., "single-hung", "sliding glass door", "impact window").
- List product_series (manufacturer series names if stated).
- Extract noa_numbers (Miami-Dade NOA numbers) and fl_approval_numbers (Florida Product Approval numbers).
- Extract design_pressure_listed, design_pressure_value, missile_impact_rated, energy_star_listed.
- Extract glass_type, frame_material, color_finish, screen_included, custom_sizes_noted.

### Phase 4: Installation Scope
- Determine installation_included, removal_of_old_windows, stucco_repair_included, trim_wrap_included.
- Determine permit_included, inspection_included, debris_cleanup_included.
- Extract installation_method (e.g., "full-frame", "retrofit", "pocket", "new construction") if stated.

### Phase 5: Pricing Analysis
- Extract total_price (the final total the homeowner would pay).
- Calculate price_per_opening = total_price / opening_count if both are available.
- Extract deposit_amount and deposit_percentage.
- Determine financing_offered and financing_terms.
- Extract discount_listed, discount_amount, discount_description.
- Determine tax_included, payment_schedule_described, payment_schedule_details.

### Phase 6: Fine Print / Contract Terms
- Check for cancellation_clause and cancellation_window_days.
- Check for change_order_clause, lien_waiver_mentioned, arbitration_clause, escalation_clause.
- Extract completion_timeline_days and completion_timeline_stated.
- Check for penalty_for_delay, insurance_proof_mentioned, license_number_on_contract.

### Phase 7: Warranty
- Extract manufacturer_warranty_years and labor_warranty_years.
- Determine warranty_transferable, warranty_exclusions_noted, lifetime_warranty_claimed.

### Phase 8: Red Flag Detection
- Detect pressure_tactics_detected (urgency language, "sign today" pressure).
- Detect today_only_pricing (price only valid today/this visit).
- Detect verbal_promises_noted (references to verbal agreements not in writing).
- Check missing_permit_reference (no mention of permits when installation is included).
- Check missing_noa (impact products claimed but no NOA numbers listed).
- Evaluate unusually_low_price and unusually_high_price relative to Florida market norms.
- Check deposit_exceeds_statutory_limit (Florida statute 489.126: deposits > 10% or $1,000 whichever is less for unlicensed; general industry norm is no more than 33% for licensed contractors).

### Phase 9: Document Quality Assessment
- Set page_count to the number of pages in the document.
- Set confidence_score between 0.0 and 1.0 reflecting your confidence in the extraction accuracy.
- Use extraction_notes for any caveats (e.g., "document partially illegible", "handwritten notes present").

### CRITICAL RULES:
1. Return ONLY a valid JSON object matching the ExtractionSignals schema.
2. Do NOT wrap in markdown code fences.
3. Do NOT add fields not in the schema.
4. If a field cannot be determined, set it to null (not "unknown", not "N/A").
5. Boolean fields: true if explicitly stated/found, false if explicitly contradicted, null if not mentioned.
6. Numeric fields: extract exact numbers. Do not round or estimate.
7. Array fields: return [] (empty array) if category exists but no items found; null if category not applicable.
`.trim();

/**
 * GRADING_RUBRIC — scoring guidance for the deterministic scoring engine.
 * Included in the prompt so Gemini understands what signals matter most,
 * but actual scoring is done deterministically in scoring.ts (not by Gemini).
 */
export const GRADING_RUBRIC = `
## Grading Context (for extraction accuracy — scoring is done server-side)

The extracted signals will be scored across 5 pillars:
1. SAFETY: design_pressure, missile_impact, NOA numbers, FL approvals, installation method
2. SCOPE: opening_count, product details, installation inclusions, permit, inspection
3. PRICE: total_price, price_per_opening, deposit limits, financing, discounts, tax
4. FINE PRINT: cancellation clause, change orders, lien waivers, arbitration, timeline, insurance, license
5. WARRANTY: manufacturer years, labor years, transferability, exclusions, lifetime claims

Red flags (Phase 8) can trigger hard caps that override pillar scores.

Your job is ONLY extraction. Be thorough and accurate — the scoring engine depends on every field.
`.trim();

/**
 * USER_PROMPT_TEMPLATE — builds the full prompt sent to Gemini.
 * Supports retryInstruction for single-retry flow on schema validation failure.
 */
export function USER_PROMPT_TEMPLATE(params: {
  ocrText: string;
  context?: AnalysisContext;
  retryInstruction?: string;
}): string {
  const ctx = params.context ?? {};
  const hintBlock = sanitizeForPrompt(ctx);

  const retryBlock = params.retryInstruction
    ? `\n\nRETRY_INSTRUCTION:\n${params.retryInstruction}\n`
    : "";

  return `
You are Window Man's extraction engine.
Follow the EXTRACTION_RUBRIC exactly.
Return ONLY valid JSON that matches the ExtractionSignals schema.

EXTRACTION_RUBRIC:
${EXTRACTION_RUBRIC}

GRADING_RUBRIC:
${GRADING_RUBRIC}

CONTEXT_HINTS:
${hintBlock}
${retryBlock}
OCR_TEXT:
"""
${params.ocrText}
"""
  `.trim();
}
