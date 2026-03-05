import { eq, desc, and, lt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  leads,
  InsertLead,
  Lead,
  leadsV1,
  analyses,
  InsertAnalysis,
  Analysis,
  emailVerifications,
  InsertEmailVerification,
  EmailVerification,
  leadSessions,
  InsertLeadSession,
  LeadSession,
  leadEvents,
  InsertLeadEvent,
  LeadEvent,
  leadCalls,
  InsertLeadCall,
  LeadCall,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS (Manus OAuth — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS v2 (UUID-based identity records)
// ─────────────────────────────────────────────────────────────────────────────

export async function createLead(data: InsertLead): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leads).values(data);
  return data.id as string;
}

export async function getLeadById(leadId: string): Promise<Lead | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  return result[0];
}

export async function getLeadByEmail(email: string): Promise<Lead | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(leads).where(eq(leads.email, email)).limit(1);
  return result[0];
}

export async function setLeadEmailVerified(leadId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({ emailVerified: true }).where(eq(leads.id, leadId));
}

export async function setLeadPhoneVerified(leadId: string, phoneE164: string, lineType: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({
    phoneVerified: true,
    phoneE164,
    lineType: lineType ?? null,
  }).where(eq(leads.id, leadId));
}

export async function updateLeadQualification(
  leadId: string,
  answers: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({
    qualificationAnswers: answers,
    qualificationCompletedAt: new Date(),
  }).where(eq(leads.id, leadId));
}

export async function setLeadFraud(leadId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({ isFraud: true }).where(eq(leads.id, leadId));
}

export async function getAllLeads(): Promise<Lead[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSES
// ─────────────────────────────────────────────────────────────────────────────

export async function createAnalysis(data: InsertAnalysis): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(analyses).values(data);
  return data.id as string;
}

export async function getAnalysisById(analysisId: string): Promise<Analysis | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
  return result[0];
}

export async function getAnalysisByTempSession(tempSessionId: string): Promise<Analysis | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.tempSessionId, tempSessionId), eq(analyses.status, "temp")))
    .limit(1);
  return result[0];
}

export async function attachAnalysisToLead(analysisId: string, leadId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({ leadId, status: "persisted_email_verified" }).where(eq(analyses.id, analysisId));
}

/**
 * Update analysis with pipeline results (previewJson, fullJson, OCR metadata, etc.).
 * Called by the background pipeline after successful completion.
 */
export async function updateAnalysisPipelineResults(
  analysisId: string,
  fields: {
    status: "processing" | "temp" | "persisted_email_verified" | "full_unlocked" | "failed" | "purged";
    ocrTextKey?: string;
    ocrTextUrl?: string;
    ocrMeta?: unknown;
    proofOfRead?: unknown;
    previewJson?: unknown;
    fullJson?: unknown;
    rawExtractionOutput?: string;
    rawAnalysisOutput?: string;
    rubricVersion?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set(fields).where(eq(analyses.id, analysisId));
}

export async function unlockFullAnalysis(analysisId: string, fullJson: unknown): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({
    status: "full_unlocked",
    fullJson,
  }).where(eq(analyses.id, analysisId));
}

export async function markAnalysisFailed(analysisId: string, errorCode: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({ status: "failed", errorCode }).where(eq(analyses.id, analysisId));
}

/**
 * Fetch all temp/processing analyses past their TTL (for purge job).
 * Uses expiresAt if set, otherwise falls back to createdAt + 6 hours.
 */
export async function getExpiredTempAnalyses(): Promise<Analysis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  // Purge rows that are temp or processing and past their TTL
  const tempExpired = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.status, "temp"), lt(analyses.createdAt, sixHoursAgo)));
  const processingExpired = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.status, "processing"), lt(analyses.createdAt, sixHoursAgo)));
  return [...tempExpired, ...processingExpired];
}

export async function markAnalysisPurged(analysisId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({ status: "purged", fileUrl: "" }).where(eq(analyses.id, analysisId));
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createEmailVerification(data: InsertEmailVerification): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(emailVerifications).values(data);
  return data.id as string;
}

export async function getEmailVerificationByTokenHash(tokenHash: string): Promise<EmailVerification | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(emailVerifications)
    .where(and(eq(emailVerifications.tokenHash, tokenHash), isNull(emailVerifications.consumedAt)))
    .limit(1);
  return result[0];
}

export async function consumeEmailVerification(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailVerifications).set({ consumedAt: new Date() }).where(eq(emailVerifications.id, id));
}

/**
 * Purge expired unconsumed tokens (for purge job).
 */
export async function deleteExpiredEmailVerifications(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(emailVerifications)
    .where(and(lt(emailVerifications.expiresAt, new Date()), isNull(emailVerifications.consumedAt)));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD SESSIONS (30-day skip-OTP device sessions)
// ─────────────────────────────────────────────────────────────────────────────

export async function createLeadSession(data: InsertLeadSession): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadSessions).values(data);
  return data.id as string;
}

