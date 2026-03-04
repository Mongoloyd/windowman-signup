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
