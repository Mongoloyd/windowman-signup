import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { sendSMS, validateCredentials } from "../twilio";

// E.164 phone number regex
const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number");

export const twilioRouter = router({
  /**
   * Validate Twilio credentials are working.
   */
  validateCredentials: publicProcedure.query(async () => {
    const isValid = await validateCredentials();
    return { valid: isValid };
  }),

  /**
   * Send an SMS lead notification to the WindowMan team when a user submits
   * the qualification form (Flow B) or requests a callback.
   */
  sendLeadSMS: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        phone: phoneSchema,
        county: z.string().optional(),
        timeline: z.string().optional(),
        windowCount: z.string().optional(),
        hasEstimate: z.boolean().optional(),
        source: z.enum(["flow_a", "flow_b", "callback"]).default("flow_b"),
      })
    )
    .mutation(async ({ input }) => {
      const { name, phone, county, timeline, windowCount, hasEstimate, source } = input;

      // Build the SMS body for the WindowMan team notification
      const flowLabel =
        source === "flow_a"
          ? "Quote Analysis Complete"
          : source === "flow_b"
          ? "Lead Qualification Form"
          : "Callback Request";

      const smsBody = [
        `🏠 NEW WINDOWMAN LEAD — ${flowLabel}`,
        `Name: ${name}`,
        `Phone: ${phone}`,
        county ? `County: ${county}` : null,
        timeline ? `Timeline: ${timeline}` : null,
        windowCount ? `Windows: ${windowCount}` : null,
        hasEstimate !== undefined ? `Has Estimate: ${hasEstimate ? "Yes" : "No"}` : null,
        `Source: /signup`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        // Send SMS to the WindowMan team phone (the Twilio number itself as a demo;
        // in production, replace TWILIO_FROM with the team's actual number)
        const teamPhone = process.env.TWILIO_TEAM_PHONE ?? process.env.TWILIO_PHONE_NUMBER ?? "";
        if (!teamPhone) throw new Error("No team phone number configured");

        const sid = await sendSMS(teamPhone, smsBody);

        // Also notify via Manus notification system
        await notifyOwner({
          title: `New WindowMan Lead: ${name}`,
          content: smsBody,
        });

        return { success: true, sid };
      } catch (err) {
        console.error("[Twilio] sendLeadSMS error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send lead notification. Please try again.",
        });
      }
    }),

  /**
   * Send a confirmation SMS to the homeowner after they submit their info.
   */
  sendConfirmationSMS: publicProcedure
    .input(
      z.object({
        phone: phoneSchema,
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const { phone, name } = input;

      const confirmationBody = [
        `Hi ${name}! 👋 This is WindowMan.`,
        ``,
        `We've received your request and a certified window expert will contact you shortly.`,
        ``,
        `In the meantime, you can scan your contractor quote at: windowman-signup-qkvsde9f.manus.space`,
        ``,
        `Reply STOP to opt out.`,
      ].join("\n");

      try {
        const sid = await sendSMS(phone, confirmationBody);
        return { success: true, sid };
      } catch (err) {
        console.error("[Twilio] sendConfirmationSMS error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send confirmation SMS.",
        });
      }
    }),
});
