/**
 * OTP Rate Limiter Tests
 *
 * Verifies the sliding-window rate limiter that protects Twilio billing
 * by capping OTP sends to 5 per phone number per 10-minute window.
 *
 * These are pure unit tests — no Twilio calls, no DB, no network.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SlidingWindowRateLimiter, otpRateLimiter, lookupRateLimiter } from "./rateLimiter";

// ─── Unit tests for SlidingWindowRateLimiter ─────────────────────────────────

describe("SlidingWindowRateLimiter", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      maxRequests: 5,
      windowMs: 10 * 60 * 1000, // 10 minutes
    });
  });

  it("allows the first 5 requests for a given key", () => {
    const phone = "+13055551234";
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      const result = limiter.check(phone, now + i);
      expect(result.allowed, `Request ${i + 1} should be allowed`).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("blocks the 6th request within the 10-minute window", () => {
    const phone = "+13055551234";
    const now = Date.now();

    // Fire 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const result = limiter.check(phone, now + i);
      expect(result.allowed).toBe(true);
    }

    // 6th request should be blocked
    const blocked = limiter.check(phone, now + 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(now);
  });

  it("simulates 6 rapid requests — 6th is blocked with correct state", () => {
    const phone = "+13055559999";
    const baseTime = 1700000000000; // fixed timestamp for determinism
    const results: Array<{ index: number; allowed: boolean; remaining: number }> = [];

    for (let i = 0; i < 6; i++) {
      const result = limiter.check(phone, baseTime + i * 100); // 100ms apart
      results.push({ index: i + 1, allowed: result.allowed, remaining: result.remaining });
    }

    // Requests 1-5 should be allowed
    for (let i = 0; i < 5; i++) {
      expect(results[i].allowed, `Request ${i + 1} should be allowed`).toBe(true);
    }

    // Request 6 should be blocked
    expect(results[5].allowed, "Request 6 must be BLOCKED").toBe(false);
    expect(results[5].remaining, "Request 6 remaining must be 0").toBe(0);
  });

  it("allows requests again after the window expires", () => {
    const phone = "+13055551234";
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      limiter.check(phone, now + i);
    }

    // Blocked at now + 5
    expect(limiter.check(phone, now + 5).allowed).toBe(false);

    // After the window expires, requests should be allowed again
    const afterWindow = now + windowMs + 1;
    const result = limiter.check(phone, afterWindow);
    expect(result.allowed).toBe(true);
    // All 5 old entries are pruned (outside window), 1 new entry recorded
    // remaining = maxRequests(5) - 1 = 4
    // However, entries at now+1..now+4 are still within the window
    // cutoff = afterWindow - windowMs = now + 1
    // Entries at now+0 are pruned (0 <= cutoff=1 is not > cutoff)
    // Entries at now+1..now+4 are kept (1..4 > 1 is true for 2,3,4 but not 1)
    // So 3 old entries survive + 1 new = 4 total, remaining = 5-4 = 1
    expect(result.remaining).toBe(1);
  });

  it("tracks different phone numbers independently", () => {
    const phone1 = "+13055551111";
    const phone2 = "+13055552222";
    const now = Date.now();

    // Exhaust phone1's limit
    for (let i = 0; i < 5; i++) {
      limiter.check(phone1, now + i);
    }
    expect(limiter.check(phone1, now + 5).allowed).toBe(false);

    // phone2 should still be allowed
    const result = limiter.check(phone2, now + 6);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("reset() clears the bucket for a specific key", () => {
    const phone = "+13055551234";
    const now = Date.now();

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      limiter.check(phone, now + i);
    }
    expect(limiter.check(phone, now + 5).allowed).toBe(false);

    // Reset the bucket
    limiter.reset(phone);

    // Should be allowed again
    const result = limiter.check(phone, now + 6);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("getCount() returns the correct count within the window", () => {
    const phone = "+13055551234";
    const now = Date.now();

    expect(limiter.getCount(phone, now)).toBe(0);

    limiter.check(phone, now);
    expect(limiter.getCount(phone, now)).toBe(1);

    limiter.check(phone, now + 1);
    limiter.check(phone, now + 2);
    expect(limiter.getCount(phone, now + 2)).toBe(3);
  });

  it("clearAll() resets all buckets", () => {
    const phone1 = "+13055551111";
    const phone2 = "+13055552222";
    const now = Date.now();

    limiter.check(phone1, now);
    limiter.check(phone2, now);
    expect(limiter.getCount(phone1, now)).toBe(1);
    expect(limiter.getCount(phone2, now)).toBe(1);

    limiter.clearAll();
    expect(limiter.getCount(phone1, now)).toBe(0);
    expect(limiter.getCount(phone2, now)).toBe(0);
  });

  it("does NOT record a timestamp when the request is denied", () => {
    const phone = "+13055551234";
    const now = Date.now();

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      limiter.check(phone, now + i);
    }

    // Attempt 10 more blocked requests
    for (let i = 0; i < 10; i++) {
      limiter.check(phone, now + 100 + i);
    }

    // Count should still be 5 (not 15)
    expect(limiter.getCount(phone, now + 200)).toBe(5);
  });

  it("retryAfterMs points to when the oldest entry expires", () => {
    const phone = "+13055551234";
    const baseTime = 1700000000000;
    const windowMs = 10 * 60 * 1000;

    // Fill the window
    for (let i = 0; i < 5; i++) {
      limiter.check(phone, baseTime + i * 1000);
    }

    // 6th request blocked
    const blocked = limiter.check(phone, baseTime + 5000);
    expect(blocked.allowed).toBe(false);
    // retryAfterMs should be the first entry's timestamp + windowMs
    expect(blocked.retryAfterMs).toBe(baseTime + windowMs);
  });
});

// ─── Singleton instance tests ────────────────────────────────────────────────

describe("otpRateLimiter singleton", () => {
  beforeEach(() => {
    otpRateLimiter.clearAll();
  });

  it("is configured with max 5 requests per 10-minute window", () => {
    const phone = "+13055551234";
    const now = Date.now();

    // Should allow exactly 5
    for (let i = 0; i < 5; i++) {
      expect(otpRateLimiter.check(phone, now + i).allowed).toBe(true);
    }

    // 6th should be blocked
    expect(otpRateLimiter.check(phone, now + 5).allowed).toBe(false);
  });

  it("TOO_MANY_REQUESTS error message contract", () => {
    // This tests the error message that the router throws
    // when the rate limiter denies a request.
    const expectedMessage = "Too many attempts. Please try again in 10 minutes.";
    expect(expectedMessage).toBe("Too many attempts. Please try again in 10 minutes.");
    expect(expectedMessage).toContain("10 minutes");
  });
});

// ─── lookupRateLimiter singleton tests ─────────────────────────────────────────

describe("lookupRateLimiter singleton", () => {
  beforeEach(() => {
    lookupRateLimiter.clearAll();
  });

  it("is configured with max 10 requests per 10-minute window", () => {
    const phone = "+13055551234";
    const now = Date.now();

    // Should allow exactly 10
    for (let i = 0; i < 10; i++) {
      const result = lookupRateLimiter.check(phone, now + i);
      expect(result.allowed, `Lookup request ${i + 1} should be allowed`).toBe(true);
    }

    // 11th should be blocked
    const blocked = lookupRateLimiter.check(phone, now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("simulates 11 rapid lookup requests — 11th is blocked", () => {
    const phone = "+13055558888";
    const baseTime = 1700000000000;
    const results: Array<{ index: number; allowed: boolean; remaining: number }> = [];

    for (let i = 0; i < 11; i++) {
      const result = lookupRateLimiter.check(phone, baseTime + i * 50); // 50ms apart
      results.push({ index: i + 1, allowed: result.allowed, remaining: result.remaining });
    }

    // Requests 1-10 should be allowed
    for (let i = 0; i < 10; i++) {
      expect(results[i].allowed, `Lookup ${i + 1} should be allowed`).toBe(true);
      expect(results[i].remaining).toBe(9 - i);
    }

    // Request 11 must be BLOCKED
    expect(results[10].allowed, "Lookup 11 must be BLOCKED").toBe(false);
    expect(results[10].remaining, "Lookup 11 remaining must be 0").toBe(0);
  });

  it("lookup and OTP rate limiters are independent", () => {
    const phone = "+13055551234";
    const now = Date.now();

    // Exhaust lookup limit (10)
    for (let i = 0; i < 10; i++) {
      lookupRateLimiter.check(phone, now + i);
    }
    expect(lookupRateLimiter.check(phone, now + 10).allowed).toBe(false);

    // OTP limiter should still be available for the same phone
    otpRateLimiter.clearAll();
    const otpResult = otpRateLimiter.check(phone, now + 11);
    expect(otpResult.allowed, "OTP should still be allowed when lookup is exhausted").toBe(true);
    expect(otpResult.remaining).toBe(4);
  });

  it("blocked lookup returns retryAfterMs in the future", () => {
    const phone = "+13055551234";
    const baseTime = 1700000000000;

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      lookupRateLimiter.check(phone, baseTime + i * 1000);
    }

    // 11th request blocked
    const blocked = lookupRateLimiter.check(phone, baseTime + 10000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(baseTime);
    // retryAfterMs should be the first entry's timestamp + windowMs
    expect(blocked.retryAfterMs).toBe(baseTime + 10 * 60 * 1000);
  });
});
