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

## Native Truth Engine (Task 1 + Task 2)
- [x] Audit live DB vs schema.ts — found 5 orphaned columns
- [x] Drop lovable_envelope, analysis_version, trace_id, preview_headline, preview_risk_level from analyses table
- [x] Verify live DB matches schema.ts exactly (16 columns)
- [x] Install @google/genai SDK (v1.43.0)
- [x] Add GEMINI_API_KEY to ENV object in server/_core/env.ts
- [x] Scaffold server/services/analysisEngine.ts with Zod schemas, AnalysisEngineError, rubric placeholder, and analyzeQuote() function
- [x] Inject extraction rubric and scoring math (PRD provided as canonical source)
- [x] Wire analysisEngine into analysis.upload tRPC procedure (via runPipeline)
- [ ] Write Vitest tests for analysisEngine (Gemini quota blocked — skipped)

## Master PRD vFinal: Manus Truth Engine Decoupling
### Deliverable 1: /server/scanner-brain (Pure Logic Island)
- [x] Create server/scanner-brain/index.ts (barrel with BRAIN_VERSION=3.0.0)
- [x] Create server/scanner-brain/schema.ts (ExtractionSignalsSchema + sanitizeForPrompt)
- [x] Create server/scanner-brain/rubric.ts (EXTRACTION_RUBRIC + GRADING_RUBRIC + USER_PROMPT_TEMPLATE)
- [x] Create server/scanner-brain/scoring.ts (scoreFromSignals + generateSafePreview + derivePillarStatuses)
- [x] Create server/scanner-brain/forensic.ts (generateForensicSummary + extractIdentity)
### Deliverable 2: Database Patch
- [x] Add new columns to analyses table (fileKey, fileHash, ocrTextKey, ocrTextUrl, ocrMeta, proofOfRead, previewJson, rubricVersion, expiresAt, raw_extraction_output, raw_analysis_output)
- [x] Update status enum (add "processing")
- [x] Add email_verified_at and phone_verified_at to leads table
- [x] Add indexes (fileHash, status+expiresAt)
- [x] Update Drizzle schema.ts to match
### Deliverable 3: Upload Pipeline
- [x] Rewrite analysis.upload: MIME validation, SHA-256 dedup, immediate row insert, background runPipeline
- [x] Implement runPipeline: OCR → Proof-of-Read → Signals extraction → scoring → preview → forensic → persist
- [x] Implement single-retry on ExtractionSignalsSchema.strict().parse() failure
### Deliverable 4: Access Ladder Router
- [x] Implement GET /analysis/:id with identity-gated response stripping (public/email/phone tiers)
### Deliverable 5: TTL Purge + Observability
- [x] Update purge job for new status enum (processing + temp)
- [x] Emit scanner_analysis_completed, scanner_purged, scanner_dedup_hit, scanner_analysis_failed events
### Tests
- [x] Vitest: scanner-brain pure logic (scoring, preview censor-greens, rounding, bucketing) — 5 acceptance tests pass
- [x] Vitest: access ladder security (no preview leak, no full leak) — 20 tests pass
- [ ] Vitest: dedup logic

## TS Error Fix: previewJson migration
- [x] Replace previewScore/previewGrade/previewFindings/pillarStatuses refs in analysis.ts with previewJson cast to SafePreview
- [x] Remove runStubAnalysis function — replaced by pipeline
- [x] Update createAnalysis call in upload to use new column names
- [x] Update verifyEmail return to extract from previewJson
- [x] Update getPreview to extract from previewJson
- [x] Update verifyPhoneOTP team SMS to extract from previewJson
- [x] Replace setAnalysisPreviewFields with updateAnalysisPipelineResults in db.ts
- [x] Fix AnalysisPreview.tsx: use preview.finalGrade, preview.overallScore, preview.findings
- [x] Verify 0 TS errors

