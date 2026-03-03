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

## In Progress
- [x] Store Twilio credentials securely (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- [x] Install Twilio SDK on server
- [x] Create tRPC backend routes for Twilio SMS and call functionality
- [x] Wire up frontend CTA buttons to Twilio backend
- [x] Add lead capture form with phone number input
- [x] Write Vitest tests for Twilio routes

## Twilio Verify OTP Flow
- [x] Store TWILIO_VERIFY_SERVICE_SID securely
- [x] Add leads table to DB schema (status: unverified/verified, name, phone, answers)
- [x] Run pnpm db:push to migrate schema
- [x] Add Lookup v2 backend route (block VOIP/landline)
- [x] Add sendOTP backend route (trigger Verify)
- [x] Add verifyOTP backend route (check code, flip status, fire team SMS)
- [x] Build frontend OTP flow: phone input → Lookup check → OTP input → success
- [x] 6-digit OTP input with auto-advance, Resend, and Edit Number escape hatch
- [x] Write Vitest tests for OTP routes
