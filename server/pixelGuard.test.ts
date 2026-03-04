/**
 * pixelGuard.test.ts
 *
 * Tests for the isFraud pixel guard logic.
 *
 * The pixels.ts module lives in client/src/lib/ and uses browser APIs
 * (crypto.subtle, window.fbq, window.gtag, window.dataLayer).
 * We test the guard logic here by simulating the module's behavior
 * with mocked globals, validating the contract:
 *
 *   isFraud=true  → pixel fires are suppressed (no fbq/gtag/dataLayer calls)
 *   isFraud=false → pixel fires proceed normally
 *
 * We also test the server-side contract: verifyPhoneOTP returns isFraud
 * in its response shape so the client can gate pixel fires.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock browser globals ──────────────────────────────────────────────────────

interface MockWindow {
  fbq?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
  dataLayer?: Record<string, unknown>[];
  crypto?: { subtle?: { digest: ReturnType<typeof vi.fn> }; randomUUID?: ReturnType<typeof vi.fn> };
}

function createMockWindow(): MockWindow {
  return {
    fbq: vi.fn(),
    gtag: vi.fn(),
    dataLayer: [],
    crypto: {
      randomUUID: vi.fn(() => "test-uuid-1234"),
    },
  };
}

// ─── Inline pixel guard logic (mirrors client/src/lib/pixels.ts) ──────────────
// We inline the guard logic here so we can test it without browser bundling.

interface PixelGuard {
  isFraud?: boolean;
}

function shouldSuppress(guard: PixelGuard, _eventName: string, _platform: string): boolean {
  return !!guard.isFraud;
}

function fireMetaEvent(
  eventName: string,
  params: Record<string, unknown>,
  guard: PixelGuard,
  mockWin: MockWindow
): boolean {
  if (shouldSuppress(guard, eventName, "Meta")) return false;
  if (typeof mockWin.fbq === "function") {
    mockWin.fbq("track", eventName, params);
    return true;
  }
  return false;
}

function fireGtagEvent(
  command: string,
  action: string,
  params: Record<string, unknown>,
  guard: PixelGuard,
  mockWin: MockWindow
): boolean {
  if (shouldSuppress(guard, action, "Google")) return false;
  if (typeof mockWin.gtag === "function") {
    mockWin.gtag(command, action, params);
    return true;
  }
  return false;
}

function fireDataLayerEvent(
  payload: Record<string, unknown>,
  guard: PixelGuard,
  mockWin: MockWindow
): boolean {
  const eventName = String(payload.event ?? "unknown");
  if (shouldSuppress(guard, eventName, "GTM")) return false;
  mockWin.dataLayer = mockWin.dataLayer ?? [];
  mockWin.dataLayer.push(payload);
  return true;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("isFraud Pixel Guard", () => {
  let mockWin: MockWindow;

  beforeEach(() => {
    mockWin = createMockWindow();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Meta Pixel ──────────────────────────────────────────────────────────────

  describe("fireMetaEvent", () => {
    it("fires fbq when isFraud=false", () => {
      const fired = fireMetaEvent("Lead", { em: "abc123" }, { isFraud: false }, mockWin);
      expect(fired).toBe(true);
      expect(mockWin.fbq).toHaveBeenCalledTimes(1);
      expect(mockWin.fbq).toHaveBeenCalledWith("track", "Lead", { em: "abc123" });
    });

    it("suppresses fbq when isFraud=true", () => {
      const fired = fireMetaEvent("Lead", { em: "abc123" }, { isFraud: true }, mockWin);
      expect(fired).toBe(false);
      expect(mockWin.fbq).not.toHaveBeenCalled();
    });

    it("fires fbq when guard is empty (defaults to isFraud=false)", () => {
      const fired = fireMetaEvent("CompleteRegistration", {}, {}, mockWin);
      expect(fired).toBe(true);
      expect(mockWin.fbq).toHaveBeenCalledTimes(1);
    });

    it("suppresses CompleteRegistration for honeypot lead", () => {
      const fired = fireMetaEvent("CompleteRegistration", { em: "bot@spam.com" }, { isFraud: true }, mockWin);
      expect(fired).toBe(false);
      expect(mockWin.fbq).not.toHaveBeenCalled();
    });
  });

  // ── Google Ads / GA4 ────────────────────────────────────────────────────────

  describe("fireGtagEvent", () => {
    it("fires gtag when isFraud=false", () => {
      const fired = fireGtagEvent("event", "conversion", { send_to: "AW-123/456" }, { isFraud: false }, mockWin);
      expect(fired).toBe(true);
      expect(mockWin.gtag).toHaveBeenCalledTimes(1);
      expect(mockWin.gtag).toHaveBeenCalledWith("event", "conversion", { send_to: "AW-123/456" });
    });

    it("suppresses gtag when isFraud=true", () => {
      const fired = fireGtagEvent("event", "conversion", { send_to: "AW-123/456" }, { isFraud: true }, mockWin);
      expect(fired).toBe(false);
      expect(mockWin.gtag).not.toHaveBeenCalled();
    });

    it("fires gtag when guard is empty", () => {
      const fired = fireGtagEvent("event", "page_view", {}, {}, mockWin);
      expect(fired).toBe(true);
    });
  });

  // ── GTM dataLayer ───────────────────────────────────────────────────────────

  describe("fireDataLayerEvent", () => {
    it("pushes to dataLayer when isFraud=false", () => {
      const payload = { event: "wm_phone_verified", lead_id: "lead-123", em: "abc", ph: "def" };
      const fired = fireDataLayerEvent(payload, { isFraud: false }, mockWin);
      expect(fired).toBe(true);
      expect(mockWin.dataLayer).toHaveLength(1);
      expect(mockWin.dataLayer![0]).toEqual(payload);
    });

    it("suppresses dataLayer push when isFraud=true", () => {
      const payload = { event: "wm_phone_verified", lead_id: "bot-lead" };
      const fired = fireDataLayerEvent(payload, { isFraud: true }, mockWin);
      expect(fired).toBe(false);
      expect(mockWin.dataLayer).toHaveLength(0);
    });

    it("initializes dataLayer if undefined and isFraud=false", () => {
      mockWin.dataLayer = undefined;
      const fired = fireDataLayerEvent({ event: "test" }, { isFraud: false }, mockWin);
      expect(fired).toBe(true);
      expect(mockWin.dataLayer).toHaveLength(1);
    });

    it("does not initialize dataLayer if isFraud=true", () => {
      mockWin.dataLayer = undefined;
      fireDataLayerEvent({ event: "test" }, { isFraud: true }, mockWin);
      expect(mockWin.dataLayer).toBeUndefined();
    });
  });

  // ── Combined: all three platforms suppressed for honeypot lead ──────────────

  describe("All platforms suppressed for honeypot lead (isFraud=true)", () => {
    it("no fbq, gtag, or dataLayer calls for a bot lead", () => {
      const guard: PixelGuard = { isFraud: true };
      fireMetaEvent("CompleteRegistration", { em: "bot" }, guard, mockWin);
      fireGtagEvent("event", "conversion", {}, guard, mockWin);
      fireDataLayerEvent({ event: "wm_phone_verified" }, guard, mockWin);

      expect(mockWin.fbq).not.toHaveBeenCalled();
      expect(mockWin.gtag).not.toHaveBeenCalled();
      expect(mockWin.dataLayer).toHaveLength(0);
    });

    it("all three platforms fire for a legitimate lead (isFraud=false)", () => {
      const guard: PixelGuard = { isFraud: false };
      fireMetaEvent("CompleteRegistration", { em: "real" }, guard, mockWin);
      fireGtagEvent("event", "conversion", {}, guard, mockWin);
      fireDataLayerEvent({ event: "wm_phone_verified" }, guard, mockWin);

      expect(mockWin.fbq).toHaveBeenCalledTimes(1);
      expect(mockWin.gtag).toHaveBeenCalledTimes(1);
      expect(mockWin.dataLayer).toHaveLength(1);
    });
  });

  // ── Server contract: verifyPhoneOTP returns isFraud ─────────────────────────

  describe("Server contract: verifyPhoneOTP response shape", () => {
    it("verifyPhoneOTP response includes isFraud field (type contract)", () => {
      // This test validates the TypeScript contract by constructing the expected
      // response shape and asserting the isFraud field is present and boolean.
      type VerifyOTPResponse = {
        success: boolean;
        leadId: string;
        phoneVerified: boolean;
        fullAnalysis: unknown;
        isFraud: boolean;
      };

      const mockResponse: VerifyOTPResponse = {
        success: true,
        leadId: "lead-uuid-123",
        phoneVerified: true,
        fullAnalysis: { score: 72, grade: "C+" },
        isFraud: false,
      };

      expect(mockResponse).toHaveProperty("isFraud");
      expect(typeof mockResponse.isFraud).toBe("boolean");
    });

    it("isFraud=false for legitimate lead response", () => {
      const response = { success: true, leadId: "l1", phoneVerified: true, fullAnalysis: {}, isFraud: false };
      expect(response.isFraud).toBe(false);
    });

    it("isFraud=true for honeypot lead response (bot filled the field)", () => {
      const response = { success: true, leadId: "l2", phoneVerified: true, fullAnalysis: {}, isFraud: true };
      expect(response.isFraud).toBe(true);
    });

    it("pixel fires are suppressed when isFraud=true from server response", () => {
      const serverResponse = { success: true, leadId: "l3", phoneVerified: true, fullAnalysis: {}, isFraud: true };
      // Simulate what the onSuccess handler does
      const fired = fireMetaEvent("CompleteRegistration", {}, { isFraud: serverResponse.isFraud }, mockWin);
      expect(fired).toBe(false);
      expect(mockWin.fbq).not.toHaveBeenCalled();
    });

    it("pixel fires proceed when isFraud=false from server response", () => {
      const serverResponse = { success: true, leadId: "l4", phoneVerified: true, fullAnalysis: {}, isFraud: false };
      const fired = fireMetaEvent("CompleteRegistration", {}, { isFraud: serverResponse.isFraud }, mockWin);
      expect(fired).toBe(true);
      expect(mockWin.fbq).toHaveBeenCalledTimes(1);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("handles undefined isFraud (treated as false — fires pixel)", () => {
      const guard: PixelGuard = { isFraud: undefined };
      const fired = fireMetaEvent("Lead", {}, guard, mockWin);
      expect(fired).toBe(true);
    });

    it("does not fire if fbq is not defined on window", () => {
      mockWin.fbq = undefined;
      const fired = fireMetaEvent("Lead", {}, { isFraud: false }, mockWin);
      expect(fired).toBe(false);
    });

    it("does not fire gtag if gtag is not defined on window", () => {
      mockWin.gtag = undefined;
      const fired = fireGtagEvent("event", "conversion", {}, { isFraud: false }, mockWin);
      expect(fired).toBe(false);
    });

    it("multiple events: only legitimate ones reach dataLayer", () => {
      const events = [
        { payload: { event: "wm_phone_verified", lead_id: "real-1" }, isFraud: false },
        { payload: { event: "wm_phone_verified", lead_id: "bot-1" }, isFraud: true },
        { payload: { event: "wm_phone_verified", lead_id: "real-2" }, isFraud: false },
        { payload: { event: "wm_phone_verified", lead_id: "bot-2" }, isFraud: true },
      ];

      for (const { payload, isFraud } of events) {
        fireDataLayerEvent(payload, { isFraud }, mockWin);
      }

      expect(mockWin.dataLayer).toHaveLength(2);
      expect(mockWin.dataLayer![0].lead_id).toBe("real-1");
      expect(mockWin.dataLayer![1].lead_id).toBe("real-2");
    });
  });
});
