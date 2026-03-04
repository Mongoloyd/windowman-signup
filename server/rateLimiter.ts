/**
 * In-memory sliding-window rate limiter for Twilio API calls (OTP sends + Lookup v2).
 *
 * Enforces: max N requests per key within a rolling window of W milliseconds.
 * Each key (e.g. E.164 phone number) maintains a list of timestamps.
 * On each check, expired timestamps are pruned, then the count is compared
 * against the limit.
 *
 * Trade-offs:
 * - In-memory: resets on server restart (acceptable — Twilio itself has
 *   per-phone rate limits as a secondary backstop).
 * - Single-process: fine for our current deployment; if we scale to
 *   multiple processes, swap for Redis-backed limiter.
 */

export interface RateLimiterConfig {
  /** Maximum number of allowed requests within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the oldest entry in the window expires */
  retryAfterMs: number;
}

export class SlidingWindowRateLimiter {
  private buckets: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Check if a request for the given key is allowed.
   * If allowed, records the timestamp. If denied, does NOT record.
   */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;

    // Get or create the bucket for this key
    let timestamps = this.buckets.get(key);
    if (!timestamps) {
      timestamps = [];
      this.buckets.set(key, timestamps);
    }

    // Prune expired entries (outside the sliding window)
    const pruned = timestamps.filter((ts) => ts > cutoff);
    this.buckets.set(key, pruned);

    if (pruned.length >= this.maxRequests) {
      // Rate limit exceeded
      const oldestInWindow = pruned[0] ?? now;
      const retryAfterMs = oldestInWindow + this.windowMs;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    // Allowed — record this request
    pruned.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - pruned.length,
      retryAfterMs: 0,
    };
  }

  /**
   * Reset the bucket for a given key (e.g. after successful OTP verification).
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Get the current count for a key (for testing/debugging).
   */
  getCount(key: string, now: number = Date.now()): number {
    const cutoff = now - this.windowMs;
    const timestamps = this.buckets.get(key);
    if (!timestamps) return 0;
    return timestamps.filter((ts) => ts > cutoff).length;
  }

  /**
   * Clear all buckets (for testing).
   */
  clearAll(): void {
    this.buckets.clear();
  }
}

// ─── Singleton instance for OTP rate limiting ────────────────────────────────

/**
 * OTP rate limiter: max 5 sends per phone number per 10-minute window.
 * This is the primary defense against SMS bombing / Twilio bill attacks.
 */
export const otpRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
});

// ─── Singleton instance for Lookup v2 rate limiting ─────────────────────────

/**
 * Lookup rate limiter: max 10 lookups per phone number per 10-minute window.
 * Prevents Twilio Lookup v2 billing abuse (each lookup costs ~$0.01-$0.05).
 */
export const lookupRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 10,
  windowMs: 10 * 60 * 1000, // 10 minutes
});

// ─── Singleton instance for IP-based rate limiting (defense-in-depth) ────────

/**
 * IP rate limiter: max 20 combined Twilio calls (lookup + OTP) per IP per 10-minute window.
 * Prevents bot rotation attacks where different phone numbers are tried from the same IP.
 * This is checked BEFORE the per-phone limiters.
 */
export const ipRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 20,
  windowMs: 10 * 60 * 1000, // 10 minutes
});

// ─── Helper: extract client IP from Express request ─────────────────────────

/**
 * Extract the client IP from an Express request.
 * Respects x-forwarded-for (first entry) for reverse-proxy deployments,
 * falls back to req.ip or req.socket.remoteAddress.
 */
