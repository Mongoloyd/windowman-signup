/**
 * Tests for resolveActiveLeadIdFromCookies
 *
 * These tests mock getLeadSessionByTokenHash to avoid DB dependency.
 * They cover:
 * - No cookies → null
 * - wm_lead_session valid → leadId returned
 * - wm_lead_session expired → null (no fallthrough)
 * - wm_lead_session revoked → null (no fallthrough)
 * - wm_lead_session token not in DB → null (no fallthrough)
 * - wm_email_session valid (no lead session) → leadId returned
 * - wm_email_session expired → null
 * - Both cookies present: lead session wins
 * - Both cookies present: lead session expired → null (no fallthrough to email)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB module before importing the helper ────────────────────────────────
vi.mock("../db", () => ({
  getLeadSessionByTokenHash: vi.fn(),
}));

import { resolveActiveLeadIdFromCookies } from "./sessionHelpers";
import { getLeadSessionByTokenHash } from "../db";

const mockGetSession = vi.mocked(getLeadSessionByTokenHash);

// Helper: build a mock session object
function makeSession(overrides: {
  leadId?: string;
  isRevoked?: boolean;
  expiresAt?: Date;
  id?: string;
}) {
  return {
    id: overrides.id ?? "sess-001",
    leadId: overrides.leadId ?? "lead-uuid-001",
    sessionTokenHash: "irrelevant",
    isRevoked: overrides.isRevoked ?? false,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000), // 1 min future
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };
}

describe("resolveActiveLeadIdFromCookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No cookies ────────────────────────────────────────────────────────────

  it("returns null when no cookies are present", async () => {
    const result = await resolveActiveLeadIdFromCookies({});
    expect(result).toBeNull();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("returns null when cookies object is empty strings", async () => {
    const result = await resolveActiveLeadIdFromCookies({
      wm_lead_session: undefined,
      wm_email_session: undefined,
    });
    expect(result).toBeNull();
  });

  // ── wm_lead_session: valid ────────────────────────────────────────────────

  it("returns leadId when wm_lead_session is valid and not expired", async () => {
    const session = makeSession({ leadId: "lead-abc-123" });
    mockGetSession.mockResolvedValueOnce(session);

    const result = await resolveActiveLeadIdFromCookies({
      wm_lead_session: "raw-token-value",
    });

    expect(result).toBe("lead-abc-123");
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── wm_lead_session: expired → no fallthrough ─────────────────────────────

  it("returns null when wm_lead_session is expired — does NOT fall through to email session", async () => {
    const expiredSession = makeSession({
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past
    });
    mockGetSession.mockResolvedValueOnce(expiredSession);

    const result = await resolveActiveLeadIdFromCookies({
      wm_lead_session: "expired-token",
      wm_email_session: "valid-email-token", // should NOT be tried
    });

    expect(result).toBeNull();
    // Only called once — no fallthrough to email session
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── wm_lead_session: revoked → no fallthrough ─────────────────────────────

  it("returns null when wm_lead_session is revoked — does NOT fall through to email session", async () => {
    const revokedSession = makeSession({ isRevoked: true });
    mockGetSession.mockResolvedValueOnce(revokedSession);

    const result = await resolveActiveLeadIdFromCookies({
      wm_lead_session: "revoked-token",
      wm_email_session: "valid-email-token",
    });

    expect(result).toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── wm_lead_session: token not in DB → no fallthrough ────────────────────

  it("returns null when wm_lead_session token has no matching DB session — does NOT fall through", async () => {
    mockGetSession.mockResolvedValueOnce(undefined);

    const result = await resolveActiveLeadIdFromCookies({
      wm_lead_session: "stale-token-from-old-deployment",
      wm_email_session: "valid-email-token",
    });

    expect(result).toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── wm_email_session: valid (no lead session cookie) ─────────────────────

  it("returns leadId from wm_email_session when no wm_lead_session cookie is present", async () => {
    const session = makeSession({ leadId: "lead-email-456" });
    mockGetSession.mockResolvedValueOnce(session);

    const result = await resolveActiveLeadIdFromCookies({
      wm_email_session: "email-token-value",
    });

    expect(result).toBe("lead-email-456");
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── wm_email_session: expired ─────────────────────────────────────────────

  it("returns null when wm_email_session is expired", async () => {
    const expiredSession = makeSession({
      expiresAt: new Date(Date.now() - 5000),
    });
    mockGetSession.mockResolvedValueOnce(expiredSession);

    const result = await resolveActiveLeadIdFromCookies({
      wm_email_session: "expired-email-token",
    });

    expect(result).toBeNull();
  });

  // ── wm_email_session: revoked ─────────────────────────────────────────────

  it("returns null when wm_email_session is revoked", async () => {
    const revokedSession = makeSession({ isRevoked: true });
    mockGetSession.mockResolvedValueOnce(revokedSession);

    const result = await resolveActiveLeadIdFromCookies({
      wm_email_session: "revoked-email-token",
    });

    expect(result).toBeNull();
  });

  // ── Both cookies: lead session wins ──────────────────────────────────────

  it("uses wm_lead_session when both cookies are present and lead session is valid", async () => {
    const leadSession = makeSession({ leadId: "lead-from-phone-session" });
    mockGetSession.mockResolvedValueOnce(leadSession);

    const result = await resolveActiveLeadIdFromCookies({
      wm_lead_session: "phone-token",
      wm_email_session: "email-token",
    });

    expect(result).toBe("lead-from-phone-session");
    // Only called once — email session never queried
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── DB error handling ─────────────────────────────────────────────────────

  it("propagates DB errors (does not swallow them)", async () => {
    mockGetSession.mockRejectedValueOnce(new Error("DB connection failed"));

    await expect(
      resolveActiveLeadIdFromCookies({ wm_lead_session: "any-token" })
    ).rejects.toThrow("DB connection failed");
  });
});
