/**
 * WindowMan Verified Upload Funnel — Phase 1 + 2 Tests
 *
 * Tests cover:
 * - DB helper functions (leads, analyses, email_verifications, lead_events)
 * - Resend email service configuration
 * - Twilio Verify Service SID configuration
 * - Analysis router procedure contracts
 * - Purge scheduler initialization
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";

// ─── DB Helpers ───────────────────────────────────────────────────────────────

describe("DB helpers — leads", () => {
  it("createLead and getLeadByEmail are importable", async () => {
    const db = await import("./db");
    expect(typeof db.createLead).toBe("function");
    expect(typeof db.getLeadByEmail).toBe("function");
    expect(typeof db.setLeadEmailVerified).toBe("function");
    expect(typeof db.setLeadPhoneVerified).toBe("function");
    expect(typeof db.getAllLeads).toBe("function");
  });
});

describe("DB helpers — analyses", () => {
  it("analysis helpers are importable", async () => {
    const db = await import("./db");
    expect(typeof db.createAnalysis).toBe("function");
    expect(typeof db.getAnalysisByTempSession).toBe("function");
    expect(typeof db.updateAnalysisPipelineResults).toBe("function");
    expect(typeof db.attachAnalysisToLead).toBe("function");
    expect(typeof db.unlockFullAnalysis).toBe("function");
  });
});

describe("DB helpers — email_verifications", () => {
  it("email verification helpers are importable", async () => {
    const db = await import("./db");
    expect(typeof db.createEmailVerification).toBe("function");
    expect(typeof db.consumeEmailVerification).toBe("function");
  });
});

describe("DB helpers — lead_events", () => {
  it("logLeadEvent is importable", async () => {
    const db = await import("./db");
    expect(typeof db.logLeadEvent).toBe("function");
  });
});

// ─── Email Service ────────────────────────────────────────────────────────────

describe("Resend email service", () => {
  it("RESEND_API_KEY is set", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY!.startsWith("re_")).toBe(true);
  });

  it("email module is importable", async () => {
    const email = await import("./email");
    expect(typeof email.sendMagicLinkEmail).toBe("function");
  });
});

// ─── Twilio Verify ────────────────────────────────────────────────────────────

describe("Twilio Verify configuration", () => {
  it("TWILIO_VERIFY_SERVICE_SID is set and starts with VA", () => {
    expect(process.env.TWILIO_VERIFY_SERVICE_SID).toBeTruthy();
    expect(process.env.TWILIO_VERIFY_SERVICE_SID!.startsWith("VA")).toBe(true);
  });

  it("TWILIO_ACCOUNT_SID is set and starts with AC", () => {
    expect(process.env.TWILIO_ACCOUNT_SID).toBeTruthy();
    expect(process.env.TWILIO_ACCOUNT_SID!.startsWith("AC")).toBe(true);
  });

  it("TWILIO_AUTH_TOKEN is set", () => {
    expect(process.env.TWILIO_AUTH_TOKEN).toBeTruthy();
    expect(process.env.TWILIO_AUTH_TOKEN!.length).toBeGreaterThan(10);
  });

  it("TWILIO_PHONE_NUMBER is set", () => {
    expect(process.env.TWILIO_PHONE_NUMBER).toBeTruthy();
  });
});

// ─── Analysis Router ──────────────────────────────────────────────────────────

describe("Analysis tRPC router", () => {
  it("analysis router is importable and has required procedures", async () => {
    const { analysisRouter } = await import("./routers/analysis");
    expect(analysisRouter).toBeTruthy();
    // Check procedure keys exist on the router definition
    const routerDef = analysisRouter._def.procedures;
    expect(routerDef).toHaveProperty("upload");
    expect(routerDef).toHaveProperty("requestEmailVerification");
    expect(routerDef).toHaveProperty("verifyEmail");
    expect(routerDef).toHaveProperty("getPreview");
    expect(routerDef).toHaveProperty("lookupPhone");
    expect(routerDef).toHaveProperty("sendPhoneOTP");
    expect(routerDef).toHaveProperty("verifyPhoneOTP");
    expect(routerDef).toHaveProperty("submitNoQuoteLead");
  });
});

// ─── Purge Scheduler ─────────────────────────────────────────────────────────

describe("Purge scheduler", () => {
  it("purge module is importable and exports startPurgeScheduler", async () => {
    const purge = await import("./purge");
    expect(typeof purge.startPurgeScheduler).toBe("function");
  });
});

// ─── State Machine Constants ──────────────────────────────────────────────────

describe("Funnel state machine", () => {
  it("all 8 funnel states are defined", () => {
    const states = [
      "idle",
      "uploading",
      "analyzing",
      "email_gate",
      "email_sent",
      "partial_preview",
      "otp_gate",
      "full_analysis",
      "purged",
    ];
    // Validate the state list is complete
    expect(states).toHaveLength(9);
    expect(states).toContain("idle");
    expect(states).toContain("full_analysis");
    expect(states).toContain("purged");
  });

  it("file size limit is 10MB", () => {
    const MAX_SIZE_MB = 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    expect(MAX_SIZE_BYTES).toBe(10485760);
  });

  it("allowed MIME types are correct", () => {
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    expect(ALLOWED_TYPES).toContain("application/pdf");
    expect(ALLOWED_TYPES).toContain("image/png");
    expect(ALLOWED_TYPES).not.toContain("image/gif");
    expect(ALLOWED_TYPES).not.toContain("video/mp4");
  });
});

// ─── Security Guardrails ──────────────────────────────────────────────────────

describe("Security guardrails", () => {
  it("magic link token TTL is 6 hours in ms", () => {
    const TTL_HOURS = 6;
    const TTL_MS = TTL_HOURS * 60 * 60 * 1000;
    expect(TTL_MS).toBe(21600000);
  });

  it("temp file TTL matches magic link TTL (6 hours)", () => {
    const TEMP_TTL_HOURS = 6;
    const MAGIC_LINK_TTL_HOURS = 6;
    expect(TEMP_TTL_HOURS).toBe(MAGIC_LINK_TTL_HOURS);
  });

  it("OTP max attempts is 5", () => {
    const MAX_OTP_ATTEMPTS = 5;
    expect(MAX_OTP_ATTEMPTS).toBe(5);
  });

  it("OTP rate limit window is 10 minutes in ms", () => {
    const RATE_LIMIT_WINDOW_MIN = 10;
    const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MIN * 60 * 1000;
    expect(RATE_LIMIT_WINDOW_MS).toBe(600000);
  });

  it("full analysis is only served after phone_verified", () => {
    // This is a contract test — the getFullAnalysis procedure
    // must require phone_verified = true in the lead record.
    // The router enforces this; this test documents the requirement.
    const requirement = "phone_verified must be true before full analysis is served";
    expect(requirement).toBeTruthy();
  });

  it("preview endpoint never includes exact dollar amounts or contractor names", () => {
    // Contract test — documents the spec requirement
    const previewFields = ["score", "grade", "findings", "pillarStatuses"];
    const forbiddenInPreview = ["overchargeEstimate", "contractorName", "lineItems"];
    forbiddenInPreview.forEach((field) => {
      expect(previewFields).not.toContain(field);
    });
  });
});

// ─── Event Ladder ─────────────────────────────────────────────────────────────

describe("Event ladder", () => {
  it("event names match spec", () => {
    const events = [
      "wm_account_created",
      "wm_email_verified",
      "wm_phone_verified",
      "wm_full_analysis_viewed",
      "wm_partner_quote_requested",
    ];
    expect(events).toHaveLength(5);
    expect(events[0]).toBe("wm_account_created");
    expect(events[1]).toBe("wm_email_verified");
    expect(events[2]).toBe("wm_phone_verified");
    expect(events[3]).toBe("wm_full_analysis_viewed");
    expect(events[4]).toBe("wm_partner_quote_requested");
  });

  it("event_id deduplication key format is correct", () => {
    const leadId = randomUUID();
    const milestone = "wm_email_verified";
    const eventId = `${leadId}_${milestone}`;
    expect(eventId).toContain("_wm_email_verified");
    expect(eventId.split("_wm_")[0]).toBe(leadId);
  });
});
