/**
 * sessionHelpers.ts
 *
 * Server-side session resolution helpers.
 * Single source of truth for cookie → leadId resolution.
 *
 * Cookie priority:
 *   1. wm_lead_session  (30-day phone-verified session — highest trust)
 *   2. wm_email_session (24-hour email-verified session — lower trust)
 *
 * Both cookie names map to the same lead_sessions table.
 * The only difference is TTL and the trust level they imply.
 *
 * This helper is intentionally pure: it reads cookies, hashes the token,
 * queries the DB, and returns a leadId or null. No side effects.
 *
 * Usage in tRPC procedures:
 *   const leadId = await resolveActiveLeadIdFromCookies(ctx.req.cookies);
 *   if (!leadId) throw new TRPCError({ code: "UNAUTHORIZED", ... });
 */

import { createHash } from "crypto";
import { getLeadSessionByTokenHash } from "../db";

/**
 * Hash a raw session token the same way it was stored at creation time.
 * Must match the hashToken() function in analysis.ts.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Resolve the active leadId from request cookies.
 *
 * Prefers wm_lead_session (phone-verified, 30-day).
 * Falls back to wm_email_session (email-verified, 24-hour).
 *
 * Returns null if:
 * - Neither cookie is present
 * - The token hash doesn't match any active session
 * - The session is expired or revoked
 *
 * @param cookies - req.cookies object from Express (already parsed by cookie-parser)
 * @returns leadId string (UUID) or null
 */
export async function resolveActiveLeadIdFromCookies(
  cookies: Record<string, string | undefined>
): Promise<string | null> {
  // Try wm_lead_session first (higher trust — phone-verified)
  const leadSessionToken = cookies["wm_lead_session"];
  if (leadSessionToken) {
    const tokenHash = hashToken(leadSessionToken);
    const session = await getLeadSessionByTokenHash(tokenHash);
    if (session && !session.isRevoked && session.expiresAt > new Date()) {
      return session.leadId;
    }
    // Token present but invalid/expired — do NOT fall through to email session.
    // This prevents a downgrade attack where an attacker with an expired phone
    // session could fall through to a still-valid email session.
    if (session && (session.isRevoked || session.expiresAt <= new Date())) {
      console.warn(
        `[sessionHelpers] wm_lead_session present but expired/revoked for session ${session.id}`
      );
      return null;
    }
    // Token present but no matching session in DB — may be stale cookie from old deployment
    console.warn("[sessionHelpers] wm_lead_session token present but no matching DB session found");
    return null;
  }

  // Fall back to wm_email_session (lower trust — email-verified only)
  const emailSessionToken = cookies["wm_email_session"];
  if (emailSessionToken) {
    const tokenHash = hashToken(emailSessionToken);
    const session = await getLeadSessionByTokenHash(tokenHash);
    if (session && !session.isRevoked && session.expiresAt > new Date()) {
      return session.leadId;
    }
    if (session && (session.isRevoked || session.expiresAt <= new Date())) {
      console.warn(
        `[sessionHelpers] wm_email_session present but expired/revoked for session ${session.id}`
      );
      return null;
    }
    console.warn("[sessionHelpers] wm_email_session token present but no matching DB session found");
    return null;
  }

  // No session cookies present
  return null;
}

/**
 * Resolve leadId from cookies and throw UNAUTHORIZED if not found.
 * Convenience wrapper for tRPC procedures that require authentication.
 *
 * @param cookies - req.cookies object from Express
 * @param context - optional context string for error messages (e.g., "listMyAnalyses")
 * @returns leadId string (UUID) — never null
 * @throws TRPCError with code UNAUTHORIZED
 */
export async function requireLeadIdFromCookies(
  cookies: Record<string, string | undefined>,
  context = "this action"
): Promise<string> {
  const leadId = await resolveActiveLeadIdFromCookies(cookies);
  if (!leadId) {
    // Import TRPCError lazily to avoid circular deps
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: `Session expired or not found. Please re-verify your email to continue.`,
    });
  }
  return leadId;
}