## Vertex AI Migration
- [x] Update analysisEngine.ts: vertexai: true, project: gen-lang-client-0516998301, location: global, model: gemini-3.1-flash-lite-preview
- [x] Store GOOGLE_APPLICATION_CREDENTIALS_JSON as secret
- [x] Create vertexAdc.ts: writes JSON to temp file, sets GOOGLE_APPLICATION_CREDENTIALS
- [x] Bootstrap ADC in server/_core/index.ts before any Gemini client
- [x] Remove apiKey from Vertex AI client (mutually exclusive with ADC)
- [x] Re-run Vitest: 35/35 pass, Gemini returns OK
- [ ] Save checkpoint

## E2E Test Pack
- [ ] Generate overcharge quote PDF fixture (Test 1 input)
- [ ] Generate non-quote PDF fixture (Test 2 input)
- [ ] Set up artifact directories and screenshot naming convention
- [ ] Execute Test 1: Happy Path Overcharge Quote — all stages with screenshots + DB snapshots
- [ ] Execute Test 2: No Quote / Invalid Document — all stages with screenshots + DB snapshots
- [ ] Compile E2E run report markdown with pass/fail per checkpoint

## Final Truth Engine Structural Patch
### Phase 1 — Tri-State Boolean Safety
- [x] Add isTrue/isFalse/isUnknown/arr/hasAny helpers to scoring.ts
- [x] Audit all scoring logic: replace falsy checks with tri-state helpers
### Phase 2 — D-001 Document Type Gate
- [x] Add NOT_A_QUOTE gate in analysisEngine.ts after Zod parse
### Phase 3 — SafePreview + Pillar Status Bridge
- [x] Replace existing SafePreview/derivePillarStatuses with canonical versions from patch
- [x] Add PillarKey, PillarStatus, PillarStatuses, PreviewFinding types (pillarKey + pillarLabel)
- [x] Add PILLAR_LABEL, TOOLTIP_MAP, roundToNearest5, computeRiskLevel, bucketWarnings
- [x] Add generateSafePreview with CRO constraints (censor greens, max 3, flags first)
- [x] Fix AnalysisPreview.tsx: update .pillar refs to .pillarKey/.pillarLabel
### Phase 4 — Vitest Acceptance Tests
- [x] No Green Leakage test
- [x] Max 3 Vulnerabilities test
- [x] Flag Ordering test
- [x] Score Rounding test
- [x] Zero Findings test

## D-001 Gate Frontend Wiring + E2E Test 2
- [x] Wire NOT_A_QUOTE error code into upload mutation error handler
- [x] Show not_a_quote UI state (amber warning, "That doesn't look like a quote", Try Different File CTA)
- [x] E2E Test 2: upload grocery receipt, verified NOT_A_QUOTE in 2 polls, screenshot captured

## OTP Rate Limiting (Twilio Billing Protection)
- [x] Implement in-memory rate limiter (max 5 OTP sends per phone per 10 min window)
- [x] Wire rate limiter into analysis.sendPhoneOTP procedure (throw TOO_MANY_REQUESTS)
- [x] Write Vitest test: simulate 6 rapid requests, assert 6th is blocked with 429 — 12 tests pass

## Lookup Phone Rate Limiting (Twilio Lookup v2 Billing Protection)
- [x] Add lookupRateLimiter singleton (max 10 per phone per 10 min window)
- [x] Wire rate limiter into analysis.lookupPhone procedure (throw TOO_MANY_REQUESTS)
- [x] Write Vitest test: simulate 11 rapid requests, assert 11th is blocked — 4 tests pass

## IP-Based Rate Limiting (Defense-in-Depth)
- [x] Add ipRateLimiter singleton (max 20 Twilio calls per IP per 10 min window)
- [x] Add getClientIp helper (x-forwarded-for → req.ip → socket.remoteAddress → "unknown")
- [x] Wire IP rate limiter into lookupPhone and sendPhoneOTP (checked before per-phone limiter)
- [x] Write Vitest test: 21 requests from same IP with different phones, 21st blocked — 11 tests pass

