import { z } from "zod";

/**
 * ExtractionSignalsSchema — full canonical Zod object.
 * .strict() is applied at call sites to reject unknown keys.
 *
 * This schema defines every field that Gemini must extract from a
 * window/door replacement quote document. Field names, counts,
 * boolean/nullability, and enums match canonical Lovable exactly.
 */
export const ExtractionSignalsSchema = z.object({
  // ── Identity & Header ──────────────────────────────────────────────
  contractor_name: z.string().nullable(),
  contractor_license: z.string().nullable(),
  contractor_address: z.string().nullable(),
  contractor_phone: z.string().nullable(),
  contractor_email: z.string().nullable(),
  contractor_website: z.string().nullable(),
  homeowner_name: z.string().nullable(),
  homeowner_address: z.string().nullable(),
  homeowner_city: z.string().nullable(),
  homeowner_zip: z.string().nullable(),
  doc_date: z.string().nullable(),

  // ── Scope ──────────────────────────────────────────────────────────
  opening_count: z.number().nullable(),
  product_types: z.array(z.string()).nullable(),
  product_series: z.array(z.string()).nullable(),
  noa_numbers: z.array(z.string()).nullable(),
  fl_approval_numbers: z.array(z.string()).nullable(),
  design_pressure_listed: z.boolean().nullable(),
  design_pressure_value: z.string().nullable(),
  missile_impact_rated: z.boolean().nullable(),
  energy_star_listed: z.boolean().nullable(),
  glass_type: z.string().nullable(),
  frame_material: z.string().nullable(),
  color_finish: z.string().nullable(),
  screen_included: z.boolean().nullable(),
  custom_sizes_noted: z.boolean().nullable(),

  // ── Installation ───────────────────────────────────────────────────
  installation_included: z.boolean().nullable(),
  removal_of_old_windows: z.boolean().nullable(),
  stucco_repair_included: z.boolean().nullable(),
  trim_wrap_included: z.boolean().nullable(),
  permit_included: z.boolean().nullable(),
  inspection_included: z.boolean().nullable(),
  debris_cleanup_included: z.boolean().nullable(),
  installation_method: z.string().nullable(),

  // ── Pricing ────────────────────────────────────────────────────────
  total_price: z.number().nullable(),
  price_per_opening: z.number().nullable(),
  deposit_amount: z.number().nullable(),
  deposit_percentage: z.number().nullable(),
  financing_offered: z.boolean().nullable(),
  financing_terms: z.string().nullable(),
  discount_listed: z.boolean().nullable(),
  discount_amount: z.number().nullable(),
  discount_description: z.string().nullable(),
  tax_included: z.boolean().nullable(),
  payment_schedule_described: z.boolean().nullable(),
  payment_schedule_details: z.string().nullable(),

  // ── Fine Print / Contract Terms ────────────────────────────────────
  cancellation_clause: z.boolean().nullable(),
  cancellation_window_days: z.number().nullable(),
  change_order_clause: z.boolean().nullable(),
  lien_waiver_mentioned: z.boolean().nullable(),
  arbitration_clause: z.boolean().nullable(),
  escalation_clause: z.boolean().nullable(),
  completion_timeline_days: z.number().nullable(),
  completion_timeline_stated: z.boolean().nullable(),
  penalty_for_delay: z.boolean().nullable(),
  insurance_proof_mentioned: z.boolean().nullable(),
  license_number_on_contract: z.boolean().nullable(),

  // ── Warranty ───────────────────────────────────────────────────────
  manufacturer_warranty_years: z.number().nullable(),
  labor_warranty_years: z.number().nullable(),
  warranty_transferable: z.boolean().nullable(),
  warranty_exclusions_noted: z.boolean().nullable(),
  lifetime_warranty_claimed: z.boolean().nullable(),

  // ── Red Flags / Observations ───────────────────────────────────────
  pressure_tactics_detected: z.boolean().nullable(),
  today_only_pricing: z.boolean().nullable(),
  verbal_promises_noted: z.boolean().nullable(),
  missing_permit_reference: z.boolean().nullable(),
  missing_noa: z.boolean().nullable(),
  unusually_low_price: z.boolean().nullable(),
  unusually_high_price: z.boolean().nullable(),
  deposit_exceeds_statutory_limit: z.boolean().nullable(),

  // ── Document Quality ───────────────────────────────────────────────
  document_is_quote: z.boolean(),
  document_is_contract: z.boolean(),
  document_is_window_door_related: z.boolean(),
  page_count: z.number().nullable(),
  confidence_score: z.number().min(0).max(1),
  extraction_notes: z.string().nullable(),
});

export type ExtractionSignals = z.infer<typeof ExtractionSignalsSchema>;

/**
 * AnalysisData is a wrapper used for persistence, not for Gemini extraction.
 * Keep stable across versions.
 */
export type AnalysisData = {
  signals: ExtractionSignals;
  analyzedAt: string; // ISO date
  version: string; // BRAIN_VERSION
};

/**
 * If Gemini constrained output is used, this JSON schema must align EXACTLY
 * with ExtractionSignalsSchema keys.
 */
