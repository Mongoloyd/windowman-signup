import type { ExtractionSignals } from "./schema";
import type { ScoredResult } from "./scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExtractedIdentity = {
  contractor_name: string | null;
  contractor_license: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_website: string | null;
  contractor_address: string | null;
  homeowner_name: string | null;
  homeowner_city: string | null;
  homeowner_zip: string | null;
  noa_numbers: string[];
  fl_approval_numbers: string[];
};

export type ForensicSummary = {
  headline: string;
  risk_level: "critical" | "high" | "moderate" | "acceptable";
  statute_citations: string[];
  questions_to_ask: string[];
  positive_findings: string[];
  hard_cap_applied: boolean;
  hard_cap_reason: string | null;
  hard_cap_statute: string | null;
};

// ─── Identity Extraction ──────────────────────────────────────────────────────

/**
 * extractIdentity — pulls contractor and homeowner identity fields from signals.
 * Pure extraction, no scoring.
 */
export function extractIdentity(signals: ExtractionSignals): ExtractedIdentity {
  return {
    contractor_name: signals.contractor_name,
    contractor_license: signals.contractor_license,
    contractor_phone: signals.contractor_phone,
    contractor_email: signals.contractor_email,
    contractor_website: signals.contractor_website,
    contractor_address: signals.contractor_address,
    homeowner_name: signals.homeowner_name,
    homeowner_city: signals.homeowner_city,
    homeowner_zip: signals.homeowner_zip,
    noa_numbers: signals.noa_numbers ?? [],
    fl_approval_numbers: signals.fl_approval_numbers ?? [],
  };
}

// ─── Forensic Summary Generation ──────────────────────────────────────────────

function deriveRiskLevel(score: number): ForensicSummary["risk_level"] {
  if (score < 50) return "critical";
  if (score < 65) return "high";
  if (score < 80) return "moderate";
  return "acceptable";
}

function buildHeadline(scored: ScoredResult, signals: ExtractionSignals): string {
  if (!signals.document_is_window_door_related) {
    return "This document does not appear to be a window or door replacement quote.";
  }

  if (scored.hardCap.applied) {
    if (signals.deposit_exceeds_statutory_limit) {
      return "Critical: Deposit structure exceeds Florida statutory limits. This quote requires immediate attention before signing.";
    }
    if (signals.pressure_tactics_detected && signals.today_only_pricing) {
      return "Warning: High-pressure sales tactics detected combined with today-only pricing. Review carefully.";
    }
    if (!signals.cancellation_clause) {
      return "Missing cancellation clause: Florida law requires a 3-day right to cancel. This contract may not comply.";
    }
  }

  if (scored.overallScore >= 90) {
    return "This quote is well-structured with strong consumer protections. Minor items may still warrant review.";
  }
  if (scored.overallScore >= 75) {
    return "This quote has a solid foundation but contains gaps that should be addressed before signing.";
  }
  if (scored.overallScore >= 60) {
    return "Multiple areas of concern identified. Significant negotiation recommended before committing.";
  }
  return "Serious deficiencies detected across multiple areas. Professional review strongly recommended.";
}

function buildStatuteCitations(signals: ExtractionSignals): string[] {
  const citations: string[] = [];

  if (signals.deposit_exceeds_statutory_limit) {
    citations.push("FL §489.126 — Contractor deposit limitations");
  }
  if (!signals.cancellation_clause) {
    citations.push("FL §501.025 — 3-day right to cancel home solicitation sales");
  }
  if (signals.missing_permit_reference && signals.installation_included) {
    citations.push("FL §489.113 — Permit requirements for construction work");
  }
  if (!signals.license_number_on_contract) {
    citations.push("FL §489.119 — Contractor license display requirements");
  }
  if (signals.arbitration_clause) {
    citations.push("FL §682.02 — Arbitration agreement enforceability (review recommended)");
  }

  return citations;
}

function buildQuestionsToAsk(scored: ScoredResult, signals: ExtractionSignals): string[] {
  const questions: string[] = [];

  if (!signals.design_pressure_listed) {
    questions.push("What is the design pressure rating for these windows? Can you provide documentation?");
  }
  if (!signals.noa_numbers || signals.noa_numbers.length === 0) {
    questions.push("Can you provide the Miami-Dade NOA numbers for the products being installed?");
  }
  if (!signals.permit_included) {
    questions.push("Will you be pulling the required building permits, and is that cost included?");
  }
  if (!signals.cancellation_clause) {
    questions.push("Why is there no cancellation clause? Florida law requires a 3-day right to cancel.");
  }
  if (signals.deposit_exceeds_statutory_limit) {
    questions.push("The deposit amount appears to exceed Florida statutory limits. Can you explain the payment structure?");
  }
  if (signals.manufacturer_warranty_years === null) {
    questions.push("What is the manufacturer warranty coverage? Can you provide it in writing?");
  }
  if (signals.labor_warranty_years === null) {
    questions.push("What is your labor warranty? How long does it cover workmanship issues?");
  }
  if (!signals.completion_timeline_stated) {
    questions.push("What is the expected completion timeline? Can it be written into the contract?");
  }
  if (signals.arbitration_clause) {
    questions.push("The contract includes a mandatory arbitration clause. Can this be removed or made optional?");
  }
  if (signals.escalation_clause) {
    questions.push("There appears to be a price escalation clause. Under what conditions can the price change after signing?");
  }

  return questions;
}

function buildPositiveFindings(signals: ExtractionSignals): string[] {
  const positives: string[] = [];

  if (signals.design_pressure_listed) positives.push("Design pressure ratings are documented");
  if (signals.missile_impact_rated) positives.push("Products are missile impact rated");
  if (signals.noa_numbers && signals.noa_numbers.length > 0) positives.push("Miami-Dade NOA numbers provided");
  if (signals.permit_included) positives.push("Building permits included in scope");
  if (signals.inspection_included) positives.push("Post-installation inspection included");
  if (signals.cancellation_clause) positives.push("Cancellation clause present");
  if (signals.lien_waiver_mentioned) positives.push("Lien waiver referenced");
  if (signals.insurance_proof_mentioned) positives.push("Insurance proof mentioned");
  if (signals.license_number_on_contract) positives.push("Contractor license number on contract");
  if (signals.manufacturer_warranty_years !== null && signals.manufacturer_warranty_years >= 10) {
    positives.push(`Manufacturer warranty: ${signals.manufacturer_warranty_years} years`);
  }
  if (signals.labor_warranty_years !== null && signals.labor_warranty_years >= 5) {
    positives.push(`Labor warranty: ${signals.labor_warranty_years} years`);
  }
  if (signals.energy_star_listed) positives.push("ENERGY STAR certified products");

  return positives;
}

/**
 * generateForensicSummary — deterministic forensic analysis.
 * Builds headline, statute citations, questions to ask, and positive findings
 * from scored results and extraction signals. No AI involved.
 */
export function generateForensicSummary(
  scored: ScoredResult,
  signals: ExtractionSignals
): ForensicSummary {
  return {
    headline: buildHeadline(scored, signals),
    risk_level: deriveRiskLevel(scored.overallScore),
    statute_citations: buildStatuteCitations(signals),
    questions_to_ask: buildQuestionsToAsk(scored, signals),
    positive_findings: buildPositiveFindings(signals),
    hard_cap_applied: scored.hardCap.applied,
    hard_cap_reason: scored.hardCap.reason,
    hard_cap_statute: scored.hardCap.statute,
  };
}
