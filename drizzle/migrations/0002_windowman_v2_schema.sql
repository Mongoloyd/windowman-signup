-- WindowMan v2 Schema Migration
-- Applied manually via webdev_execute_sql on 2026-03-03
-- These statements are already executed in the database.
-- This file documents the migration for Drizzle's awareness.

-- Renamed old leads table to preserve legacy phone-only OTP data
-- RENAME TABLE leads TO leads_v1; (already executed)

-- New leads table (UUID pk, email-first identity)
-- CREATE TABLE leads ... (already executed)

-- New supporting tables
-- CREATE TABLE analyses ... (already executed)
-- CREATE TABLE email_verifications ... (already executed)
-- CREATE TABLE lead_sessions ... (already executed)
-- CREATE TABLE lead_events ... (already executed)
-- CREATE TABLE lead_calls ... (already executed)