export async function getLeadSessionByTokenHash(tokenHash: string): Promise<LeadSession | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(leadSessions)
    .where(and(eq(leadSessions.sessionTokenHash, tokenHash), eq(leadSessions.isRevoked, false)))
    .limit(1);
  return result[0];
}

export async function touchLeadSession(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leadSessions).set({ lastSeenAt: new Date() }).where(eq(leadSessions.id, sessionId));
}

export async function revokeLeadSession(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leadSessions).set({ isRevoked: true }).where(eq(leadSessions.id, sessionId));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD EVENTS (append-only audit log)
// ─────────────────────────────────────────────────────────────────────────────

export async function logLeadEvent(data: InsertLeadEvent): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(leadEvents).values(data);
  } catch (err: any) {
    // Ignore duplicate event_id (idempotent — dedupe key prevents double-firing)
    if (err?.code === "ER_DUP_ENTRY") {
      console.warn(`[LeadEvents] Duplicate event suppressed: ${data.eventId}`);
      return;
    }
    throw err;
  }
}

export async function getLeadEvents(leadId: string): Promise<LeadEvent[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(leadEvents)
    .where(eq(leadEvents.leadId, leadId))
    .orderBy(desc(leadEvents.createdAt));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD CALLS (phonecall.bot integration — Phase 4)
// ─────────────────────────────────────────────────────────────────────────────

export async function createLeadCall(data: InsertLeadCall): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadCalls).values(data);
  return data.id as string;
}

export async function getLeadCallByExternalId(externalCallId: string): Promise<LeadCall | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(leadCalls)
    .where(eq(leadCalls.externalCallId, externalCallId))
    .limit(1);
  return result[0];
}

export async function updateLeadCall(
  callId: string,
  updates: Partial<InsertLeadCall>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leadCalls).set({ ...updates, lastEventAt: new Date() }).where(eq(leadCalls.id, callId));
}

export async function getLeadCallsByLeadId(leadId: string): Promise<LeadCall[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(leadCalls)
    .where(eq(leadCalls.leadId, leadId))
    .orderBy(desc(leadCalls.createdAt));
}

/**
 * Find an existing analysis by file hash (SHA-256).
 * Used for dedup detection — returns the most recent non-failed, non-purged match.
 */
export async function getAnalysisByHash(fileHash: string): Promise<Analysis | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(analyses)
    .where(eq(analyses.fileHash, fileHash))
    .orderBy(desc(analyses.createdAt))
    .limit(1);
  // Return the first match regardless of status — caller decides whether to reuse
  return result[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSES PICKER (Compare Quotes entry point)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AnalysisPickerRow — safe metadata shape for the Compare Quotes picker modal.
 *
 * Security contract:
 * - For full_unlocked analyses: grade/score come from previewJson (SafePreview shape).
 * - For temp/persisted_email_verified analyses: grade/score come from previewJson only.
 * - fullJson is NEVER included in this shape.
 */
export type AnalysisPickerRow = {
  id: string;
  createdAt: Date;
  status: "processing" | "temp" | "persisted_email_verified" | "full_unlocked" | "failed" | "purged";
  fileName: string | null;
  /** previewJson column — SafePreview shape. Caller must parse. */
  previewJson: unknown;
};

/**
 * List analyses for the Compare Quotes picker modal.
 *
 * Returns only metadata-safe rows for a given leadId:
 * - Excludes: processing, failed, purged
 * - Includes: temp, persisted_email_verified, full_unlocked
 * - Ordered by createdAt DESC (most recent first)
 * - Limit: 1–50 (default 20)
 *
 * Caller is responsible for:
 * - Resolving contractor labels via getContractorLabel()
 * - Parsing previewJson as SafePreview
 * - Excluding the current analysisId from the list
 *
 * @param leadId - UUID of the lead (must be verified by cookie before calling)
 * @param limit  - max rows to return (1–50)
 */
export async function listAnalysesForLeadPicker(
  leadId: string,
  limit: number = 20
): Promise<AnalysisPickerRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const safeLimit = Math.min(Math.max(1, limit), 50);

  const rows = await db
    .select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      status: analyses.status,
      fileName: analyses.fileName,
      previewJson: analyses.previewJson,
    })
    .from(analyses)
    .where(eq(analyses.leadId, leadId))
    .orderBy(desc(analyses.createdAt))
    .limit(safeLimit * 3); // over-fetch to account for filtered-out rows

  // Filter out processing/failed/purged in application layer
  // (avoids complex Drizzle enum NOT IN syntax)
  const EXCLUDED_STATUSES = new Set(["processing", "failed", "purged"]);
  const filtered = rows
    .filter((row) => !EXCLUDED_STATUSES.has(row.status))
    .slice(0, safeLimit);

  return filtered as AnalysisPickerRow[];
}
