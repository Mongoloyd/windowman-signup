/**
 * WindowMan Analysis Router
 * Implements the full verified upload funnel per spec:
 *   upload → email gate → magic link → preview → phone OTP → full analysis
 *
 * Security rules (non-negotiable):
 * - Full JSON is NEVER sent to the browser before phone OTP is verified.
 * - Preview fields come ONLY from previewJson (SafePreview shape) — never from fullJson.
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
  updateAnalysisPipelineResults,
  unlockFullAnalysis,
  markAnalysisFailed,
  createLead,
  getLeadByEmail,
  setLeadEmailVerified,
  setLeadPhoneVerified,
  createEmailVerification,
  getEmailVerificationByTokenHash,
  consumeEmailVerification,
  logLeadEvent,
  createLeadSession,
  getAnalysisByHash,
  setLeadFraud,
  getLeadById,
} from "../db";
import { sendMagicLinkEmail } from "../email";
import { twilioClient } from "../twilio";
import { randomUUID, createHash } from "crypto";
import { randomBytes } from "crypto";
import { runPipeline, BRAIN_VERSION, AnalysisEngineError } from "../services/analysisEngine";
import type { SafePreview } from "../scanner-brain";
import { otpRateLimiter, lookupRateLimiter, ipRateLimiter, getClientIp, otpBackoff } from "../rateLimiter";

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

/** SHA-256 hash file bytes for dedup */
function hashFileBytes(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Safely extract SafePreview from the previewJson column */
function getPreviewFromAnalysis(analysis: { previewJson: unknown }): SafePreview | null {
  if (!analysis.previewJson) return null;
  return analysis.previewJson as SafePreview;
}

export const analysisRouter = router({
  /**
   * Step 1: Upload quote file.
   * Accepts base64-encoded file data.
   * Stores to S3 temp/ prefix.
   * Inserts row as status='processing', kicks off background pipeline.
   * Returns tempSessionId + analysisId for polling.
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

      // Decode base64
      let fileBuffer: Buffer;
      try {
        const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
        fileBuffer = Buffer.from(base64Data, "base64");
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid file data." });
      }

      // SHA-256 dedup check
      const fileHash = hashFileBytes(fileBuffer);
      // Check for duplicate upload (same file bytes already analyzed)
      const existingAnalysis = await getAnalysisByHash(fileHash).catch(() => null);
      if (existingAnalysis && existingAnalysis.status !== "failed" && existingAnalysis.status !== "purged") {
        // Log dedup hit event if a lead is attached to the existing analysis
        if (existingAnalysis.leadId) {
          await logLeadEvent({
            id: randomUUID(),
            leadId: existingAnalysis.leadId,
            analysisId: existingAnalysis.id,
            eventName: "wm_scanner_dedup_hit",
            eventId: `${existingAnalysis.leadId}_wm_scanner_dedup_hit_${existingAnalysis.id}`,
            source: "server",
            payload: { fileHash, existingAnalysisId: existingAnalysis.id, status: existingAnalysis.status },
          }).catch(() => {});
        }
        console.log(`[Pipeline] Dedup hit: returning existing analysis ${existingAnalysis.id} for hash ${fileHash.slice(0, 8)}...`);
        return {
          analysisId: existingAnalysis.id,
          tempSessionId: existingAnalysis.tempSessionId ?? generateToken(16),
          status: existingAnalysis.status as "processing",
          dedupHit: true,
        };
      }

      // Upload to S3 temp/
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

      // Insert row immediately as status='processing'
      const analysisId = randomUUID();
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours TTL

      await createAnalysis({
        id: analysisId,
        leadId: null,
        tempSessionId,
        fileKey: s3Key,
        fileUrl,
        fileHash,
        fileName,
        mimeType,
        status: "processing",
        rubricVersion: BRAIN_VERSION,
        expiresAt,
      });

      // Fire background pipeline (non-blocking)
      runPipeline({ analysisId, fileUrl, mimeType })
        .then(async (result) => {
          await updateAnalysisPipelineResults(analysisId, {
            status: "temp",
            ocrTextKey: result.ocrTextKey,
            ocrTextUrl: result.ocrTextUrl,
            ocrMeta: {
              page_count: result.ocrResult.page_count,
              confidence_score: result.ocrResult.confidence_score,
              mime: mimeType,
            },
            proofOfRead: result.proofOfRead,
            previewJson: result.preview,
            fullJson: result.fullJson,
            rawExtractionOutput: result.rawExtractionOutput,
            rawAnalysisOutput: result.rawOcrOutput,
          });

          console.log(`[Pipeline] Analysis ${analysisId} completed successfully.`);
          // Observability: log scanner_analysis_completed event if lead is attached
          const completedAnalysis = await getAnalysisById(analysisId).catch(() => null);
          if (completedAnalysis?.leadId) {
            await logLeadEvent({
              id: randomUUID(),
              leadId: completedAnalysis.leadId,
              analysisId,
              eventName: "wm_scanner_analysis_completed",
              eventId: `${completedAnalysis.leadId}_wm_scanner_analysis_completed_${analysisId}`,
              source: "server",
              payload: {
                rubricVersion: BRAIN_VERSION,
                overallScore: result.preview?.overallScore ?? null,
                finalGrade: result.preview?.finalGrade ?? null,
                riskLevel: result.preview?.riskLevel ?? null,
              },
            }).catch(() => {});
          }
        })
        .catch(async (err) => {
          const errorCode = err instanceof AnalysisEngineError ? err.code : "UNKNOWN";
          console.error(`[Pipeline] Analysis ${analysisId} failed:`, err);
          await markAnalysisFailed(analysisId, errorCode).catch(() => {});
          // Observability: log scanner_analysis_failed event if lead is attached
          const failedAnalysis = await getAnalysisById(analysisId).catch(() => null);
          if (failedAnalysis?.leadId) {
            await logLeadEvent({
              id: randomUUID(),
              leadId: failedAnalysis.leadId,
              analysisId,
              eventName: "wm_scanner_analysis_failed",
              eventId: `${failedAnalysis.leadId}_wm_scanner_analysis_failed_${analysisId}`,
              source: "server",
              payload: { errorCode, rubricVersion: BRAIN_VERSION },
            }).catch(() => {});
          }
        });

      return {
        analysisId,
        tempSessionId,
        /** Status for polling — frontend should poll getStatus until 'temp' or 'failed' */
        status: "processing" as const,
      };
    }),

  /**
   * Poll analysis status (for background pipeline).
   * Returns current status + preview if available.
   */
  getStatus: publicProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found." });
      }

      const preview = getPreviewFromAnalysis(analysis);

      return {
        analysisId: analysis.id,
        status: analysis.status,
        /** Error code when status='failed' — e.g. NOT_A_QUOTE, GEMINI_TIMEOUT, etc. */
        errorCode: analysis.errorCode ?? null,
        preview: analysis.status === "processing" ? null : preview,
        /** Scan summary for the animation — only available after pipeline completes */
        scanSummary: preview
          ? {
              pillarsChecked: 5,
              overallScore: preview.overallScore,
              grade: preview.finalGrade,
            }
          : null,
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
        /** Honeypot — must be empty for real users */
        honeypot: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, tempSessionId, origin, honeypot } = input;
      const isBotSubmission = typeof honeypot === "string" && honeypot.trim().length > 0;

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
          isFraud: isBotSubmission,
        });
        lead = await getLeadByEmail(email);
      } else if (isBotSubmission && !lead.isFraud) {
        // Existing lead submitted by a bot — flag it
        await setLeadFraud(lead.id);
      }

      if (!lead) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create lead." });

      // Log honeypot event for observability
      if (isBotSubmission) {
        await logLeadEvent({
          id: randomUUID(),
          leadId: lead.id,
          eventName: "wm_honeypot_triggered",
          eventId: `${lead.id}_wm_honeypot_triggered_flow_a`,
          source: "server",
          payload: { honeypotLength: honeypot!.length, flow: "flow_a" },
        }).catch(() => {});
      }

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

      if (!tempSessionId) {
        console.warn(
          `[verifyEmail] No tempSessionId provided for lead ${leadId}. ` +
          `Cross-device or Flow B detected. User will need to re-upload or select existing scan.`
        );
      }

      if (analysis) {
        await attachAnalysisToLead(analysis.id, leadId);
      } else if (tempSessionId) {
        console.warn(
          `[verifyEmail] tempSessionId provided but no analysis found for lead ${leadId}. ` +
          `Analysis may have been purged or session is invalid.`
        );
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

      // Extract preview from previewJson (SafePreview shape)
      const preview = analysis ? getPreviewFromAnalysis(analysis) : null;

      return {
        success: true,
        leadId,
        emailVerified: true,
        analysisId: analysis?.id ?? null,
        /** Preview data — safe to show before phone OTP */
        preview,
      };
    }),

  /**
   * Step 4: Get preview data (requires email-auth session cookie).
   * Returns SafePreview shape: overallScore, finalGrade, riskLevel, warningBucket, findings.
   * Does NOT return full JSON, dollar amounts, or contractor names.
   */
  getPreview: publicProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis || !analysis.leadId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found." });
      }

      const preview = getPreviewFromAnalysis(analysis);

      // Only return preview fields — never full JSON
      return {
        analysisId: analysis.id,
        status: analysis.status,
        isFullUnlocked: analysis.status === "full_unlocked",
        preview,
      };
    }),

  /**
   * Step 5: Lookup phone (Lookup v2) before sending OTP.
   * Blocks VOIP and landlines.
   */
  lookupPhone: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .mutation(async ({ input, ctx }) => {
      if (!twilioClient) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Phone verification not configured." });
      }

      const digits = input.phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      // ── IP rate limit: max 20 combined Twilio calls per IP per 10 min ──
      const clientIp = getClientIp(ctx.req);
      const ipCheck = ipRateLimiter.check(clientIp);
      if (!ipCheck.allowed) {
        console.warn(`[RateLimit] IP rate limit exceeded for ${clientIp}. Remaining: ${ipCheck.remaining}`);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please try again in 10 minutes.",
        });
      }

      // ── Per-phone rate limit: max 10 lookups per phone per 10-minute window ──
      const rateCheck = lookupRateLimiter.check(e164);
      if (!rateCheck.allowed) {
        console.warn(`[RateLimit] Lookup rate limit exceeded for ${e164}. Remaining: ${rateCheck.remaining}`);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please try again in 10 minutes.",
        });
      }

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
    .mutation(async ({ input, ctx }) => {
      if (!twilioClient || !VERIFY_SERVICE_SID) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Verify service not configured." });
      }

      const digits = input.phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      // ── IP rate limit: max 20 combined Twilio calls per IP per 10 min ──
      const clientIp = getClientIp(ctx.req);
      const ipCheck = ipRateLimiter.check(clientIp);
      if (!ipCheck.allowed) {
        console.warn(`[RateLimit] IP rate limit exceeded for ${clientIp}. Remaining: ${ipCheck.remaining}`);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please try again in 10 minutes.",
        });
      }

      // ── Per-phone rate limit: max 5 OTP sends per phone per 10-minute window ──
      const rateCheck = otpRateLimiter.check(e164);
      if (!rateCheck.allowed) {
        console.warn(`[RateLimit] OTP rate limit exceeded for ${e164}. Remaining: ${rateCheck.remaining}`);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please try again in 10 minutes.",
        });
      }

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

      // ── Progressive backoff: check if in cooldown from prior failures ──
      const backoffCheck = otpBackoff.check(e164);
      if (!backoffCheck.allowed) {
        console.warn(`[Backoff] OTP verify blocked for ${e164}. Failures: ${backoffCheck.failureCount}, cooldown: ${backoffCheck.cooldownRemainingMs}ms, captcha: ${backoffCheck.captchaRequired}`);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: backoffCheck.message,
          cause: {
            cooldownRemainingMs: backoffCheck.cooldownRemainingMs,
            captchaRequired: backoffCheck.captchaRequired,
            failureCount: backoffCheck.failureCount,
          },
        });
      }

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
        // Record failure and escalate backoff tier
        const backoffState = otpBackoff.recordFailure(e164);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: backoffState.message,
          cause: {
            cooldownRemainingMs: backoffState.cooldownRemainingMs,
            captchaRequired: backoffState.captchaRequired,
            failureCount: backoffState.failureCount,
          },
        });
      }

      // OTP verified — reset progressive backoff for this phone
      otpBackoff.reset(e164);

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

      // Send team notification SMS — extract from previewJson
      const preview = getPreviewFromAnalysis(analysis);
      try {
        const { sendSMS } = await import("../twilio");
        const teamPhone = process.env.TWILIO_TEAM_PHONE ?? process.env.TWILIO_PHONE_NUMBER ?? "";
        if (teamPhone) {
          const scoreText = preview ? `${preview.overallScore}/100 (${preview.finalGrade})` : "N/A";
          await sendSMS(teamPhone, `✅ VERIFIED LEAD (Quote Upload)\nPhone: ${e164}\nAnalysis: ${analysisId}\nScore: ${scoreText}`);
        }
      } catch (err) {
        console.error("[Twilio] Team SMS failed:", err);
      }

      // Fetch lead to get isFraud flag for client-side pixel guard
      const lead = await getLeadById(leadId);

      // Return full analysis — only sent AFTER phone OTP verified
      return {
        success: true,
        leadId,
        phoneVerified: true,
        fullAnalysis: analysis.fullJson,
        /** isFraud=true means honeypot was triggered — client must NOT fire conversion pixels */
        isFraud: lead?.isFraud ?? false,
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
        /** Honeypot — must be empty for real users */
        honeypot: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, answers, origin, honeypot } = input;
      const isBotSubmission = typeof honeypot === "string" && honeypot.trim().length > 0;

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
          isFraud: isBotSubmission,
        });
        lead = await getLeadByEmail(email);
      } else if (isBotSubmission && !lead.isFraud) {
        await setLeadFraud(lead.id);
      }

      if (!lead) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create lead." });

      // Log honeypot event for observability
      if (isBotSubmission) {
        await logLeadEvent({
          id: randomUUID(),
          leadId: lead.id,
          eventName: "wm_honeypot_triggered",
          eventId: `${lead.id}_wm_honeypot_triggered_flow_b`,
          source: "server",
          payload: { honeypotLength: honeypot!.length, flow: "flow_b" },
        }).catch(() => {});
        // Return success so the bot thinks it worked
        return { leadId: lead.id };
      }

      // Log normal account creation event
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