## Progressive Exponential Backoff (Smart Cooldown)
- [x] Implement ProgressiveBackoff class (1st fail: 0s, 2nd: 30s, 3rd: 2min, 4th+: 10min + captchaRequired flag)
- [x] Wire into verifyPhoneOTP failure path (wrong OTP code triggers escalation)
- [x] Return cooldownMs and captchaRequired in TOO_MANY_REQUESTS/BAD_REQUEST error cause
- [x] Reset backoff on successful OTP verification
- [x] Write Vitest tests for all 4 escalation tiers + reset + brute-force simulation — 12 tests pass

## OTP Countdown Timer (Frontend UX)
- [x] Create useOtpCooldown hook (reads cooldownRemainingMs, ticks every second, returns secondsLeft + captchaRequired)
- [x] Add custom tRPC errorFormatter to forward backoff data from server cause to client err.data.backoff
- [x] Wire hook into OTP verification UI — disable submit button during cooldown
- [x] Show live countdown banner: amber (tiers 2-3) / red (tier 4) with formatted time ("30s", "1:45")
- [x] Show CAPTCHA warning banner when captchaRequired is true (tier 4) with AlertOctagon icon
- [x] Clear countdown on successful verification

## Send Code Rate Limit Countdown (Frontend UX)
- [x] Add sendCodeCooldown hook instance for the Send Code / lookupPhone path
- [x] Wire into sendPhoneOTP onError and lookupPhone onError — extract err.data.backoff
- [x] Disable Send Code button and show countdown when sendCodeCooldown.isBlocked
- [x] Show inline countdown banner below Send Code button (amber/red matching OTP style)
- [x] Clear sendCodeCooldown on successful OTP send (onSuccess of sendPhoneOTP)

## Honeypot Bot Protection
- [x] Add isFraud boolean column to leads table in drizzle/schema.ts
- [x] Added is_fraud column via direct SQL ALTER TABLE (migration journal issue workaround)
- [x] Add CSS-hidden honeypot input to QualificationCard (name="website", position: absolute left: -9999px)
- [x] Pass honeypot field value in lookupAndCreateLead, requestEmailVerification, submitNoQuoteLead
- [x] Server-side: if honeypot non-empty, set isFraud=true silently and return success
- [x] Add setLeadFraud DB helper; also flags existing leads that re-submit with honeypot filled
- [x] Log wm_honeypot_triggered lead_event for observability
- [x] Write 17 Vitest tests: detection logic, schema validation, silent success contract — 116/116 total

## Honeypot Flow A + isFraud Pixel Guard
- [x] Add CSS-hidden honeypot input to UploadZone email step (Flow A)
- [x] Pass honeypot value in requestEmailVerification mutation from UploadZone
- [x] Create client/src/lib/pixels.ts with isFraud-aware wrappers for fbq, gtag, dataLayer, hashPii
- [x] Add isFraud to verifyPhoneOTP server response (reads from lead DB record)
- [x] Wire firePhoneVerifiedConversion into verifyPhoneOTP onSuccess in UploadZone and AnalysisPreview
- [x] Write 25 Vitest tests for isFraud pixel guard (Meta, Google, GTM, edge cases, server contract)
- [x] Fix promptInjection.ts Variant 2/3/4 regex gaps — 141/141 total tests now passing

## Analysis Report Integration (GitHub Committed Files)
- [x] Sync GitHub and import QuoteAnalysisTheater.tsx, QuoteRevealGate.tsx, theaterCopy.ts, analysis-report.tsx
- [x] Fix ScoredResult import — created shared/scoredTypes.ts (client-safe mirror of server types)
- [x] Wire AnalysisReport into AnalysisPreview post-OTP verification flow (inline render, not standalone route)
- [x] Wire AnalysisReport into UploadZone post-OTP verification flow (same pattern)
- [x] Apply depth tokens (SURFACE/SURFACE_INSET) to report cards — bg-slate-900/60 + border-white/8
- [x] High-contrast status pills: Rose-500/20 bg + Rose-300 text (flags), Amber (warns), Emerald (OK)
- [x] Theater shows once per scanId (localStorage flag via QuoteRevealGate)
- [x] Fixed hardCaps → hardCap (singular object, not array) in analysis-report.tsx
- [x] Added overchargeEstimate optional field to ScoredResult type
- [x] 141/141 tests passing, 0 TS errors


