-- ============================================================================
-- TaleemCloud Multi-Tenant School Management SaaS
-- Database Target: Cloudflare D1 (SQLite)
-- Migration 0004: Attendance fields and audit trail
-- ============================================================================

ALTER TABLE attendance_records ADD COLUMN recorded_by_user_id TEXT;
ALTER TABLE attendance_records ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

CREATE TABLE IF NOT EXISTS attendance_corrections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attendance_record_id TEXT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    old_remarks TEXT,
    new_remarks TEXT,
    reason TEXT,
    changed_by_user_id TEXT NOT NULL REFERENCES users(id),
    changed_by_user_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_record ON attendance_corrections(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_tenant_date ON attendance_corrections(tenant_id, date);
