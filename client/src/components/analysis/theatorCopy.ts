export type RiskLevel = "Critical" | "Moderate" | "Acceptable";

export function riskCopy(risk: RiskLevel) {
  if (risk === "Critical") {
    return {
      kicker: "WINDOW MAN ALERT",
      headline: "Critical risk signals detected.",
      subhead: "Do not sign yet. Fix the contract + scope gaps below before you hand over a deposit.",
    };
  }
  if (risk === "Moderate") {
    return {
      kicker: "WINDOW MAN CHECK",
      headline: "Moderate risk signals detected.",
      subhead: "This quote is close, but a few gaps can turn into expensive change orders.",
    };
  }
  return {
    kicker: "WINDOW MAN VERIFIED",
    headline: "Acceptable risk level.",
    subhead: "This looks mostly solid — still verify approvals and payment milestones before signing.",
  };
}

export const CTA_COPY = {
  primary: "Compare 2 Quotes (Free)",
  primaryHint: "Most homeowners save by tightening scope + milestones before signing.",
  secondary: "Have Window Man Review This Quote",
  secondaryHint: "Get a human walkthrough of the risks we detected.",
  tertiary: "Upload Another Quote",
};
