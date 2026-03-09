/**
 * WindowMan Comms Brain — Twilio Provider Layer
 * ═══════════════════════════════════════════════
 *
 * Portable, single-boundary abstraction over Twilio's API surface.
 * Encapsulates ONLY Twilio provider operations:
 *   - Lookup v2 (line type intelligence)
 *   - Verify (send OTP, check OTP)
 *   - Messaging (send SMS)
 *   - Credential/config validation
 *
 * This module does NOT handle:
 *   - Rate limiting or backoff (stays in route handlers)
 *   - Database writes (stays in route handlers)
 *   - Session/cookie management (stays in route handlers)
 *   - Event logging (stays in route handlers)
 *   - Phone normalization (stays in route handlers — different Zod schemas per route)
 *
 * Design rules:
 *   1. Lazy initialization — Twilio client created on first method call, never at import time.
 *   2. Missing env vars log a warning at import time but NEVER crash.
 *   3. Methods throw only when invoked with missing config.
 *   4. Safe logging — phone numbers are masked in all log output.
 *   5. The `as any` cast on Lookup v2 lineTypeIntelligence is preserved
 *      because the Twilio SDK types don't fully expose this field.
 */

import type Twilio from "twilio";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LookupResult {
  /** Twilio Lookup v2 line type: "mobile", "voip", "landline", or null if lookup failed */
  lineType: string | null;
}

export interface VerifySendResult {
  /** Twilio Verify status after sending (typically "pending") */
  status: string;
}

export interface VerifyCheckResult {
  /** Twilio Verify status after checking (typically "approved" or "pending") */
  status: string;
}

export interface SmsSendResult {
  /** Twilio message SID */
  sid: string;
}

export interface TwilioConfigStatus {
  /** Whether the base credentials (ACCOUNT_SID + AUTH_TOKEN) are present */
  hasCredentials: boolean;
  /** Whether the Verify Service SID is present */
  hasVerifyService: boolean;
  /** Whether the FROM phone number is present */
  hasFromNumber: boolean;
  /** Whether the credentials are valid (requires live API call) */
  credentialsValid: boolean;
}

// ─── Safe Logging ───────────────────────────────────────────────────────────

/** Mask a phone number for safe logging. "+14155551212" → "***1212" */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return "***" + phone.slice(-4);
}

// ─── Service Class ──────────────────────────────────────────────────────────

/**
 * TwilioService — portable provider boundary for all Twilio API calls.
 *
 * Singleton. Lazily initializes the Twilio client on first use.
 * All methods are async and throw descriptive errors on misconfiguration.
 */
export class TwilioService {
  private client: ReturnType<typeof Twilio> | null = null;
  private initialized = false;

