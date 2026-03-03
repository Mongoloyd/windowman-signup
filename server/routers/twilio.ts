import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { sendSMS, validateCredentials, twilioClient } from "../twilio";
import {
  createLead,
  setLeadPhoneVerified,
  getAllLeads,
  logLeadEvent,
} from "../db";
import { randomUUID } from "crypto";

// E.164 phone number regex
const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number");

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";

export const twilioRouter = router({
  /**
   * Validate Twilio credentials are working.
   */
  validateCredentials: publicProcedure.query(async () => {
    const isValid = await validateCredentials();
    return { valid: isValid };
  }),

  /**
   * Step 1: Lookup v2 — check if the phone number is a mobile line.
   * Blocks VOIP and landlines before wasting a Verify credit.
   * Creates the lead in DB immediately with email = placeholder (legacy flow).
   * NOTE: This is the legacy flow (phone-only). New flow uses analysis.lookupPhone.
   */
  lookupAndCreateLead: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        phone: phoneSchema,
        source: z.enum(["flow_a", "flow_b", "callback"]).default("flow_b"),
        answers: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { name, phone, source, answers } = input;

      if (!twilioClient) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Twilio not configured." });
      }

      // Normalize to E.164
      const normalizedPhone = phone.replace(/\D/g, "");
      const e164Phone = normalizedPhone.startsWith("1")
        ? `+${normalizedPhone}`
        : `+1${normalizedPhone}`;

      // Twilio Lookup v2 — check line type
      let lineType: string | null = null;
      try {
        const lookup = await twilioClient.lookups.v2
          .phoneNumbers(e164Phone)
          .fetch({ fields: "line_type_intelligence" });
        lineType = (lookup as any).lineTypeIntelligence?.type ?? null;
      } catch (err) {
        console.warn("[Twilio Lookup] Failed to lookup phone:", err);
      }

      // Block VOIP and landlines
      if (lineType === "voip" || lineType === "landline") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            lineType === "voip"
              ? "This appears to be a VOIP number (e.g. Google Voice). Please enter your mobile number to receive the verification code."
              : "Landline numbers can't receive SMS. Please enter a mobile number.",
        });
      }

      // Create lead in DB with placeholder email (legacy phone-only flow)
      const leadId = randomUUID();
      await createLead({
        id: leadId,
        email: `phone_only_${leadId}@windowman.internal`,
        emailVerified: false,
        phoneE164: e164Phone,
        phoneVerified: false,
        lineType: lineType ?? "unknown",
        qualificationAnswers: answers ?? null,
      });

      return { leadId, phone: e164Phone, lineType };
    }),

  /**
   * Step 2: Send OTP via Twilio Verify.
   */
  sendOTP: publicProcedure
    .input(z.object({ phone: phoneSchema }))
    .mutation(async ({ input }) => {
      if (!twilioClient || !VERIFY_SERVICE_SID) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Verify service not configured." });
      }

      try {
        await twilioClient.verify.v2
          .services(VERIFY_SERVICE_SID)
          .verifications.create({ to: input.phone, channel: "sms" });
        return { success: true };
      } catch (err: any) {
        console.error("[Twilio Verify] sendOTP error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification code. Please try again.",
        });
      }
    }),

  /**
   * Step 3: Verify the OTP code.
   * On success: flip lead to phone_verified, send team SMS + owner notification.
   */
  verifyOTP: publicProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        phone: phoneSchema,
        code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
        name: z.string().min(1).max(100),
        answers: z.record(z.string(), z.unknown()).optional(),
        source: z.enum(["flow_a", "flow_b", "callback"]).default("flow_b"),
      })
    )
    .mutation(async ({ input }) => {
      const { leadId, phone, code, name, answers, source } = input;

      if (!twilioClient || !VERIFY_SERVICE_SID) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Verify service not configured." });
      }

      // Check the OTP code with Twilio
      let verificationStatus: string;
      try {
        const check = await twilioClient.verify.v2
          .services(VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: phone, code });
        verificationStatus = check.status;
      } catch (err: any) {
        console.error("[Twilio Verify] verifyOTP error:", err);
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
      await setLeadPhoneVerified(leadId, phone, null);

      // Log event
      await logLeadEvent({
        id: randomUUID(),
        leadId,
        eventName: "wm_phone_verified",
        eventId: `${leadId}_wm_phone_verified`,
        source: "server",
        payload: { source, name },
      }).catch(() => {});

      // Build team notification SMS
      const flowLabel =
        source === "flow_a" ? "Quote Analysis" : source === "flow_b" ? "Qualification Form" : "Callback";

      const answerLines = answers
        ? Object.entries(answers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        : "";

      const smsBody = [
        `✅ NEW VERIFIED WINDOWMAN LEAD — ${flowLabel}`,
        `Name: ${name}`,
        `Phone: ${phone}`,
        answerLines,
        `Source: /signup`,
      ]
        .filter(Boolean)
        .join("\n");

      // Send team notification SMS
      try {
        const teamPhone = process.env.TWILIO_TEAM_PHONE ?? process.env.TWILIO_PHONE_NUMBER ?? "";
        if (teamPhone) await sendSMS(teamPhone, smsBody);
      } catch (err) {
        console.error("[Twilio] Team SMS failed after verification:", err);
      }

      // Send confirmation SMS to homeowner
      try {
        const confirmationBody = [
          `Hi ${name}! 👋 This is WindowMan.`,
          ``,
          `Your phone is verified. A certified window expert will contact you shortly.`,
          ``,
          `Reply STOP to opt out.`,
        ].join("\n");
        await sendSMS(phone, confirmationBody);
      } catch (err) {
        console.error("[Twilio] Confirmation SMS failed:", err);
      }

      // Notify owner via Manus notification
      await notifyOwner({ title: `✅ Verified Lead: ${name}`, content: smsBody }).catch(() => {});

      return { success: true, status: "verified" };
    }),

  /**
   * Get all leads (admin use).
   */
  getLeads: publicProcedure.query(async () => {
    return getAllLeads();
  }),
});
