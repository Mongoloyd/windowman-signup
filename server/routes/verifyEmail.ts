/**
 * GET /verify-email
 *
 * Server-side magic link handler.
 * Must be an Express route (not tRPC) because it sets an HttpOnly cookie
 * and issues a redirect — two operations that require direct HTTP response control.
 *
 * Flow:
 *   1. Read ?token=<raw>&session=<tempSessionId> from query string
 *   2. Hash token → look up unconsumed, non-expired email_verifications row
 *   3. Consume the token (single-use)
 *   4. Upsert lead with email_verified=true
 *   5. Attach temp analysis to lead (if session provided)
 *   6. Create email-auth session → set wm_email_session cookie (HttpOnly, Secure)
 *   7. Log wm_email_verified event
 *   8. Redirect to /analysis/preview?id=<analysisId> (or /analysis/preview if no analysis)
 *
 * Error cases redirect to /?error=<code> so the frontend can show a toast.
 */

import type { Router, Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import { randomUUID } from "crypto";
import {
  getEmailVerificationByTokenHash,
  consumeEmailVerification,
  getLeadByEmail,
  createLead,
  setLeadEmailVerified,
  getAnalysisByTempSession,
  attachAnalysisToLead,
  createLeadSession,
  logLeadEvent,
} from "../db";
import { getSessionCookieOptions } from "../_core/cookies";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function registerVerifyEmailRoute(app: Router) {
  app.get("/verify-email", async (req: Request, res: Response) => {
    const { token, session: tempSessionId } = req.query as Record<string, string | undefined>;

    // ── 1. Validate token param ──────────────────────────────────────────────
    if (!token || typeof token !== "string" || token.trim().length < 32) {
      console.warn("[verify-email] Missing or malformed token");
      return res.redirect("/?error=invalid_link");
    }

    try {
      // ── 2. Look up verification row ────────────────────────────────────────
      const tokenHash = hashToken(token.trim());
      const verification = await getEmailVerificationByTokenHash(tokenHash);

      if (!verification) {
        console.warn("[verify-email] Token not found or already consumed");
        return res.redirect("/?error=link_used");
      }

      // ── 3. Check expiry ────────────────────────────────────────────────────
      if (new Date() > verification.expiresAt) {
        console.warn("[verify-email] Token expired");
        return res.redirect("/?error=link_expired");
      }

      // ── 4. Consume token (single-use) ──────────────────────────────────────
      await consumeEmailVerification(verification.id);

      // ── 5. Upsert lead with email_verified=true ────────────────────────────
      const email = verification.email;
      let lead = await getLeadByEmail(email);

      if (!lead) {
        // Edge case: lead was deleted between email send and click
        const leadId = randomUUID();
        await createLead({
          id: leadId,
          email,
          emailVerified: true,
          phoneVerified: false,
        });
        lead = await getLeadByEmail(email);
      } else {
        await setLeadEmailVerified(lead.id);
        // Re-fetch to get updated record
        lead = await getLeadByEmail(email);
      }

      if (!lead) {
        console.error("[verify-email] Failed to upsert lead for email:", email);
        return res.redirect("/?error=server_error");
      }

      const leadId = lead.id;

      // ── 6. Attach temp analysis to lead (cross-device or same-device) ──────
      let analysisId: string | null = null;

      if (tempSessionId && typeof tempSessionId === "string") {
        const analysis = await getAnalysisByTempSession(tempSessionId);
        if (analysis && !analysis.leadId) {
          await attachAnalysisToLead(analysis.id, leadId);
          analysisId = analysis.id;
        } else if (analysis) {
          // Already attached (same device re-click)
          analysisId = analysis.id;
        }
      }

      // ── 7. Create email-auth session cookie ────────────────────────────────
      const sessionToken = generateToken(32);
      const sessionTokenHash = hashToken(sessionToken);
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await createLeadSession({
        id: randomUUID(),
        leadId,
        sessionTokenHash,
        expiresAt: sessionExpiresAt,
        isRevoked: false,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie("wm_email_session", sessionToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
      });

      // ── 8. Log wm_email_verified event ─────────────────────────────────────
      await logLeadEvent({
        id: randomUUID(),
        leadId,
        analysisId: analysisId ?? undefined,
        eventName: "wm_email_verified",
        eventId: `${leadId}_wm_email_verified`,
        source: "server",
        payload: { email, analysisId },
      }).catch((err) => {
        console.warn("[verify-email] Failed to log event:", err);
      });

      // ── 9. Redirect to preview page ────────────────────────────────────────
      if (analysisId) {
        return res.redirect(`/analysis/preview?id=${analysisId}&lead=${leadId}`);
      } else {
        // No analysis (Flow B or cross-device with no upload) — go to account page
        return res.redirect(`/analysis/preview?lead=${leadId}&noanalysis=1`);
      }
    } catch (err) {
      console.error("[verify-email] Unexpected error:", err);
      return res.redirect("/?error=server_error");
    }
  });
}
