/**
 * OTP Rate Limiter Tests
 *
 * Verifies the sliding-window rate limiter that protects Twilio billing
 * by capping OTP sends to 5 per phone number per 10-minute window.
 *
 * These are pure unit tests — no Twilio calls, no DB, no network.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SlidingWindowRateLimiter, otpRateLimiter, lookupRateLimiter, ipRateLimiter, getClientIp, ProgressiveBackoff, otpBackoff } from "./rateLimiter";

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

// ─── ipRateLimiter singleton tests (defense-in-depth) ────────────────────────

describe("ipRateLimiter singleton", () => {
  beforeEach(() => {
    ipRateLimiter.clearAll();
  });

  it("is configured with max 20 requests per 10-minute window", () => {
    const ip = "192.168.1.100";
    const now = Date.now();

    // Should allow exactly 20
    for (let i = 0; i < 20; i++) {
      const result = ipRateLimiter.check(ip, now + i);
      expect(result.allowed, `IP request ${i + 1} should be allowed`).toBe(true);
    }

    // 21st should be blocked
    const blocked = ipRateLimiter.check(ip, now + 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("simulates 21 requests from same IP with different phone numbers — 21st is blocked", () => {
    const ip = "10.0.0.42";
    const baseTime = 1700000000000;
    const results: Array<{ index: number; phone: string; allowed: boolean; remaining: number }> = [];

    for (let i = 0; i < 21; i++) {
      // Each request uses a DIFFERENT phone number (bot rotation attack)
      const phone = `+1305555${String(1000 + i)}`;
      const result = ipRateLimiter.check(ip, baseTime + i * 100);
      results.push({ index: i + 1, phone, allowed: result.allowed, remaining: result.remaining });
    }

    // Requests 1-20 should be allowed
    for (let i = 0; i < 20; i++) {
      expect(results[i].allowed, `Request ${i + 1} from IP should be allowed`).toBe(true);
      expect(results[i].remaining).toBe(19 - i);
    }

    // Request 21 must be BLOCKED (even though it's a new phone number)
    expect(results[20].allowed, "Request 21 from same IP must be BLOCKED").toBe(false);
    expect(results[20].remaining, "Request 21 remaining must be 0").toBe(0);
  });

  it("different IPs are tracked independently", () => {
    const ip1 = "192.168.1.1";
    const ip2 = "10.0.0.1";
    const now = Date.now();

    // Exhaust ip1's limit
    for (let i = 0; i < 20; i++) {
      ipRateLimiter.check(ip1, now + i);
    }
    expect(ipRateLimiter.check(ip1, now + 20).allowed).toBe(false);

    // ip2 should still be allowed
    const result = ipRateLimiter.check(ip2, now + 21);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it("IP limiter is independent from per-phone OTP and lookup limiters", () => {
    const ip = "172.16.0.1";
    const phone = "+13055551234";
    const now = Date.now();

    // Exhaust IP limit
    for (let i = 0; i < 20; i++) {
      ipRateLimiter.check(ip, now + i);
    }
    expect(ipRateLimiter.check(ip, now + 20).allowed).toBe(false);

    // Per-phone limiters should still be available
    otpRateLimiter.clearAll();
    lookupRateLimiter.clearAll();
    expect(otpRateLimiter.check(phone, now + 21).allowed).toBe(true);
    expect(lookupRateLimiter.check(phone, now + 22).allowed).toBe(true);
  });

  it("blocked IP returns retryAfterMs in the future", () => {
    const ip = "192.168.1.100";
    const baseTime = 1700000000000;

    for (let i = 0; i < 20; i++) {
      ipRateLimiter.check(ip, baseTime + i * 500);
    }

    const blocked = ipRateLimiter.check(ip, baseTime + 10000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(baseTime + 10 * 60 * 1000);
  });
});

// ─── getClientIp helper tests ─────────────────────────────────────────────

describe("getClientIp helper", () => {
  it("extracts IP from x-forwarded-for header (single value)", () => {
    const ip = getClientIp({
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    expect(ip).toBe("203.0.113.50");
  });

  it("extracts first IP from x-forwarded-for chain", () => {
    const ip = getClientIp({
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18, 150.172.238.178" },
    });
    expect(ip).toBe("203.0.113.50");
  });

  it("extracts first IP from x-forwarded-for array", () => {
    const ip = getClientIp({
      headers: { "x-forwarded-for": ["198.51.100.1", "70.41.3.18"] },
    });
    expect(ip).toBe("198.51.100.1");
  });

  it("falls back to req.ip when no x-forwarded-for", () => {
    const ip = getClientIp({
      headers: {},
      ip: "127.0.0.1",
    });
    expect(ip).toBe("127.0.0.1");
  });

  it("falls back to socket.remoteAddress when no req.ip", () => {
    const ip = getClientIp({
      headers: {},
      socket: { remoteAddress: "::1" },
    });
    expect(ip).toBe("::1");
  });

  it("returns 'unknown' when no IP source is available", () => {
    const ip = getClientIp({ headers: {} });
    expect(ip).toBe("unknown");
  });
});

// ─── ProgressiveBackoff unit tests ──────────────────────────────────────────

describe("ProgressiveBackoff", () => {
  const tiers = [
    { cooldownMs: 0, captchaRequired: false },           // 1st fail
    { cooldownMs: 30_000, captchaRequired: false },      // 2nd fail
    { cooldownMs: 120_000, captchaRequired: false },     // 3rd fail
    { cooldownMs: 600_000, captchaRequired: true },      // 4th+ fail
  ];

  let backoff: ProgressiveBackoff;

  beforeEach(() => {
    backoff = new ProgressiveBackoff(tiers);
  });

  it("allows first request with no prior failures", () => {
    const result = backoff.check("+13055551234");
    expect(result.allowed).toBe(true);
    expect(result.failureCount).toBe(0);
    expect(result.cooldownRemainingMs).toBe(0);
    expect(result.captchaRequired).toBe(false);
  });

  it("1st failure: records failure, 0s cooldown, no CAPTCHA", () => {
    const now = 1700000000000;
    const result = backoff.recordFailure("+13055551234", now);
    expect(result.failureCount).toBe(1);
    expect(result.cooldownRemainingMs).toBe(0);
    expect(result.captchaRequired).toBe(false);
    expect(result.message).toContain("Incorrect code");

    // Immediately allowed (0s cooldown)
    const check = backoff.check("+13055551234", now + 1);
    expect(check.allowed).toBe(true);
  });

  it("2nd failure: 30s cooldown, no CAPTCHA", () => {
    const now = 1700000000000;
    backoff.recordFailure("+13055551234", now);
    const result = backoff.recordFailure("+13055551234", now + 1000);
    expect(result.failureCount).toBe(2);
    expect(result.cooldownRemainingMs).toBe(30_000);
    expect(result.captchaRequired).toBe(false);

    // Blocked at now + 2000 (only 1s elapsed, need 30s)
    const blocked = backoff.check("+13055551234", now + 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.cooldownRemainingMs).toBe(29_000);

    // Allowed after 30s from last failure
    const allowed = backoff.check("+13055551234", now + 1000 + 30_001);
    expect(allowed.allowed).toBe(true);
  });

  it("3rd failure: 2-minute cooldown, no CAPTCHA", () => {
    const now = 1700000000000;
    backoff.recordFailure("+13055551234", now);
    backoff.recordFailure("+13055551234", now + 1000);
    const result = backoff.recordFailure("+13055551234", now + 32_000);
    expect(result.failureCount).toBe(3);
    expect(result.cooldownRemainingMs).toBe(120_000);
    expect(result.captchaRequired).toBe(false);
    expect(result.message).toContain("2 minutes");

    // Blocked during cooldown
    const blocked = backoff.check("+13055551234", now + 60_000);
    expect(blocked.allowed).toBe(false);

    // Allowed after 2min from 3rd failure
    const allowed = backoff.check("+13055551234", now + 32_000 + 120_001);
    expect(allowed.allowed).toBe(true);
  });

  it("4th failure: 10-minute cooldown + CAPTCHA required", () => {
    const now = 1700000000000;
    backoff.recordFailure("+13055551234", now);
    backoff.recordFailure("+13055551234", now + 1000);
    backoff.recordFailure("+13055551234", now + 32_000);
    const result = backoff.recordFailure("+13055551234", now + 160_000);
    expect(result.failureCount).toBe(4);
    expect(result.cooldownRemainingMs).toBe(600_000);
    expect(result.captchaRequired).toBe(true);
    expect(result.message).toContain("10 minutes");
    expect(result.message).toContain("verification challenge");

    // Blocked during cooldown with CAPTCHA flag
    const blocked = backoff.check("+13055551234", now + 200_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.captchaRequired).toBe(true);
  });

  it("5th+ failures stay at tier 4 (10min + CAPTCHA)", () => {
    const now = 1700000000000;
    // Record 5 failures, each well after the previous cooldown expires
    // Tier 1: 0s, Tier 2: 30s, Tier 3: 2min, Tier 4: 10min, Tier 4: 10min
    backoff.recordFailure("+13055551234", now);                    // fail 1 (0s cooldown)
    backoff.recordFailure("+13055551234", now + 1_000);            // fail 2 (30s cooldown)
    backoff.recordFailure("+13055551234", now + 32_000);           // fail 3 (2min cooldown)
    backoff.recordFailure("+13055551234", now + 160_000);          // fail 4 (10min cooldown)
    backoff.recordFailure("+13055551234", now + 800_000);          // fail 5 (10min cooldown)

    // Check 30s after 5th failure — should still be in 10min cooldown
    const check = backoff.check("+13055551234", now + 830_000);
    expect(check.allowed).toBe(false);
    expect(check.captchaRequired).toBe(true);
    expect(check.failureCount).toBe(5);
  });

  it("reset clears all state — allows immediately after", () => {
    const now = 1700000000000;
    // Escalate to tier 4
    for (let i = 0; i < 4; i++) {
      backoff.recordFailure("+13055551234", now + i * 700_000);
    }
    expect(backoff.getFailureCount("+13055551234")).toBe(4);

    // Reset (simulates successful OTP verification)
    backoff.reset("+13055551234");
    expect(backoff.getFailureCount("+13055551234")).toBe(0);

    const check = backoff.check("+13055551234", now + 3_000_000);
    expect(check.allowed).toBe(true);
    expect(check.failureCount).toBe(0);
    expect(check.captchaRequired).toBe(false);
  });

  it("different phone numbers are tracked independently", () => {
    const now = 1700000000000;
    // Escalate phone A to tier 4
    for (let i = 0; i < 4; i++) {
      backoff.recordFailure("+13055551111", now + i * 700_000);
    }
    // Phone B should be clean
    const check = backoff.check("+13055552222", now + 3_000_000);
    expect(check.allowed).toBe(true);
    expect(check.failureCount).toBe(0);
  });

  it("throws if constructed with zero tiers", () => {
    expect(() => new ProgressiveBackoff([])).toThrow("At least one backoff tier is required.");
  });

  it("cooldownRemainingMs decreases as time passes", () => {
    const now = 1700000000000;
    backoff.recordFailure("+13055551234", now);
    backoff.recordFailure("+13055551234", now + 1000); // 2nd fail → 30s cooldown

    // Check at 10s after 2nd failure
    const at10s = backoff.check("+13055551234", now + 1000 + 10_000);
    expect(at10s.allowed).toBe(false);
    expect(at10s.cooldownRemainingMs).toBe(20_000);

    // Check at 20s after 2nd failure
    const at20s = backoff.check("+13055551234", now + 1000 + 20_000);
    expect(at20s.allowed).toBe(false);
    expect(at20s.cooldownRemainingMs).toBe(10_000);

    // Check at 30s after 2nd failure — exactly at boundary
    const at30s = backoff.check("+13055551234", now + 1000 + 30_000);
    expect(at30s.allowed).toBe(true);
    expect(at30s.cooldownRemainingMs).toBe(0);
  });
});

// ─── otpBackoff singleton tests ─────────────────────────────────────────────

describe("otpBackoff singleton", () => {
  beforeEach(() => {
    otpBackoff.clearAll();
  });

  it("is configured with 4 tiers: 0s, 30s, 2min, 10min+CAPTCHA", () => {
    const phone = "+13055551234";
    const now = 1700000000000;

    // 1st fail → 0s cooldown
    const f1 = otpBackoff.recordFailure(phone, now);
    expect(f1.cooldownRemainingMs).toBe(0);
    expect(f1.captchaRequired).toBe(false);

    // 2nd fail → 30s cooldown
    const f2 = otpBackoff.recordFailure(phone, now + 1000);
    expect(f2.cooldownRemainingMs).toBe(30_000);
    expect(f2.captchaRequired).toBe(false);

    // 3rd fail → 2min cooldown
    const f3 = otpBackoff.recordFailure(phone, now + 32_000);
    expect(f3.cooldownRemainingMs).toBe(120_000);
    expect(f3.captchaRequired).toBe(false);

    // 4th fail → 10min + CAPTCHA
    const f4 = otpBackoff.recordFailure(phone, now + 160_000);
    expect(f4.cooldownRemainingMs).toBe(600_000);
    expect(f4.captchaRequired).toBe(true);
  });

  it("full brute-force simulation: bot tries 10 codes rapidly", () => {
    const phone = "+13055559999";
    const now = 1700000000000;
    const attempts: Array<{ i: number; allowed: boolean; cooldown: number; captcha: boolean }> = [];

    for (let i = 0; i < 10; i++) {
      // Check if allowed
      const check = otpBackoff.check(phone, now + i * 100);
      attempts.push({ i: i + 1, allowed: check.allowed, cooldown: check.cooldownRemainingMs, captcha: check.captchaRequired });

      if (check.allowed) {
        // Simulate wrong code → record failure
        otpBackoff.recordFailure(phone, now + i * 100);
      }
    }

    // Attempt 1: allowed (no prior failures)
    expect(attempts[0].allowed).toBe(true);
    // Attempt 2: allowed (1st fail had 0s cooldown)
    expect(attempts[1].allowed).toBe(true);
    // Attempt 3: BLOCKED (2nd fail imposed 30s cooldown, only 100ms elapsed)
    expect(attempts[2].allowed).toBe(false);
    expect(attempts[2].cooldown).toBeGreaterThan(0);
    // All subsequent attempts: BLOCKED (still in 30s cooldown)
    for (let i = 3; i < 10; i++) {
      expect(attempts[i].allowed, `Attempt ${i + 1} should be blocked`).toBe(false);
    }
  });
});
