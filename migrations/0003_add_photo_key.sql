-- ============================================================================
-- TaleemCloud Multi-Tenant School Management SaaS
-- Database Target: Cloudflare D1 (SQLite)
-- Migration 0003: Add photo_key for Cloudflare R2 Secure Object Storage
-- ============================================================================

ALTER TABLE students ADD COLUMN photo_key TEXT;
ALTER TABLE teachers_staff ADD COLUMN photo_key TEXT;
