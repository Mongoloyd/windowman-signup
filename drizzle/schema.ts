import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  char,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM TABLE — Manus OAuth (do not modify)
// ─────────────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY TABLE — preserved as leads_v1 (original phone-only OTP flow)
// ─────────────────────────────────────────────────────────────────────────────
export const leadsV1 = mysqlTable("leads_v1", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  lineType: varchar("lineType", { length: 32 }),
  status: mysqlEnum("status", ["unverified", "verified", "blocked"]).default("unverified").notNull(),
  source: mysqlEnum("source", ["flow_a", "flow_b", "callback"]).default("flow_b").notNull(),
  answers: json("answers"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadV1 = typeof leadsV1.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// LEADS — master identity record (one row per person)
// ─────────────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  /** UUID primary key */
  id: char("id", { length: 36 }).primaryKey(),
  /** Email address — required for account creation */
  email: varchar("email", { length: 320 }).notNull(),
  /** True after magic link is clicked */
  emailVerified: boolean("email_verified").default(false).notNull(),
  /** E.164 phone number — set after phone OTP gate */
  phoneE164: varchar("phone_e164", { length: 20 }),
  /** True after Twilio Verify OTP approved */
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  /** Twilio Lookup v2 line type (mobile, voip, landline, etc.) */
  lineType: varchar("line_type", { length: 32 }),
  /** Flow B qualification answers (stored only when all 4 complete) */
  qualificationAnswers: json("qualification_answers"),
  /** Timestamp when qualification was completed */
  qualificationCompletedAt: timestamp("qualification_completed_at"),
  /** Timestamp when email was verified via magic link */
  emailVerifiedAt: timestamp("email_verified_at"),
  /** Timestamp when phone was verified via Twilio OTP */
  phoneVerifiedAt: timestamp("phone_verified_at"),
  /** Facebook deduplication flags — prevent double-firing events */
  fbLeadSent: boolean("fb_lead_sent").default(false).notNull(),
  fbCompleteRegistrationSent: boolean("fb_complete_registration_sent").default(false).notNull(),
  fbScheduleSent: boolean("fb_schedule_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSES — one row per quote upload / scan attempt
// ─────────────────────────────────────────────────────────────────────────────
export const analyses = mysqlTable("analyses", {
  /** UUID primary key */
  id: char("id", { length: 36 }).primaryKey(),
  /** FK to leads — nullable until email verified */
  leadId: char("lead_id", { length: 36 }),
  /** Temp session ID used pre-email verification (browser fingerprint) */
  tempSessionId: varchar("temp_session_id", { length: 64 }),
  /** S3 storage key for uploaded binary (temp/ prefix before email verify) */
  fileKey: varchar("file_key", { length: 512 }),
  /** S3 file URL — temp/ prefix before email verify, vault/ after */
  fileUrl: text("file_url"),
  /** SHA-256 hex hash of the uploaded file bytes — used for dedup */
  fileHash: varchar("file_hash", { length: 64 }),
  /** Original filename for display */
  fileName: varchar("file_name", { length: 255 }),
  /** File MIME type */
  mimeType: varchar("mime_type", { length: 64 }),
  /** Lifecycle status */
  status: mysqlEnum("status", [
    "processing",
    "temp",
    "persisted_email_verified",
    "full_unlocked",
    "failed",
    "purged",
  ]).default("processing").notNull(),
  /** Error code if status = failed */
  errorCode: varchar("error_code", { length: 64 }),
  /** S3 key for extracted OCR text */
  ocrTextKey: varchar("ocr_text_key", { length: 512 }),
  /** S3 URL for extracted OCR text */
  ocrTextUrl: text("ocr_text_url"),
  /** OCR metadata: { page_count, confidence_score, mime } */
  ocrMeta: json("ocr_meta"),
  /** Proof-of-Read: contractor_name, license, city, zip, total_price, etc. */
  proofOfRead: json("proof_of_read"),
  /** Preview JSON — safe to show post-email, pre-phone (SafePreview shape) */
  previewJson: json("preview_json"),
  /** Full AI analysis JSON — NEVER sent to browser pre-phone-OTP */
  fullJson: json("full_json"),
  /** Scanner brain version that produced this analysis */
  rubricVersion: varchar("rubric_version", { length: 16 }),
  /** TTL: row eligible for purge after this time */
  expiresAt: timestamp("expires_at"),
  /** Raw Gemini extraction output — debug only */
  rawExtractionOutput: text("raw_extraction_output"),
  /** Raw Gemini analysis output — debug only */
  rawAnalysisOutput: text("raw_analysis_output"),
  /** Facebook dedup flag for SubmitApplication event */
  fbSubmitApplicationSent: boolean("fb_submit_application_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL_VERIFICATIONS — magic link tokens
// ─────────────────────────────────────────────────────────────────────────────
export const emailVerifications = mysqlTable("email_verifications", {
  /** UUID primary key */
  id: char("id", { length: 36 }).primaryKey(),
  /** FK to leads — nullable (lead may not exist yet at token creation) */
  leadId: char("lead_id", { length: 36 }),
  /** Email address the link was sent to */
  email: varchar("email", { length: 320 }).notNull(),
  /** SHA-256 hash of the raw token — raw token never stored */
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  /**
   * Cross-device attach token — included in magic link URL so that
   * a temp analysis uploaded on Device A can be attached when the
   * magic link is opened on Device B.
   */
  tempAttachToken: varchar("temp_attach_token", { length: 64 }),
  /** Expires 6 hours after creation (aligned with temp upload TTL) */
  expiresAt: timestamp("expires_at").notNull(),
  /** Set when the link is clicked — single-use enforcement */
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// LEAD_SESSIONS — 30-day "skip OTP" device sessions (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────
export const leadSessions = mysqlTable("lead_sessions", {
  /** UUID primary key */
  id: char("id", { length: 36 }).primaryKey(),
  /** FK to leads — required */
  leadId: char("lead_id", { length: 36 }).notNull(),
  /** SHA-256 hash of the raw session token — raw token lives in HttpOnly cookie */
  sessionTokenHash: varchar("session_token_hash", { length: 64 }).notNull().unique(),
  /** ~30 days from creation */
  expiresAt: timestamp("expires_at").notNull(),
  /** Updated on each authenticated request */
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  /** Set to true to invalidate without deleting */
  isRevoked: boolean("is_revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LeadSession = typeof leadSessions.$inferSelect;
export type InsertLeadSession = typeof leadSessions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// LEAD_EVENTS — append-only audit log + FB dedupe
// ─────────────────────────────────────────────────────────────────────────────
export const leadEvents = mysqlTable("lead_events", {
  /** UUID primary key */
  id: char("id", { length: 36 }).primaryKey(),
  /** FK to leads */
  leadId: char("lead_id", { length: 36 }).notNull(),
  /** FK to analyses — nullable, attach when event is analysis-specific */
  analysisId: char("analysis_id", { length: 36 }),
  /**
   * Event name — one of the 5 value-ladder milestones:
   * wm_account_created | wm_email_verified | wm_phone_verified |
   * wm_full_analysis_viewed | wm_partner_quote_requested
   * or any internal event (e.g. wm_upload_started, wm_otp_failed)
   */
  eventName: varchar("event_name", { length: 64 }).notNull(),
  /**
   * Dedupe key for Meta Pixel + CAPI: lead_id + "_" + milestone
   * Unique constraint prevents double-firing.
   */
  eventId: varchar("event_id", { length: 128 }).notNull().unique(),
  /** Source of the event */
  source: mysqlEnum("source", ["web", "server", "webhook", "system"]).default("server").notNull(),
  /** Optional metadata (UTM params, device info, scores, etc.) */
  payload: json("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LeadEvent = typeof leadEvents.$inferSelect;
export type InsertLeadEvent = typeof leadEvents.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// LEAD_CALLS — phonecall.bot attempt + result log (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────
export const leadCalls = mysqlTable("lead_calls", {
  /** UUID primary key */
  id: char("id", { length: 36 }).primaryKey(),
  /** FK to leads */
  leadId: char("lead_id", { length: 36 }).notNull(),
  /** AI call provider (e.g. "phonecall.bot") */
  provider: varchar("provider", { length: 64 }).default("phonecall.bot").notNull(),
  /** Provider's external call ID for webhook matching */
  externalCallId: varchar("external_call_id", { length: 128 }),
  /** Which flow triggered the call */
  callType: mysqlEnum("call_type", ["quote_upload", "no_quote", "followup"]).notNull(),
  /** Call lifecycle status */
  status: mysqlEnum("status", [
    "queued",
    "ringing",
    "completed",
    "no_answer",
    "voicemail",
    "failed",
  ]).default("queued").notNull(),
  /** Outcome after call completes */
  outcome: mysqlEnum("outcome", [
    "booked",
    "callback_requested",
    "interested",
    "not_interested",
    "wrong_number",
    "do_not_call",
  ]),
  /** Sentiment from AI analysis of call */
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  /** Whether the call was transferred to a human */
  transferred: boolean("transferred").default(false).notNull(),
  transferTargetId: text("transfer_target_id"),
  transferNote: text("transfer_note"),
  callbackConfirmedAt: timestamp("callback_confirmed_at"),
  callbackWindow: varchar("callback_window", { length: 128 }),
  /** Normalized internal disposition label */
  disposition: varchar("disposition", { length: 64 }),
  durationSeconds: int("duration_seconds"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastEventAt: timestamp("last_event_at").defaultNow().notNull(),
});

export type LeadCall = typeof leadCalls.$inferSelect;
export type InsertLeadCall = typeof leadCalls.$inferInsert;
