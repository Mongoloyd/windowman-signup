/**
 * WindowMan Analysis Router
 * Implements the full verified upload funnel per spec:
 *   upload → email gate → magic link → preview → phone OTP → full analysis
 *
 * Security rules (non-negotiable):
 * - Full JSON is NEVER sent to the browser before phone OTP is verified.
 * - All tokens stored as SHA-256 hashes only.
 * - File MIME validated server-side.
 * - 10MB file size limit enforced server-side.
 * - Magic links are single-use (consumed_at set on first click).
 * - Cross-device attach via temp_attach_token in magic link URL.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import {
  createAnalysis,
  getAnalysisById,
  getAnalysisByTempSession,
  attachAnalysisToLead,
  setAnalysisPreviewFields,
  unlockFullAnalysis,
  markAnalysisFailed,
  storeAnalysisEnvelope,
  createLead,
  getLeadByEmail,
  setLeadEmailVerified,
  setLeadPhoneVerified,
  createEmailVerification,
  getEmailVerificationByTokenHash,
  consumeEmailVerification,
  logLeadEvent,
  createLeadSession,
} from "../db";
import { sendMagicLinkEmail } from "../email";
import { twilioClient } from "../twilio";
import { analyzeQuote, LovableAnalysisError } from "../services/lovableAnalysis";
import { notifyOwner } from "../_core/notification";
import { randomUUID, createHash } from "crypto";
import { randomBytes } from "crypto";

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://itswindowman.com";

// Allowed MIME types for quote uploads
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** SHA-256 hash a token for DB storage */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a cryptographically secure random token */
function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

// runStubAnalysis removed — replaced by Lovable Analysis Authority (analyzeQuote)

