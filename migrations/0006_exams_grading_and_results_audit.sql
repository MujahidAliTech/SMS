-- Migration 0006: Exams, Marks Entry, Grading, Result Publication & Report Cards Audit
-- Multi-Tenant SaaS School Management System

-- 1. Extend Exams with Publication Status and Academic Session
ALTER TABLE exams ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE exams ADD COLUMN academic_session TEXT DEFAULT '2026-2027';

-- 2. Extend Student Results with Review and Publication Workflow
ALTER TABLE student_results ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE student_results ADD COLUMN submitted_by TEXT;
ALTER TABLE student_results ADD COLUMN approved_by TEXT;
ALTER TABLE student_results ADD COLUMN published_at TEXT;
ALTER TABLE student_results ADD COLUMN published_by TEXT;

-- 3. Extend Subject Marks with Absent / Exempt Support and Teacher Accountability
ALTER TABLE result_subject_marks ADD COLUMN marks_status TEXT NOT NULL DEFAULT 'present';
ALTER TABLE result_subject_marks ADD COLUMN is_absent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE result_subject_marks ADD COLUMN is_exempt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE result_subject_marks ADD COLUMN entered_by_teacher_id TEXT;

-- 4. Exam Schedules Table
CREATE TABLE IF NOT EXISTS exam_schedules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    total_marks INTEGER NOT NULL DEFAULT 100,
    passing_marks INTEGER NOT NULL DEFAULT 40,
    room_no TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, exam_id, class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_tenant ON exam_schedules(tenant_id, exam_id);

-- 5. Result Corrections Table (Immutable audit trail for corrections to published marks)
CREATE TABLE IF NOT EXISTS result_corrections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    result_id TEXT NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    old_obtained_marks REAL NOT NULL,
    new_obtained_marks REAL NOT NULL,
    old_grade TEXT NOT NULL,
    new_grade TEXT NOT NULL,
    reason TEXT NOT NULL,
    corrected_by_user_id TEXT NOT NULL REFERENCES users(id),
    corrected_by_user_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_result_corrections_tenant ON result_corrections(tenant_id, result_id);

-- 6. Exam Audit Logs (Audit log for exam creation, schedule changes, marks submission, approval, and publication)
CREATE TABLE IF NOT EXISTS exam_audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    performed_by_user_id TEXT NOT NULL REFERENCES users(id),
    performed_by_user_name TEXT,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exam_audit_tenant ON exam_audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_results_publication ON student_results(tenant_id, exam_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_subject_marks_result ON result_subject_marks(result_id);