export function getClientIp(req: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

// ─── Progressive Exponential Backoff (Smart Cooldown) ─────────────────────

/**
 * Escalation tier configuration.
 * Each tier defines the cooldown duration and whether CAPTCHA is required.
 */
export interface BackoffTier {
  /** Cooldown duration in milliseconds (0 = no cooldown) */
  cooldownMs: number;
  /** Whether CAPTCHA is required at this tier */
  captchaRequired: boolean;
}

export interface BackoffResult {
  /** Whether the request is allowed right now */
  allowed: boolean;
  /** Current failure count (before this attempt) */
  failureCount: number;
  /** Milliseconds remaining until cooldown expires (0 if allowed) */
  cooldownRemainingMs: number;
  /** Whether CAPTCHA is required at the current tier */
  captchaRequired: boolean;
  /** Human-readable message for the frontend */
  message: string;
}

/**
 * Progressive exponential backoff for OTP verification failures.
 *
 * Instead of a flat block, escalates punishment progressively:
 *   1st fail: no cooldown (fat-finger forgiveness)
 *   2nd fail: 30-second delay
 *   3rd fail: 2-minute delay
 *   4th+ fail: 10-minute block + CAPTCHA required
 *
 * This preserves conversion for real humans while making brute-force
 * mathematically impossible for bots.
 *
 * Keyed by phone number (E.164). Resets on successful verification.
 */
export class ProgressiveBackoff {
  private state: Map<string, { failureCount: number; lastFailureAt: number }> = new Map();
  private readonly tiers: BackoffTier[];

  constructor(tiers: BackoffTier[]) {
    if (tiers.length === 0) throw new Error("At least one backoff tier is required.");
    this.tiers = tiers;
  }

  /**
   * Record a failed verification attempt and return the current backoff state.
   * Call this AFTER a failed OTP check.
   */
  recordFailure(key: string, now: number = Date.now()): BackoffResult {
    const entry = this.state.get(key);
    const failureCount = (entry?.failureCount ?? 0) + 1;
    this.state.set(key, { failureCount, lastFailureAt: now });

    const tierIndex = Math.min(failureCount - 1, this.tiers.length - 1);
    const tier = this.tiers[tierIndex];

    return {
      allowed: true, // Just recording; next check() will enforce
      failureCount,
      cooldownRemainingMs: tier.cooldownMs,
      captchaRequired: tier.captchaRequired,
      message: this.buildMessage(tier, failureCount),
    };
  }

  /**
   * Check if a request is allowed (not in cooldown).
   * Call this BEFORE attempting OTP verification.
   */
  check(key: string, now: number = Date.now()): BackoffResult {
    const entry = this.state.get(key);
    if (!entry || entry.failureCount === 0) {
      return {
        allowed: true,
        failureCount: 0,
        cooldownRemainingMs: 0,
        captchaRequired: false,
        message: "",
      };
    }

    const tierIndex = Math.min(entry.failureCount - 1, this.tiers.length - 1);
    const tier = this.tiers[tierIndex];
    const elapsed = now - entry.lastFailureAt;
    const remaining = Math.max(0, tier.cooldownMs - elapsed);

    if (remaining > 0) {
      return {
        allowed: false,
        failureCount: entry.failureCount,
        cooldownRemainingMs: remaining,
        captchaRequired: tier.captchaRequired,
        message: this.buildMessage(tier, entry.failureCount),
      };
    }

    // Cooldown expired — allowed, but still at the current tier
    return {
      allowed: true,
      failureCount: entry.failureCount,
      cooldownRemainingMs: 0,
      captchaRequired: tier.captchaRequired,
      message: "",
    };
  }

  /**
   * Reset backoff state for a key (call on successful OTP verification).
   */
  reset(key: string): void {
    this.state.delete(key);
  }

  /**
   * Get the current failure count for a key (for testing/debugging).
   */
  getFailureCount(key: string): number {
    return this.state.get(key)?.failureCount ?? 0;
  }

  /**
   * Clear all state (for testing).
   */
  clearAll(): void {
    this.state.clear();
  }

  private buildMessage(tier: BackoffTier, failureCount: number): string {
    if (tier.cooldownMs === 0) {
      return "Incorrect code. Please check the SMS and try again.";
    }
    const seconds = Math.round(tier.cooldownMs / 1000);
    const timeStr = seconds >= 60 ? `${Math.round(seconds / 60)} minute${seconds >= 120 ? "s" : ""}` : `${seconds} seconds`;
    const base = `Too many incorrect attempts. Please wait ${timeStr} before trying again.`;
    return tier.captchaRequired ? `${base} You'll need to complete a verification challenge.` : base;
  }
}

// ─── Singleton: OTP verification backoff ─────────────────────────────────

/**
 * Progressive backoff for OTP verification failures.
 * Tier escalation:
 *   1st fail: 0s cooldown (forgiveness for fat-fingers)
 *   2nd fail: 30s cooldown
 *   3rd fail: 2min cooldown
 *   4th+ fail: 10min cooldown + CAPTCHA required
 */
export const otpBackoff = new ProgressiveBackoff([
  { cooldownMs: 0, captchaRequired: false },                    // 1st fail
  { cooldownMs: 30 * 1000, captchaRequired: false },             // 2nd fail
  { cooldownMs: 2 * 60 * 1000, captchaRequired: false },         // 3rd fail
  { cooldownMs: 10 * 60 * 1000, captchaRequired: true },         // 4th+ fail
]);