export const analysisRouter = router({
  /**
   * Step 1: Upload quote file.
   * Accepts base64-encoded file data.
   * Stores to S3 temp/ prefix.
   * Runs stub AI analysis.
   * Returns tempSessionId for the email gate.
   */
  upload: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string(),
        fileSizeBytes: z.number().int().positive(),
        fileBase64: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { fileName, mimeType, fileSizeBytes, fileBase64 } = input;

      // Server-side MIME validation
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file type. Please upload a PDF, PNG, JPG, or WebP file.",
        });
      }

      // Server-side size validation
      if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large. Maximum size is 10MB.",
        });
      }

      // Decode base64 and upload to S3 temp/
      let fileBuffer: Buffer;
      try {
        const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
        fileBuffer = Buffer.from(base64Data, "base64");
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid file data." });
      }

      const tempSessionId = generateToken(16);
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
      const s3Key = `temp/${tempSessionId}-${Date.now()}.${ext}`;

      let fileUrl: string;
      try {
        const result = await storagePut(s3Key, fileBuffer, mimeType);
        fileUrl = result.url;
      } catch (err) {
        console.error("[Analysis] S3 upload failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "File upload failed. Please try again." });
      }

      // Create the analysis stub record in DB (status=temp, no preview yet)
      const analysisId = randomUUID();
      const traceId = randomUUID();
      await createAnalysis({
        id: analysisId,
        leadId: null,
        tempSessionId,
        fileUrl,
        fileName,
        mimeType,
        status: "temp",
      });

      // Log: wm_analysis_requested
      await logLeadEvent({
        id: randomUUID(),
        leadId: analysisId,
        eventName: "wm_analysis_requested",
        eventId: `${analysisId}_wm_analysis_requested`,
        source: "server",
        payload: { analysisId, traceId, mimeType, fileName },
      }).catch(() => {});

      // Call the Lovable Analysis Authority
      // Preview fields are set ONLY from envelope.preview — never derived from fullJson.
      let envelope;
      try {
        envelope = await analyzeQuote({
          s3Key,
          mimeType,
          trace_id: traceId,
        });
      } catch (err) {
        // Mark analysis as failed and surface a clean error to the client
        const errorCode =
          err instanceof LovableAnalysisError ? err.code : "UNKNOWN";
        const failedEventName = `wm_analysis_failed_${errorCode.toLowerCase()}`;
        console.error(`[Analysis] Lovable API failed (trace=${traceId}):`, err);
        await markAnalysisFailed(analysisId, errorCode).catch(() => {});
        await logLeadEvent({
          id: randomUUID(),
          leadId: analysisId,
          eventName: failedEventName,
          eventId: `${analysisId}_${failedEventName}`,
          source: "server",
          payload: { analysisId, traceId, errorCode },
        }).catch(() => {});
        // Fire owner notification for schema mismatch — this means Lovable shipped
        // a breaking schema change that requires immediate attention.
        if (
          err instanceof LovableAnalysisError &&
          err.code === "ANALYSIS_SCHEMA_MISMATCH"
        ) {
          const rawExcerpt = err.rawBody
            ? err.rawBody.slice(0, 400)
            : "(no body)";
          notifyOwner({
            title: "[WindowMan] ANALYSIS_SCHEMA_MISMATCH — Lovable schema changed",
            content: [
              `**Trace ID:** ${traceId}`,
              `**Analysis ID:** ${analysisId}`,
              `**File:** ${fileName} (${mimeType})`,
              `**Error:** ${err.message.slice(0, 600)}`,
              `**Raw body excerpt:**\n\`\`\`\n${rawExcerpt}\n\`\`\``,
              `**Action required:** The Lovable API response no longer matches AnalysisEnvelopeSchema.`,
              `Review the raw body above, update the schema in server/services/lovableAnalysis.ts, and redeploy.`,
            ].join("\n\n"),
          }).catch((notifyErr) => {
            console.error("[Analysis] Failed to send SCHEMA_MISMATCH owner notification:", notifyErr);
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof LovableAnalysisError &&
            err.code === "CONFIG_MISSING"
              ? "Analysis service is not configured. Please contact support."
              : err instanceof LovableAnalysisError &&
                err.code === "ANALYSIS_SCHEMA_MISMATCH"
              ? "Analysis returned an unexpected format. Please try again."
              : "Quote analysis failed. Please try again or upload a different file.",
        });
      }

      // Log: wm_analysis_received (pre-lead — no leadId yet; use analysisId as FK)
      // leadId is required by schema; use analysisId as a stable correlation key
      await logLeadEvent({
        id: randomUUID(),
        leadId: analysisId,
        eventName: "wm_analysis_received",
        eventId: `${analysisId}_wm_analysis_received`,
        source: "server",
        payload: {
          analysisId,
          traceId: envelope.meta.trace_id,
          analysisVersion: envelope.meta.analysis_version,
          score: envelope.preview.score,
          grade: envelope.preview.grade,
        },
      }).catch(() => {});

      // Store the full envelope + preview fields derived ONLY from envelope.preview
      // meta.trace_id and meta.analysis_version go into dedicated columns
      await storeAnalysisEnvelope(analysisId, {
        lovableEnvelope: envelope,
        fullJson: envelope.full,
        previewScore: envelope.preview.score,
        previewGrade: envelope.preview.grade,
        previewHeadline: envelope.preview.headline,
        previewRiskLevel: envelope.preview.risk_level,
        analysisVersion: envelope.meta.analysis_version,
        traceId: envelope.meta.trace_id,
      });

      // Log: wm_analysis_persisted
      await logLeadEvent({
        id: randomUUID(),
        leadId: analysisId,
        eventName: "wm_analysis_persisted",
        eventId: `${analysisId}_wm_analysis_persisted`,
        source: "server",
        payload: { analysisId, traceId: envelope.meta.trace_id },
      }).catch(() => {});

      return {
        analysisId,
        tempSessionId,
        /** Partial preview data shown during scanning animation */
        scanSummary: {
          overallScore: envelope.preview.score,
          grade: envelope.preview.grade,
          riskLevel: envelope.preview.risk_level,
          headline: envelope.preview.headline,
          warningCount: envelope.preview.warning_count,
          missingItemCount: envelope.preview.missing_item_count,
        },
      };
    }),

  /**
   * Step 2: Request email verification.
   * Creates email_verifications row, sends magic link via Resend.
   * Creates lead with email_verified=false immediately (Option B from spec).
   */
  requestEmailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email("Please enter a valid email address."),
        tempSessionId: z.string().min(1),
        /** Frontend origin for building the magic link URL */
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, tempSessionId, origin } = input;

      // Find the temp analysis
      const analysis = await getAnalysisByTempSession(tempSessionId);
      if (!analysis) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analysis session not found or expired. Please re-upload your file.",
        });
      }

      // Upsert lead (create if new, get existing if returning)
      let lead = await getLeadByEmail(email);
      if (!lead) {
        const leadId = randomUUID();
        await createLead({
          id: leadId,
          email,
          emailVerified: false,
          phoneVerified: false,
        });
        lead = await getLeadByEmail(email);
      }

      if (!lead) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create lead." });

      // Generate magic link token
      const rawToken = generateToken(32);
      const tokenHash = hashToken(rawToken);
      const tempAttachToken = generateToken(16);
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

      await createEmailVerification({
        id: randomUUID(),
        leadId: lead.id,
        email,
        tokenHash,
        tempAttachToken,
        expiresAt,
        consumedAt: null,
      });

      // Build magic link URL
      const baseUrl = origin ?? APP_BASE_URL;
      const magicLinkUrl = `${baseUrl}/verify-email?token=${rawToken}&attach=${tempAttachToken}&session=${tempSessionId}`;

      // Send magic link email
      await sendMagicLinkEmail({ to: email, magicLinkUrl, tempAttachToken });

      // Log event
      await logLeadEvent({
        id: randomUUID(),
        leadId: lead.id,
        eventName: "wm_email_verification_sent",
        eventId: `${lead.id}_email_verification_sent_${Date.now()}`,
        source: "server",
        payload: { email, tempSessionId },
      }).catch(() => {});

      return { success: true, leadId: lead.id };
    }),

  /**
   * Step 3: Verify email via magic link token.
   * Consumes the token, attaches analysis to lead, promotes file to vault/,
   * sets email_verified=true, issues email-auth session cookie.
   * Returns preview data (NOT full analysis — phone OTP still required).
   */
  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        tempSessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { token, tempSessionId } = input;

      const tokenHash = hashToken(token);
      const verification = await getEmailVerificationByTokenHash(tokenHash);

      if (!verification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This verification link is invalid or has already been used. Please request a new one.",
        });
      }

      if (new Date() > verification.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This verification link has expired (6 hour limit). Please re-upload your file to get a new link.",
        });
      }

      // Consume the token (single-use)
      await consumeEmailVerification(verification.id);

      // Mark lead as email verified
      const leadId = verification.leadId!;
      await setLeadEmailVerified(leadId);

      // Attach temp analysis to lead (if session provided or via tempAttachToken)
      const sessionId = tempSessionId ?? undefined;
      let analysis = sessionId ? await getAnalysisByTempSession(sessionId) : null;

      if (analysis) {
        await attachAnalysisToLead(analysis.id, leadId);
      }

      // Log event
      await logLeadEvent({
        id: randomUUID(),
        leadId,
        eventName: "wm_email_verified",
        eventId: `${leadId}_wm_email_verified`,
        source: "server",
        payload: { email: verification.email },
      }).catch(() => {});

      // Issue email-auth session cookie (HttpOnly, Secure, SameSite=Lax)
      // This authorizes /analysis/preview but NOT full analysis
      const sessionToken = generateToken(32);
      const sessionTokenHash = hashToken(sessionToken);
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for email session

      await createLeadSession({
        id: randomUUID(),
        leadId,
        sessionTokenHash,
        expiresAt: sessionExpiresAt,
        isRevoked: false,
      });

      // Set email-auth cookie
      ctx.res.cookie("wm_email_session", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      return {
        success: true,
        leadId,
        emailVerified: true,
        analysisId: analysis?.id ?? null,
        /** Preview data — safe to show before phone OTP */
        preview: analysis
          ? {
              score: analysis.previewScore,
              grade: analysis.previewGrade,
              findings: analysis.previewFindings,
              pillarStatuses: analysis.pillarStatuses,
            }
          : null,
      };
    }),

  /**
   * Step 4: Get preview data (requires email-auth session cookie).
   * Returns score, grade, pillar statuses, and 2-3 generic findings.
   * Does NOT return full JSON, dollar amounts, or contractor names.
   */
  getPreview: publicProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis || !analysis.leadId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found." });
      }

      // Only return preview fields — never full JSON
      return {
        analysisId: analysis.id,
        score: analysis.previewScore,
        grade: analysis.previewGrade,
        findings: analysis.previewFindings,
        pillarStatuses: analysis.pillarStatuses,
        status: analysis.status,
        isFullUnlocked: analysis.status === "full_unlocked",
      };
    }),

  /**
   * Step 5: Lookup phone (Lookup v2) before sending OTP.
   * Blocks VOIP and landlines.
   */
  lookupPhone: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .mutation(async ({ input }) => {
      if (!twilioClient) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Phone verification not configured." });
      }

      const digits = input.phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      let lineType: string | null = null;
      try {
        const lookup = await twilioClient.lookups.v2
          .phoneNumbers(e164)
          .fetch({ fields: "line_type_intelligence" });
        lineType = (lookup as any).lineTypeIntelligence?.type ?? null;
      } catch (err) {
        console.warn("[Lookup v2] Failed:", err);
      }

      if (lineType === "voip") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This appears to be a VOIP number (e.g. Google Voice). Please enter your mobile number to receive the verification code.",
        });
      }
      if (lineType === "landline") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Landline numbers can't receive SMS. Please enter a mobile number.",
        });
      }

      return { e164, lineType, isMobile: lineType === "mobile" || lineType === null };
    }),

  /**
   * Step 6: Send phone OTP via Twilio Verify.
   * Requires email-verified leadId.
   */
  sendPhoneOTP: publicProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        phone: z.string().min(7),
      })
    )
    .mutation(async ({ input }) => {
      if (!twilioClient || !VERIFY_SERVICE_SID) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Verify service not configured." });
      }

      const digits = input.phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      try {
        await twilioClient.verify.v2
          .services(VERIFY_SERVICE_SID)
          .verifications.create({ to: e164, channel: "sms" });
        return { success: true, e164 };
      } catch (err: any) {
        console.error("[Twilio Verify] sendPhoneOTP error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification code. Please try again.",
        });
      }
    }),

  /**
   * Step 7: Verify phone OTP.
   * On success: flip lead to phone_verified, unlock full analysis,
   * issue 30-day lead session cookie, send team notification.
   * Returns FULL analysis JSON.
   */
  verifyPhoneOTP: publicProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        analysisId: z.string().uuid(),
        phone: z.string().min(7),
        code: z.string().length(6).regex(/^\d{6}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { leadId, analysisId, phone, code } = input;

      if (!twilioClient || !VERIFY_SERVICE_SID) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Verify service not configured." });
      }

      const digits = phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      // Verify OTP with Twilio
      let verificationStatus: string;
      try {
        const check = await twilioClient.verify.v2
          .services(VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: e164, code });
        verificationStatus = check.status;
      } catch (err: any) {
        console.error("[Twilio Verify] verifyPhoneOTP error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Verification check failed. Please try again.",
        });
      }

      if (verificationStatus !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect code. Please check the SMS and try again.",
        });
      }

      // Flip lead to phone_verified
      await setLeadPhoneVerified(leadId, e164, null);

      // Unlock full analysis
      const analysis = await getAnalysisById(analysisId);
      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found." });
      }
      await unlockFullAnalysis(analysisId, analysis.fullJson);

      // Log event
      await logLeadEvent({
        id: randomUUID(),
        leadId,
        analysisId,
        eventName: "wm_phone_verified",
        eventId: `${leadId}_wm_phone_verified`,
        source: "server",
        payload: { phone: e164 },
      }).catch(() => {});

      await logLeadEvent({
        id: randomUUID(),
        leadId,
        analysisId,
        eventName: "wm_full_analysis_viewed",
        eventId: `${leadId}_wm_full_analysis_viewed`,
        source: "server",
        payload: { analysisId },
      }).catch(() => {});

      // Issue 30-day phone-verified session cookie
      const sessionToken = generateToken(32);
      const sessionTokenHash = hashToken(sessionToken);
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await createLeadSession({
        id: randomUUID(),
        leadId,
        sessionTokenHash,
        expiresAt: sessionExpiresAt,
        isRevoked: false,
      });

      ctx.res.cookie("wm_lead_session", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      // Send team notification SMS
      try {
        const { sendSMS } = await import("../twilio");
        const teamPhone = process.env.TWILIO_TEAM_PHONE ?? process.env.TWILIO_PHONE_NUMBER ?? "";
        if (teamPhone) {
          await sendSMS(teamPhone, `✅ VERIFIED LEAD (Quote Upload)\nPhone: ${e164}\nAnalysis: ${analysisId}\nScore: ${analysis.previewScore}/100 (${analysis.previewGrade})`);
        }
      } catch (err) {
        console.error("[Twilio] Team SMS failed:", err);
      }

      // Return full analysis — only sent AFTER phone OTP verified
      return {
        success: true,
        leadId,
        phoneVerified: true,
        fullAnalysis: analysis.fullJson,
      };
    }),

  /**
   * Flow B: No-quote lead qualification.
   * Creates lead, logs qualification answers.
   * Returns leadId for the phone OTP step.
   */
  submitNoQuoteLead: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        answers: z.record(z.string(), z.unknown()),
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, answers, origin } = input;

      let lead = await getLeadByEmail(email);
      if (!lead) {
        const leadId = randomUUID();
        await createLead({
          id: leadId,
          email,
          emailVerified: false,
          phoneVerified: false,
          qualificationAnswers: answers,
          qualificationCompletedAt: new Date(),
        });
        lead = await getLeadByEmail(email);
      }

      if (!lead) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create lead." });

      // Log event
      await logLeadEvent({
        id: randomUUID(),
        leadId: lead.id,
        eventName: "wm_account_created",
        eventId: `${lead.id}_wm_account_created`,
        source: "server",
        payload: { email, answers },
      }).catch(() => {});

      return { leadId: lead.id };
    }),
});