## Phase 2A: PDF Download Implementation (COMPLETE)
- [x] Create reportPdf.ts utility (sanitizeFilenamePart, generateReportFilename, computeRiskLevel)
- [x] Create ReportPrintView.tsx (print-safe component with 5-page PDF layout)
- [x] Create DownloadReportButton.tsx (react-to-print trigger + analytics)
- [x] Add DownloadReportButton import to AnalysisPreview.tsx
- [x] Wire DownloadReportButton into full_analysis state
- [x] Add print stylesheet to client/src/index.css
- [x] Create reportPdf.test.ts with 14 unit tests
- [x] Update vitest.config.ts to include client-side tests
- [x] All tests passing (14/14)


## Verify-Email Flow Fix (Cross-Device Reliability)
- [x] Create VerifyEmail.tsx page component with robust error handling
- [x] Parse query params: token, session (tempSessionId), attach (deprecated)
- [x] Handle same-device flow: token + session → analysis attached
- [x] Handle cross-device flow: token only → no analysis attached, show soft error
- [x] Handle Flow B: token only → no analysis, show account ready message
- [x] Add error UI states: link_used, link_expired, server_error, invalid_link
- [x] Add recovery CTAs: Request New Link, Upload New Quote, Try Again
- [x] Add server logging in analysis.verifyEmail: warn on missing tempSessionId
- [x] Add server logging: warn when tempSessionId provided but no analysis found
- [x] Register /verify-email route in App.tsx
- [x] Create VerifyEmail.test.ts with 16 unit tests (all passing)
- [x] Test query param parsing (5 tests)
- [x] Test error message mapping (4 tests)
- [x] Test recovery action selection (3 tests)
- [x] Test page state transitions (4 tests)

## Compare Entry Point + Cookie Helper
- [x] resolveActiveLeadIdFromCookies helper in server/lib/sessionHelpers.ts
- [x] listAnalysesForLeadPicker DB helper in server/db.ts
- [x] analysis.listMyAnalyses tRPC procedure (cookie-auth, no leadId param)
- [x] CompareQuotePickerModal component
- [x] Compare entry point buttons in AnalysisPreview (top + sticky)
- [x] Analytics events: wm_compare_entry_clicked, wm_compare_challenger_selected, wm_compare_navigated
- [x] Tests: listMyAnalyses access control + exclusion logic

## Force Light Mode Fix
- [x] Kill dark mode in index.html (remove class="dark")
- [x] Fix fonts: add Inter + Poppins import to index.css
- [x] Force body styles: bg #FAFBFC, color #0F172A, Inter font
- [x] Force ThemeProvider to light in App.tsx
- [x] Strip dark colors from HeroSection.tsx
- [x] Strip dark colors from ProblemSection.tsx
- [x] Strip dark colors from HowItWorksSection.tsx
- [x] Strip dark colors from UploadZone.tsx
- [x] Strip dark colors from Header.tsx
- [x] Strip dark colors from Footer.tsx
- [x] Strip dark colors from TestimonialSection.tsx
- [x] Strip dark colors from TrustSection.tsx
- [x] Strip dark colors from ScanningState.tsx
- [x] Strip dark colors from UrgencyTicker.tsx
- [x] Strip dark colors from AnalysisReveal.tsx
- [x] Strip dark colors from QualificationCard.tsx

## Exhaustive Light Mode Refactor (6:1 Contrast + ARIA)
- [x] Phase 1: Kill dark mode root (index.html, index.css, App.tsx, double footer fix)
- [x] Phase 2-3: Rewrite Header.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite Footer.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite HeroSection.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite ProblemSection.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite HowItWorksSection.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite TestimonialSection.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite TrustSection.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite UploadZone.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite ScanningState.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite AnalysisReveal.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 2-3: Rewrite QualificationCard.tsx with mechanical mapping + 6:1 contrast
- [x] Phase 4: ScanLine light variant (confirmed variant="light" in AppLayout)
- [x] Phase 5: grep proof CLEAN, tsc 0 errors, 237/239 tests pass (2 pre-existing timeouts)
