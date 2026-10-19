-- Migration 0005: Fee Structures, Invoices, Payment Reversals, and Audit Logs
-- Multi-Tenant SaaS School Management System

-- 1. Configurable Fee Heads (Admission, Tuition, Exam, Lab, Library, Annual, Transport, Sports)
CREATE TABLE IF NOT EXISTS fee_heads (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 1, -- 1 = monthly, 0 = one-time/annual
    default_amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fee_heads_tenant ON fee_heads(tenant_id);

-- 2. Class-Wise Fee Structures
CREATE TABLE IF NOT EXISTS fee_structures (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    fee_head_id TEXT NOT NULL REFERENCES fee_heads(id) ON DELETE CASCADE,
    fee_head_name TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    academic_session TEXT NOT NULL DEFAULT '2026-2027',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, class_id, fee_head_id, academic_session)
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant ON fee_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON fee_structures(tenant_id, class_id);

-- 3. Extend Fee Invoices if columns not present
-- Note: SQLite allows adding columns via ALTER TABLE
-- Unique constraint preventing duplicate invoices per student and month
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_student_month ON fee_invoices(tenant_id, student_id, fee_month);

-- 4. Payment Reversals (Immutable audit table for payment cancellations/refunds)
CREATE TABLE IF NOT EXISTS payment_reversals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL REFERENCES fee_payments(id) ON DELETE RESTRICT,
    invoice_id TEXT NOT NULL REFERENCES fee_invoices(id) ON DELETE RESTRICT,
    receipt_no TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reversed_by_user_id TEXT NOT NULL REFERENCES users(id),
    reversed_by_user_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reversals_tenant ON payment_reversals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reversals_payment ON payment_reversals(payment_id);

-- 5. Financial Audit Logs (Immutable event log for all fee modifications)
CREATE TABLE IF NOT EXISTS fee_audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    performed_by_user_id TEXT NOT NULL REFERENCES users(id),
    performed_by_user_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fee_audit_tenant ON fee_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_entity ON fee_audit_logs(tenant_id, entity_type, entity_id);

-- 6. Enforce Idempotency Unique Index on Fee Payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_idempotency ON fee_payments(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
