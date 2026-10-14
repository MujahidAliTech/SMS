-- ============================================================================
-- TaleemCloud Multi-Tenant School Management SaaS
-- Database Target: Cloudflare D1 (SQLite)
-- Migration 0001: Initial Relational Multi-Tenant Schema
-- ============================================================================

-- Enforce Foreign Key Integrity
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS (Platform-wide)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price_monthly_pkr INTEGER NOT NULL DEFAULT 0,
    price_yearly_pkr INTEGER NOT NULL DEFAULT 0,
    student_limit INTEGER NOT NULL DEFAULT 100,
    teacher_limit INTEGER NOT NULL DEFAULT 10,
    features_json TEXT NOT NULL DEFAULT '[]',
    is_popular INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 2. TENANTS / SCHOOLS (The primary tenancy root)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('school', 'academy', 'tuition_center')),
    status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('active', 'suspended', 'trial')),
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    student_limit INTEGER NOT NULL DEFAULT 150,
    teacher_limit INTEGER NOT NULL DEFAULT 15,
    active_student_count INTEGER NOT NULL DEFAULT 0,
    active_teacher_count INTEGER NOT NULL DEFAULT 0,
    
    -- Branding & Contact details (JSON-compatible or individual fields)
    branding_school_name TEXT NOT NULL,
    branding_tagline TEXT,
    branding_logo_url TEXT,
    branding_favicon_url TEXT,
    branding_primary_color TEXT NOT NULL DEFAULT '#1e3a8a',
    branding_secondary_color TEXT NOT NULL DEFAULT '#0d9488',
    branding_phone TEXT NOT NULL,
    branding_whatsapp TEXT,
    branding_email TEXT NOT NULL,
    branding_address TEXT NOT NULL,
    branding_city TEXT NOT NULL,
    branding_province TEXT NOT NULL,
    branding_principal_name TEXT NOT NULL,
    branding_academic_session TEXT NOT NULL DEFAULT '2026-2027',
    branding_affiliation_board TEXT,
    branding_about_text TEXT,
    branding_hero_headline TEXT,
    branding_hero_subheadline TEXT,
    branding_facebook_url TEXT,
    branding_instagram_url TEXT,
    branding_youtube_url TEXT,
    
    subscription_end_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- ----------------------------------------------------------------------------
-- 3. TENANT SUBSCRIPTIONS (Billing & Life-cycle)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'trial', 'past_due', 'expired')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'yearly')),
    start_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    renewal_date TEXT NOT NULL,
    amount_pkr INTEGER NOT NULL DEFAULT 0,
    auto_renew INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);

-- ----------------------------------------------------------------------------
-- 4. USERS & ROLES
-- tenant_id is NULL for platform 'super_admin' users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'school_admin', 'principal', 'teacher', 'accountant', 'parent', 'student')),
    avatar_url TEXT,
    linked_entity_id TEXT, -- References student_id, teacher_id, or parent_id
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 5. USER CREDENTIALS (Securely separated from user profile)
-- Never exposed to client; hashes managed with PBKDF2-SHA256
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_credentials (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 6. USER SESSIONS (Server-authoritative state with HttpOnly cookie tokens)
-- token_hash stores the SHA-256 hash of the random cryptographically secure token
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ----------------------------------------------------------------------------
-- 7. ACADEMIC CLASSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_classes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_numeric INTEGER NOT NULL DEFAULT 0,
    class_teacher_name TEXT,
    capacity INTEGER NOT NULL DEFAULT 40,
    total_students INTEGER NOT NULL DEFAULT 0,
    monthly_tuition_fee INTEGER NOT NULL DEFAULT 5000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_classes_tenant ON school_classes(tenant_id);

-- ----------------------------------------------------------------------------
-- 8. CLASS SECTIONS (Normalized relation for class sections like "A", "B")
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_sections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "A", "B", "Rose", "Tulip"
    section_teacher_name TEXT,
    capacity INTEGER NOT NULL DEFAULT 35,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, class_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sections_class ON class_sections(class_id);

-- ----------------------------------------------------------------------------
-- 9. TEACHERS & STAFF
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers_staff (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    teacher_code TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'principal', 'accountant', 'staff')),
    designation TEXT NOT NULL,
    qualification TEXT NOT NULL,
    subjects_json TEXT NOT NULL DEFAULT '[]',
    assigned_classes_json TEXT NOT NULL DEFAULT '[]',
    joining_date TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    cnic TEXT NOT NULL,
    employment_status TEXT NOT NULL DEFAULT 'active' CHECK(employment_status IN ('active', 'leave', 'resigned')),
    salary_monthly INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, cnic)
);

CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON teachers_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers_staff(tenant_id, role);

-- ----------------------------------------------------------------------------
-- 10. SUBJECTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher_id TEXT REFERENCES teachers_staff(id) ON DELETE SET NULL,
    teacher_name TEXT,
    total_marks INTEGER NOT NULL DEFAULT 100,
    passing_marks INTEGER NOT NULL DEFAULT 40,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, class_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_tenant_class ON subjects(tenant_id, class_id);

