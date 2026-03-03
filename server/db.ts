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

export async function setAnalysisPreviewFields(
  analysisId: string,
  fields: {
    previewScore: number;
    previewGrade: string;
    previewFindings: unknown[];
    pillarStatuses: Record<string, string>;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({
    previewScore: fields.previewScore,
    previewGrade: fields.previewGrade,
    previewFindings: fields.previewFindings,
    pillarStatuses: fields.pillarStatuses,
  }).where(eq(analyses.id, analysisId));
}

export async function unlockFullAnalysis(analysisId: string, fullJson: unknown): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({
    status: "full_unlocked",
    fullJson,
  }).where(eq(analyses.id, analysisId));
}

/**
 * Store the complete Lovable API envelope and derived preview fields.
 * Preview fields come ONLY from envelope.preview — never derived from fullJson.
 */
export async function storeAnalysisEnvelope(
  analysisId: string,
  opts: {
    lovableEnvelope: unknown;
    fullJson: unknown;
    previewScore: number;
    previewGrade: string;
    previewFindings: unknown[];
    pillarStatuses: Record<string, string>;
    analysisVersion: string;
    traceId: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({
    lovableEnvelope: opts.lovableEnvelope,
    fullJson: opts.fullJson,
    previewScore: opts.previewScore,
    previewGrade: opts.previewGrade,
    previewFindings: opts.previewFindings,
    pillarStatuses: opts.pillarStatuses,
    analysisVersion: opts.analysisVersion,
    traceId: opts.traceId,
    status: "persisted_email_verified",
  }).where(eq(analyses.id, analysisId));
}

export async function markAnalysisFailed(analysisId: string, errorCode: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set({ status: "failed", errorCode }).where(eq(analyses.id, analysisId));
}

/**
 * Fetch all temp analyses older than 6 hours (for purge job).
 */
export async function getExpiredTempAnalyses(): Promise<Analysis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return db
    .select()
    .from(analyses)
    .where(and(eq(analyses.status, "temp"), lt(analyses.createdAt, sixHoursAgo)));
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
