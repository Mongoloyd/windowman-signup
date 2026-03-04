/**
 * pixels.ts — isFraud-aware conversion pixel wrappers
 *
 * All conversion pixel fires (Meta CAPI, Google Ads, GTM dataLayer) MUST go
 * through these wrappers so fraudulent leads (honeypot-flagged) never pollute
 * ad account data or inflate conversion metrics.
 *
 * Usage:
 *   import { fireMetaEvent, fireGtagEvent, fireDataLayerEvent } from "@/lib/pixels";
 *   fireMetaEvent("Lead", { email: "...", value: 0 }, { isFraud: lead.isFraud });
 *
 * The `isFraud` flag is returned by the server on verifyPhoneOTP success.
 * If isFraud is true, the call is silently dropped and logged to the console
 * in development so engineers can verify the guard is working.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

interface PixelGuard {
  /** If true, the pixel fire is silently suppressed */
  isFraud?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal guard
// ─────────────────────────────────────────────────────────────────────────────

function shouldSuppress(guard: PixelGuard, eventName: string, platform: string): boolean {
  if (guard.isFraud) {
    if (import.meta.env.DEV) {
      console.warn(
        `[pixels] 🚫 Suppressed ${platform} "${eventName}" — isFraud=true (honeypot lead)`
      );
    }
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta Pixel (fbq)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fire a Meta Pixel event.
 * Standard events: "Lead", "CompleteRegistration", "Schedule", "Contact"
 *
 * @example
 * fireMetaEvent("Lead", { em: hashedEmail, ph: hashedPhone }, { isFraud });
 */
export function fireMetaEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  guard: PixelGuard = {}
): void {
  if (shouldSuppress(guard, eventName, "Meta")) return;
  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, params);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Ads / GA4 (gtag)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fire a Google Ads conversion or GA4 event.
 *
 * @example
 * fireGtagEvent("event", "conversion", { send_to: "AW-XXXXX/YYYYY" }, { isFraud });
 */
export function fireGtagEvent(
  command: string,
  action: string,
  params: Record<string, unknown> = {},
  guard: PixelGuard = {}
): void {
  if (shouldSuppress(guard, action, "Google")) return;
  if (typeof window.gtag === "function") {
    window.gtag(command, action, params);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GTM dataLayer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Push an event to the GTM dataLayer.
 * All lead-related conversion events (wm_lead, wm_phone_verified, etc.)
 * must use this wrapper instead of direct dataLayer.push() calls.
 *
 * @example
 * fireDataLayerEvent({
 *   event: "wm_phone_verified",
 *   lead_id: leadId,
 *   em: hashedEmail,
 *   ph: hashedPhone,
 *   event_id: crypto.randomUUID(),
 * }, { isFraud });
 */
export function fireDataLayerEvent(
  payload: Record<string, unknown>,
  guard: PixelGuard = {}
): void {
  const eventName = String(payload.event ?? "unknown");
  if (shouldSuppress(guard, eventName, "GTM")) return;
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: fire all platforms at once (for high-value conversion events)
// ─────────────────────────────────────────────────────────────────────────────

interface ConversionPayload {
  /** SHA-256 hashed email (lowercase, trimmed before hashing) */
  em?: string;
  /** SHA-256 hashed phone (E.164 format before hashing) */
  ph?: string;
  /** Lead ID from the DB (for deduplication) */
  leadId?: string;
  /** Client-generated UUID for event deduplication */
  eventId?: string;
  /** Monetary value (USD) */
  value?: number;
  /** Currency code */
  currency?: string;
}

/**
 * Fire a verified phone conversion across all platforms simultaneously.
 * This is the highest-value event in the WindowMan funnel.
 *
 * @example
 * firePhoneVerifiedConversion({
 *   em: await sha256(email),
 *   ph: await sha256(e164Phone),
 *   leadId,
 *   eventId: crypto.randomUUID(),
 * }, { isFraud });
 */
export function firePhoneVerifiedConversion(
  payload: ConversionPayload,
  guard: PixelGuard = {}
): void {
  const eventId = payload.eventId ?? crypto.randomUUID();

  // Meta: CompleteRegistration (phone verified = highest-intent signal)
  fireMetaEvent(
    "CompleteRegistration",
    {
      em: payload.em,
      ph: payload.ph,
      value: payload.value ?? 0,
      currency: payload.currency ?? "USD",
      event_id: eventId,
    },
    guard
  );

  // Google Ads: conversion event
  fireGtagEvent(
    "event",
    "conversion",
    {
      send_to: "AW-PLACEHOLDER/PLACEHOLDER", // Replace with real conversion ID
      value: payload.value ?? 0,
      currency: payload.currency ?? "USD",
      transaction_id: eventId,
    },
    guard
  );

  // GTM dataLayer: wm_phone_verified (for server-side GTM + GA4)
  fireDataLayerEvent(
    {
      event: "wm_phone_verified",
      lead_id: payload.leadId,
      em: payload.em,
      ph: payload.ph,
      event_id: eventId,
      value: payload.value ?? 0,
      currency: payload.currency ?? "USD",
    },
    guard
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHA-256 helper (for hashing PII before sending to pixels)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash a PII string with SHA-256 (lowercase, trimmed).
 * Required by Meta CAPI and Google Enhanced Conversions.
 *
 * @example
 * const hashedEmail = await hashPii(email);
 */
export async function hashPii(value: string): Promise<string> {
  const normalized = value.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