  // Env vars read once at construction (not at import time of the module)
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly fromNumber: string;
  private readonly verifyServiceSid: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER ?? "";
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";
  }

  // ── Lazy Client Initialization ──────────────────────────────────────────

  /**
   * Get the Twilio client, creating it lazily on first call.
   * Throws if credentials are missing.
   */
  private getClient(): NonNullable<ReturnType<typeof Twilio>> {
    if (this.client) return this.client;

    if (!this.accountSid || !this.authToken) {
      throw new Error(
        "[TwilioService] Cannot initialize: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing."
      );
    }

    // Dynamic require to avoid import-time side effects.
    // The twilio SDK performs work at import time; we defer it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilioFactory = require("twilio") as typeof Twilio;
    this.client = twilioFactory(this.accountSid, this.authToken);
    this.initialized = true;
    return this.client;
  }

  /**
   * Check whether the service CAN be initialized (credentials present).
   * Does NOT create the client or make any API calls.
   */
  get isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken);
  }

  /**
   * Check whether the Verify service is configured.
   */
  get isVerifyConfigured(): boolean {
    return this.isConfigured && Boolean(this.verifyServiceSid);
  }

  // ── Lookup v2 ───────────────────────────────────────────────────────────

  /**
   * Perform a Twilio Lookup v2 to determine the line type of a phone number.
   *
   * @param e164Phone — Phone number in E.164 format (e.g. "+14155551212")
   * @returns LookupResult with lineType ("mobile", "voip", "landline", or null on failure)
   *
   * Does NOT throw on Twilio API errors — returns { lineType: null } instead.
   * This matches the current behavior in both routers.
   */
  async lookupLineType(e164Phone: string): Promise<LookupResult> {
    const client = this.getClient();

    try {
      const lookup = await client.lookups.v2
        .phoneNumbers(e164Phone)
        .fetch({ fields: "line_type_intelligence" });

      // The Twilio SDK types don't fully expose lineTypeIntelligence.
      // Preserve the existing `as any` cast for compatibility.
      const lineType: string | null =
        (lookup as any).lineTypeIntelligence?.type ?? null;

      return { lineType };
    } catch (err) {
      console.warn(`[TwilioService] Lookup failed for ${maskPhone(e164Phone)}:`, err);
      return { lineType: null };
    }
  }

  // ── Verify: Send OTP ──────────────────────────────────────────────────

  /**
   * Send an OTP verification code via Twilio Verify.
   *
   * @param e164Phone — Phone number in E.164 format
   * @throws Error if Verify service is not configured or Twilio API fails
   */
  async sendOTP(e164Phone: string): Promise<VerifySendResult> {
    if (!this.verifyServiceSid) {
      throw new Error("[TwilioService] TWILIO_VERIFY_SERVICE_SID is not configured.");
    }

    const client = this.getClient();

    const verification = await client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({ to: e164Phone, channel: "sms" });

    return { status: verification.status };
  }

  // ── Verify: Check OTP ─────────────────────────────────────────────────

  /**
   * Check an OTP verification code via Twilio Verify.
   *
   * @param e164Phone — Phone number in E.164 format
   * @param code — 6-digit OTP code entered by the user
   * @returns VerifyCheckResult with status ("approved" on success, "pending" on wrong code)
   * @throws Error if Verify service is not configured or Twilio API fails
   */
  async verifyOTP(e164Phone: string, code: string): Promise<VerifyCheckResult> {
    if (!this.verifyServiceSid) {
      throw new Error("[TwilioService] TWILIO_VERIFY_SERVICE_SID is not configured.");
    }

    const client = this.getClient();

    const check = await client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({ to: e164Phone, code });

    return { status: check.status };
  }

  // ── SMS Send ──────────────────────────────────────────────────────────

  /**
   * Send a plain SMS message via Twilio Messaging.
   *
   * @param to — Recipient phone number in E.164 format
   * @param body — SMS message body
   * @returns SmsSendResult with the Twilio message SID
   * @throws Error if FROM number is not configured or Twilio API fails
   */
  async sendSMS(to: string, body: string): Promise<SmsSendResult> {
    if (!this.fromNumber) {
      throw new Error("[TwilioService] TWILIO_PHONE_NUMBER is not configured.");
    }

    const client = this.getClient();

    const message = await client.messages.create({
      from: this.fromNumber,
      to,
      body,
    });

    return { sid: message.sid };
  }

  // ── Credential / Config Validation ────────────────────────────────────

  /**
   * Validate that Twilio credentials are working by fetching the account.
   * Returns false (does NOT throw) if credentials are missing or invalid.
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const client = this.getClient();
      const account = await client.api.accounts(this.accountSid!).fetch();
      return account.status === "active";
    } catch {
      return false;
    }
  }

  /**
   * Get a full config status report (no API calls except validateCredentials).
   * Useful for health checks and debug pages.
   */
  async getConfigStatus(): Promise<TwilioConfigStatus> {
    return {
      hasCredentials: this.isConfigured,
      hasVerifyService: Boolean(this.verifyServiceSid),
      hasFromNumber: Boolean(this.fromNumber),
      credentialsValid: await this.validateCredentials(),
    };
  }

  /**
   * Get the configured FROM phone number.
   * Returns empty string if not configured.
   */
  get from(): string {
    return this.fromNumber;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

/**
 * Module-level singleton. Safe to import anywhere — no side effects at import time.
 * The Twilio SDK client is created lazily on first method call.
 */
export const twilioService = new TwilioService();
