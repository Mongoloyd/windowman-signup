# WindowMan /signup TODO

## Completed
- [x] Basic homepage layout with dark Forensic Fortress theme
- [x] Hero section with urgency pill and count-up animation
- [x] Problem agitation section (87% stat, $8K-$15K overcharge)
- [x] How It Works 4-step timeline
- [x] Testimonials section
- [x] Trust badges section
- [x] Split Upload Zone (Flow A / Flow B)
- [x] AI Scanning animation with 5 pillar checklist
- [x] Analysis Reveal scorecard dashboard (Grade B, 87/100)
- [x] Lead Qualification card (Flow B)
- [x] Footer
- [x] Upgrade to full-stack (web-db-user)

## Twilio SMS Integration
- [x] Store Twilio credentials securely (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- [x] Install Twilio SDK on server
- [x] Create tRPC backend routes for Twilio SMS and call functionality
- [x] Wire up frontend CTA buttons to Twilio backend
- [x] Add lead capture form with phone number input
- [x] Write Vitest tests for Twilio routes

## Twilio Verify OTP Flow
- [x] Store TWILIO_VERIFY_SERVICE_SID securely
- [x] Add leads table to DB schema (status: unverified/verified, name, phone, answers)
- [x] Add Lookup v2 backend route (block VOIP/landline)
- [x] Add sendOTP backend route (trigger Verify)
- [x] Add verifyOTP backend route (check code, flip status, fire team SMS)
- [x] Build frontend OTP flow: phone input → Lookup check → OTP input → success
- [x] 6-digit OTP input with auto-advance, Resend, and Edit Number escape hatch
- [x] Write Vitest tests for OTP routes

## Phase 1+2 — Verified Upload Funnel v2 Infrastructure
- [x] Store RESEND_API_KEY securely
- [x] Install resend npm package
- [x] Rename leads → leads_v1, create new leads table (uuid pk, email_verified, phone_verified)
- [x] Create analyses table (uuid pk, temp/persisted/full_unlocked status, full_json, preview fields)
- [x] Create email_verifications table (uuid pk, token_hash, temp_attach_token, expires_at)
- [x] Create lead_sessions table (uuid pk, session_token_hash, expires_at, is_revoked)
- [x] Create lead_events table (uuid pk, event_name, event_id unique, source, payload)
- [x] Create lead_calls table (phonecall.bot webhook foundation)
- [x] Build server/email.ts Resend magic link helper module
- [x] Build analysis.upload tRPC procedure (S3 temp/, MIME validation, 10MB limit, stub AI)
- [x] Build analysis.requestEmailVerification procedure (create email_verifications row, send magic link)
- [x] Build analysis.verifyEmail procedure (consume token, upsert lead, attach analysis, promote to vault/, preview fields, email-auth cookie)
- [x] Build analysis.getPreview procedure (email-auth required, preview fields only — no dollar amounts)
- [x] Build analysis.lookupPhone procedure (Twilio Lookup v2, block VOIP/landline)
- [x] Build analysis.sendPhoneOTP procedure (Twilio Verify trigger, rate limit 5/10min)
- [x] Build analysis.verifyPhoneOTP procedure (verify code, phone_verified=true, full_unlocked, fire team SMS)
- [x] Build analysis.submitNoQuoteLead procedure (Flow B qualification form)
- [x] Build 6-hour purge cron job (delete temp analyses + S3 files + expired email_verifications)
- [x] Build frontend 8-state machine (idle→uploading→analyzing→email_gate→email_sent→partial_preview→otp_gate→full_analysis|purged)
- [x] Build upload UI with file drop zone (PDF/PNG/JPG/WebP, 10MB limit)
- [x] Build scanning animation UI (5 pillars with checking statuses)
- [x] Build email gate overlay (blurred teaser + email capture form)
- [x] Build email_sent confirmation screen
- [x] Build partial_preview UI (score, grade, pillar statuses, generic findings, phone gate overlay)
- [x] Build OTP gate UI (6-digit input, Resend cooldown, Edit Number escape hatch)
- [x] Build full_analysis UI (full scorecard dashboard with overcharge range + recommendations)
- [x] Build purged state UI ("Upload expired — please re-upload")
- [x] Write 32 Vitest tests (3 test files — all passing)

## Next Steps (Phase 3)
- [ ] Add /verify-email route to handle magic link clicks (server-side token consumption + cookie set)
- [ ] Build /analysis/preview page (email-auth session required)
- [ ] Build /analysis/full page (phone-verified session required)
- [ ] Add TWILIO_TEAM_PHONE secret for lead alert SMS routing
- [ ] Build /admin/leads dashboard (view all leads, filter by status, export CSV)
- [ ] Add server-side OTP rate limiting (max 5 attempts per phone per 10 min)
- [ ] Wire up phonecall.bot webhook endpoint (/api/webhooks/phonecall-bot)
- [ ] Add Facebook Pixel event firing (wm_email_verified $100, wm_phone_verified, wm_full_analysis_viewed $500)

## /verify-email Route & Preview Page
- [x] Build GET /verify-email Express route (token hash, consume, set email-auth cookie, redirect)
- [x] Build /analysis/preview frontend page (email-auth session gated, partial preview UI)
- [x] Register /verify-email route in server index
- [x] Add /analysis/preview route to App.tsx router
- [ ] Write Vitest tests for /verify-email route (deferred — integration test requires live DB)

## Lovable Analysis Authority Integration (Option 1)
- [x] Add LOVABLE_ANALYSIS_URL env var
- [x] Add LOVABLE_ANALYSIS_SHARED_SECRET env var
- [x] Add lovable_envelope, analysis_version, trace_id columns to analyses table (DB migration)
- [x] Build server/services/lovableAnalysis.ts service module (Zod envelope schema, signed S3 URL, POST call, error handling)
- [x] Add storeAnalysisEnvelope DB helper (preview fields from envelope.preview ONLY)
- [x] Wire analyzeQuote into analysis.upload procedure (replace runStubAnalysis)
- [x] Error state: mark analysis failed + surface clean TRPCError on Lovable call failure
- [x] Store analysis_version and trace_id from Lovable response in DB
- [x] Write 15 Vitest tests for Lovable service (all passing — 47 total passing)

## Lovable Strict Schema Update (pasted_content_7 spec)
- [x] Add preview_headline and preview_risk_level columns to analyses table
- [x] Update Drizzle schema.ts with new columns
- [x] Rewrite lovableAnalysis.ts with AnalysisEnvelopeSchema (meta/preview/full structure)
- [x] Update storeAnalysisEnvelope DB helper for new field mapping
- [x] Update analysis.upload: new field mapping + lead_events logging (requested/received/persisted/failed)
- [x] Update Vitest tests for new schema shape

## ANALYSIS_SCHEMA_MISMATCH Owner Alert
- [x] Add notifyOwner() call in ANALYSIS_SCHEMA_MISMATCH catch branch (analysis router)
- [x] Include trace_id, raw body excerpt, analysis_version hint, and admin dashboard link in alert
- [x] Update Vitest tests to cover the new notification path
