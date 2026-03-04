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