-- ----------------------------------------------------------------------------
-- 11. PARENTS & GUARDIANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    father_or_husband_name TEXT,
    cnic TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    occupation TEXT,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, cnic)
);

CREATE INDEX IF NOT EXISTS idx_parents_tenant ON parents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parents_cnic ON parents(tenant_id, cnic);

-- ----------------------------------------------------------------------------
-- 12. STUDENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    admission_no TEXT NOT NULL,
    name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female')),
    dob TEXT NOT NULL,
    admission_date TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
    class_name TEXT NOT NULL,
    section_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE RESTRICT,
    section_name TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE RESTRICT,
    parent_contact TEXT NOT NULL,
    emergency_contact TEXT,
    address TEXT NOT NULL,
    b_form_or_cnic TEXT NOT NULL,
    previous_school TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'alumni', 'struck_off')),
    photo_url TEXT,
    monthly_fee INTEGER NOT NULL DEFAULT 5000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, admission_no),
    UNIQUE(tenant_id, class_id, section_id, roll_no)
);

CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(tenant_id, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 13. ATTENDANCE RECORDS (Daily Student Roll Call)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- YYYY-MM-DD
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'leave')),
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance_records(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance_records(tenant_id, class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(tenant_id, student_id, date);

-- ----------------------------------------------------------------------------
-- 14. FEE INVOICES (Monthly Fee Challans)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_no TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    student_name TEXT NOT NULL,
    admission_no TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
    class_name TEXT NOT NULL,
    fee_month TEXT NOT NULL, -- e.g. "October 2026"
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    tuition_fee INTEGER NOT NULL DEFAULT 0,
    exam_fee INTEGER NOT NULL DEFAULT 0,
    admission_fee INTEGER NOT NULL DEFAULT 0,
    other_charges INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    late_fee INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    balance INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('paid', 'pending', 'partial', 'overdue')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_month ON fee_invoices(tenant_id, fee_month);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON fee_invoices(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 15. FEE PAYMENTS (Ledger of Collections & Receipts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES fee_invoices(id) ON DELETE RESTRICT,
    invoice_no TEXT NOT NULL,
    receipt_no TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    student_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'online')),
    transaction_ref TEXT,
    received_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON fee_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON fee_payments(tenant_id, payment_date);

-- ----------------------------------------------------------------------------
-- 16. EXAMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    session TEXT NOT NULL,
    term TEXT NOT NULL CHECK(term IN ('First Term', 'Mid Term', 'Pre-Board', 'Final Term', 'Monthly Test')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'ongoing', 'completed', 'announced')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id);

-- ----------------------------------------------------------------------------
-- 17. STUDENT RESULTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_results (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    exam_title TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    total_marks REAL NOT NULL DEFAULT 0,
    total_obtained REAL NOT NULL DEFAULT 0,
    percentage REAL NOT NULL DEFAULT 0,
    grade TEXT NOT NULL,
    position_in_class INTEGER,
    status TEXT NOT NULL CHECK(status IN ('pass', 'fail')),
    teacher_remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_results_tenant_exam ON student_results(tenant_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON student_results(student_id);

-- ----------------------------------------------------------------------------
-- 18. RESULT SUBJECT MARKS (Normalized subject-wise grades per report card)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS result_subject_marks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    result_id TEXT NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    total_marks REAL NOT NULL,
    obtained_marks REAL NOT NULL,
    passing_marks REAL NOT NULL,
    grade TEXT NOT NULL,
    remarks TEXT,
    UNIQUE(result_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_marks_result ON result_subject_marks(result_id);

-- ----------------------------------------------------------------------------
-- 19. TIMETABLE ENTRIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetable_entries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    section TEXT NOT NULL,
    day TEXT NOT NULL CHECK(day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    period_no INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    room_no TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timetable_tenant_class ON timetable_entries(tenant_id, class_id, day);

-- ----------------------------------------------------------------------------
-- 20. HOMEWORK
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homework (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    section TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    assigned_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
    attachment_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_homework_tenant_class ON homework(tenant_id, class_id);

-- ----------------------------------------------------------------------------
-- 21. ADMISSION APPLICATIONS (Public Website Enquiries & Lead Pipeline)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admission_applications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    application_no TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    class_applied TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    address TEXT NOT NULL,
    dob TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female')),
    previous_school TEXT,
    submission_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'under_review', 'approved', 'rejected')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, application_no)
);

CREATE INDEX IF NOT EXISTS idx_admissions_tenant ON admission_applications(tenant_id);

-- ----------------------------------------------------------------------------
-- 22. ANNOUNCEMENTS & CIRCULARS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT NOT NULL CHECK(target_audience IN ('everyone', 'teachers', 'parents', 'students', 'selected_class')),
    target_class_name TEXT,
    is_urdu INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published')),
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);

-- ----------------------------------------------------------------------------
-- 23. SCHOOL EVENTS & ACADEMIC CALENDAR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('academic', 'sports', 'cultural', 'holiday', 'exam')),
    audience TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_tenant ON school_events(tenant_id);

-- ----------------------------------------------------------------------------
-- 24. AUDIT LOGS (Security & Compliance Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    school_name TEXT,
    actor_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, timestamp);
