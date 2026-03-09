/**
 * WindowMan Comms Brain — Barrel Export
 * ══════════════════════════════════════
 *
 * Single entry point for all communication provider services.
 * Currently: Twilio (SMS, OTP, Lookup).
 * Future: Resend email, push notifications, etc.
 */

export { twilioService, TwilioService } from "./twilio";
export type {
  LookupResult,
  VerifySendResult,
  VerifyCheckResult,
  SmsSendResult,
  TwilioConfigStatus,
} from "./twilio";