export const ExtractionSignalsJsonSchema = {
  type: "object",
  properties: {
    contractor_name: { type: ["string", "null"] },
    contractor_license: { type: ["string", "null"] },
    contractor_address: { type: ["string", "null"] },
    contractor_phone: { type: ["string", "null"] },
    contractor_email: { type: ["string", "null"] },
    contractor_website: { type: ["string", "null"] },
    homeowner_name: { type: ["string", "null"] },
    homeowner_address: { type: ["string", "null"] },
    homeowner_city: { type: ["string", "null"] },
    homeowner_zip: { type: ["string", "null"] },
    doc_date: { type: ["string", "null"] },
    opening_count: { type: ["number", "null"] },
    product_types: { type: ["array", "null"], items: { type: "string" } },
    product_series: { type: ["array", "null"], items: { type: "string" } },
    noa_numbers: { type: ["array", "null"], items: { type: "string" } },
    fl_approval_numbers: { type: ["array", "null"], items: { type: "string" } },
    design_pressure_listed: { type: ["boolean", "null"] },
    design_pressure_value: { type: ["string", "null"] },
    missile_impact_rated: { type: ["boolean", "null"] },
    energy_star_listed: { type: ["boolean", "null"] },
    glass_type: { type: ["string", "null"] },
    frame_material: { type: ["string", "null"] },
    color_finish: { type: ["string", "null"] },
    screen_included: { type: ["boolean", "null"] },
    custom_sizes_noted: { type: ["boolean", "null"] },
    installation_included: { type: ["boolean", "null"] },
    removal_of_old_windows: { type: ["boolean", "null"] },
    stucco_repair_included: { type: ["boolean", "null"] },
    trim_wrap_included: { type: ["boolean", "null"] },
    permit_included: { type: ["boolean", "null"] },
    inspection_included: { type: ["boolean", "null"] },
    debris_cleanup_included: { type: ["boolean", "null"] },
    installation_method: { type: ["string", "null"] },
    total_price: { type: ["number", "null"] },
    price_per_opening: { type: ["number", "null"] },
    deposit_amount: { type: ["number", "null"] },
    deposit_percentage: { type: ["number", "null"] },
    financing_offered: { type: ["boolean", "null"] },
    financing_terms: { type: ["string", "null"] },
    discount_listed: { type: ["boolean", "null"] },
    discount_amount: { type: ["number", "null"] },
    discount_description: { type: ["string", "null"] },
    tax_included: { type: ["boolean", "null"] },
    payment_schedule_described: { type: ["boolean", "null"] },
    payment_schedule_details: { type: ["string", "null"] },
    cancellation_clause: { type: ["boolean", "null"] },
    cancellation_window_days: { type: ["number", "null"] },
    change_order_clause: { type: ["boolean", "null"] },
    lien_waiver_mentioned: { type: ["boolean", "null"] },
    arbitration_clause: { type: ["boolean", "null"] },
    escalation_clause: { type: ["boolean", "null"] },
    completion_timeline_days: { type: ["number", "null"] },
    completion_timeline_stated: { type: ["boolean", "null"] },
    penalty_for_delay: { type: ["boolean", "null"] },
    insurance_proof_mentioned: { type: ["boolean", "null"] },
    license_number_on_contract: { type: ["boolean", "null"] },
    manufacturer_warranty_years: { type: ["number", "null"] },
    labor_warranty_years: { type: ["number", "null"] },
    warranty_transferable: { type: ["boolean", "null"] },
    warranty_exclusions_noted: { type: ["boolean", "null"] },
    lifetime_warranty_claimed: { type: ["boolean", "null"] },
    pressure_tactics_detected: { type: ["boolean", "null"] },
    today_only_pricing: { type: ["boolean", "null"] },
    verbal_promises_noted: { type: ["boolean", "null"] },
    missing_permit_reference: { type: ["boolean", "null"] },
    missing_noa: { type: ["boolean", "null"] },
    unusually_low_price: { type: ["boolean", "null"] },
    unusually_high_price: { type: ["boolean", "null"] },
    deposit_exceeds_statutory_limit: { type: ["boolean", "null"] },
    document_is_quote: { type: "boolean" },
    document_is_contract: { type: "boolean" },
    document_is_window_door_related: { type: "boolean" },
    page_count: { type: ["number", "null"] },
    confidence_score: { type: "number" },
    extraction_notes: { type: ["string", "null"] },
  },
  required: [
    "document_is_quote",
    "document_is_contract",
    "document_is_window_door_related",
    "confidence_score",
  ],
  additionalProperties: false,
} as const;

export type AnalysisContext = {
  openingCountHint?: number;
  areaHint?: string;
  notesHint?: string;
};

/**
 * Must match canonical Lovable sanitizeForPrompt logic verbatim.
 */
export function sanitizeForPrompt(input: unknown): string {
  if (!input) return "{}";
  try {
    const serialized = JSON.stringify(input);
    return serialized.replace(/```/g, "").trim();
  } catch {
    return "{}";
  }
}
