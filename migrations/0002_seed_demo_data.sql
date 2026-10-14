-- ============================================================================
-- TaleemCloud Multi-Tenant School Management SaaS
-- Database Target: Cloudflare D1 (SQLite)
-- Migration 0002: Seed Initial Demo Data (Pakistan Schooling Context)
-- ============================================================================

-- 1. SUBSCRIPTION PLANS
INSERT OR IGNORE INTO subscription_plans (id, name, slug, description, price_monthly_pkr, price_yearly_pkr, student_limit, teacher_limit, features_json, is_popular)
VALUES
('plan-starter', 'Taleem Starter', 'starter', 'Perfect for small tuition centers and primary academies up to 150 students.', 4500, 45000, 150, 10, '["Student & Parent Directory","Daily Attendance Marking","Fee Invoicing & Manual Receipts","Exam Result Cards","SMS/WhatsApp Alert Formats","Basic School Public Website","Single User Admin Access"]', 0),
('plan-standard', 'Taleem Standard', 'standard', 'Designed for established private high schools up to 500 students with multi-role access.', 9500, 95000, 500, 30, '["All Starter Features","Teacher, Parent & Student Portals","Accountant Role & Financial Reports","Printable Thermal/A4 Fee Challans","Timetable Scheduler & Clash Detection","Online Admission Inquiries Portal","Custom Domain & School Website Builder","Export to Excel / CSV"]', 1),
('plan-pro', 'Taleem Enterprise', 'pro', 'For large educational institutions, multiple branches, and comprehensive college academies.', 18000, 180000, 1500, 75, '["All Standard Features","Unlimited Classes & Sections","Advanced BISE / Cambridge Grade Schemas","Parent Mobile-First PWA Access","Detailed Audit Logs & Activity Tracker","Priority Support via WhatsApp & Phone","Custom Urdu / English Language Branding","Cloudflare R2 Secure Document Archive"]', 0);

-- 2. TENANTS
INSERT OR IGNORE INTO tenants (
    id, slug, name, type, status, plan_id, student_limit, teacher_limit, active_student_count, active_teacher_count,
    branding_school_name, branding_tagline, branding_logo_url, branding_favicon_url,
    branding_primary_color, branding_secondary_color, branding_phone, branding_whatsapp, branding_email,
    branding_address, branding_city, branding_province, branding_principal_name, branding_academic_session,
    branding_affiliation_board, branding_about_text, branding_hero_headline, branding_hero_subheadline,
    branding_facebook_url, branding_youtube_url, subscription_end_date
) VALUES
(
    'tenant-bfs', 'bright-future-school', 'Bright Future High School', 'school', 'active', 'plan-standard', 500, 30, 340, 22,
    'Bright Future High School', 'Illuminating Minds, Building Character Since 2008',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=32&auto=format&fit=crop&q=80',
    '#1e3a8a', '#0d9488', '+92 42 35912345', '+92 300 8472910', 'info@brightfuture.edu.pk',
    'Plot 42, Block C, Canal View Housing Scheme', 'Lahore', 'Punjab', 'Prof. Nasreen Akhtar', '2026-2027',
    'BISE Lahore (Reg # 84920)',
    'Bright Future High School is a premier educational institution committed to providing quality education with moral values, modern STEM laboratories, computer education, and comprehensive sports facilities in Lahore.',
    'Excellence in Matriculation & Pre-O Levels',
    'Empowering students from Playgroup to Matriculation with certified faculty and modern computer labs.',
    'https://facebook.com/brightfuturelahore', 'https://youtube.com/@brightfuturelahore', '2027-03-15'
),
(
    'tenant-alnoor', 'al-noor-academy', 'Al-Noor Islamic & Cambridge Academy', 'academy', 'active', 'plan-pro', 1500, 75, 420, 35,
    'Al-Noor Islamic & Cambridge Academy', 'Nurturing Intellect and Faith in Harmony',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=32&auto=format&fit=crop&q=80',
    '#065f46', '#b45309', '+92 21 34987654', '+92 333 2187654', 'admissions@alnooracademy.edu.pk',
    'Street 14, Block 6, Gulshan-e-Iqbal', 'Karachi', 'Sindh', 'Dr. Abdul Qudoos Hashmi', '2026-2027',
    'Cambridge Assessment & Sindh Board',
    'Al-Noor Academy harmonizes contemporary British curriculum education with Islamic ethics, Tajweed, Arabic language, and state-of-the-art robotic learning.',
    'Faith, Knowledge, and Character',
    'Leading British Cambridge O/A-Levels alongside Hifz-ul-Quran programs for well-rounded leaders.',
    'https://facebook.com/alnooracademy', NULL, '2027-08-10'
),
(
    'tenant-kpt', 'knowledge-point-tuition', 'Knowledge Point Science Academy', 'tuition_center', 'trial', 'plan-starter', 150, 10, 110, 8,
    'Knowledge Point Science Academy', 'Top Positions in BISE Rawalpindi & MDCAT Prep',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=32&auto=format&fit=crop&q=80',
    '#4f46e5', '#ea580c', '+92 51 4455667', '+92 312 5599881', 'contact@knowledgepoint.pk',
    '2nd Floor, Rehman Plaza, Commercial Market, Satellite Town', 'Rawalpindi', 'Punjab', 'Engr. Zafar Iqbal Niazi', '2026-2027',
    'Rawalpindi Board & Federal Board Prep',
    'Specialized evening coaching center for Matric (Class 9-10), Intermediate (FSc Pre-Medical & Pre-Engineering), and entry test MDCAT / ECAT.',
    'Score 90%+ in Board Exams & Entry Tests',
    'Small batches, daily chapter-wise MCQ tests, and past paper analysis under renowned college professors.',
    'https://facebook.com/knowledgepointpindi', NULL, '2026-11-01'
);

-- 3. TENANT SUBSCRIPTIONS
INSERT OR IGNORE INTO tenant_subscriptions (id, tenant_id, plan_id, status, billing_cycle, start_date, expiry_date, renewal_date, amount_pkr, auto_renew)
VALUES
('sub-1', 'tenant-bfs', 'plan-standard', 'active', 'yearly', '2024-03-15', '2027-03-15', '2027-03-15', 95000, 1),
('sub-2', 'tenant-alnoor', 'plan-pro', 'active', 'yearly', '2023-08-10', '2027-08-10', '2027-08-10', 180000, 1),
('sub-3', 'tenant-kpt', 'plan-starter', 'trial', 'monthly', '2026-09-01', '2026-11-01', '2026-11-01', 4500, 0);

-- 4. USERS
INSERT OR IGNORE INTO users (id, tenant_id, name, email, phone, role, linked_entity_id)
VALUES
('user-super-1', NULL, 'Tariq Mahmood', 'tariq@taleemcloud.pk', '+92 300 1234567', 'super_admin', NULL),
('user-admin-bfs', 'tenant-bfs', 'Malik Asif', 'admin@brightfuture.edu.pk', '+92 300 8472910', 'school_admin', NULL),
('user-principal-bfs', 'tenant-bfs', 'Prof. Nasreen Akhtar', 'principal@brightfuture.edu.pk', '+92 301 9988776', 'principal', NULL),
('user-teacher-bfs', 'tenant-bfs', 'Sir Zeeshan Haider', 'zeeshan@brightfuture.edu.pk', '+92 321 4455667', 'teacher', 'teacher-1'),
('user-accountant-bfs', 'tenant-bfs', 'Farooq Ahmed', 'accounts@brightfuture.edu.pk', '+92 333 5566778', 'accountant', 'staff-acc-1'),
('user-parent-bfs', 'tenant-bfs', 'Mohammad Rizwan', 'rizwan.father@gmail.com', '+92 300 5544332', 'parent', 'parent-1'),
('user-student-bfs', 'tenant-bfs', 'Hamza Rizwan', 'hamza.rizwan@student.pk', '+92 300 5544332', 'student', 'student-1');

-- 5. USER CREDENTIALS (Demo Salt and PBKDF2 hash for password: "Password123!")
-- Salt: "taleem_demo_salt_2026"
-- PBKDF2-SHA256 (100,000 iterations)
INSERT OR IGNORE INTO user_credentials (user_id, password_hash, password_salt)
VALUES
('user-super-1', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026'),
('user-admin-bfs', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026'),
('user-principal-bfs', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026'),
('user-teacher-bfs', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026'),
('user-accountant-bfs', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026'),
('user-parent-bfs', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026'),
('user-student-bfs', 'f9873fe13ed5fbf2a1d7b75f4cf0701f256fdac5ab0300e4e1ea54303dc1df0e', 'taleem_demo_salt_2026');

-- 6. CLASSES
INSERT OR IGNORE INTO school_classes (id, tenant_id, name, grade_numeric, class_teacher_name, capacity, total_students, monthly_tuition_fee)
VALUES
('class-prep', 'tenant-bfs', 'Prep', 0, 'Ms. Ayesha Siddiqa', 30, 26, 4500),
('class-1', 'tenant-bfs', 'Class 1', 1, 'Ms. Sadia Bibi', 35, 30, 4800),
('class-5', 'tenant-bfs', 'Class 5', 5, 'Sir Usman Ghani', 35, 32, 5200),
('class-8', 'tenant-bfs', 'Class 8 (Middle)', 8, 'Ms. Farah Naz', 40, 36, 5800),
('class-9-matric', 'tenant-bfs', 'Class 9 (Matric Science)', 9, 'Sir Zeeshan Haider', 40, 38, 6500),
('class-10-matric', 'tenant-bfs', 'Class 10 (Matric Science)', 10, 'Sir Tariq Jamil', 40, 37, 6800),
('class-olevel-1', 'tenant-bfs', 'O-Level Year 1', 9, 'Sir Kamran Baig', 25, 20, 12000);

-- 7. CLASS SECTIONS
INSERT OR IGNORE INTO class_sections (id, tenant_id, class_id, name, section_teacher_name, capacity)
VALUES
('sec-prep-rose', 'tenant-bfs', 'class-prep', 'Rose', 'Ms. Ayesha Siddiqa', 30),
('sec-prep-tulip', 'tenant-bfs', 'class-prep', 'Tulip', 'Ms. Nida Khan', 30),
('sec-9-a', 'tenant-bfs', 'class-9-matric', 'A', 'Sir Zeeshan Haider', 40),
('sec-9-b', 'tenant-bfs', 'class-9-matric', 'B', 'Sir Kamran Baig', 40),
('sec-10-a', 'tenant-bfs', 'class-10-matric', 'A', 'Sir Tariq Jamil', 40);

-- 8. TEACHERS & STAFF
INSERT OR IGNORE INTO teachers_staff (id, tenant_id, teacher_code, name, role, designation, qualification, subjects_json, assigned_classes_json, joining_date, phone, email, cnic, employment_status, salary_monthly)
VALUES
('teacher-1', 'tenant-bfs', 'TCH-01', 'Sir Zeeshan Haider', 'teacher', 'Senior Science Teacher', 'M.Sc Physics (Punjab University)', '["Physics","Mathematics"]', '["Class 9 (Matric Science)","Class 10 (Matric Science)"]', '2020-08-15', '+92 321 4455667', 'zeeshan@brightfuture.edu.pk', '35201-1234567-1', 'active', 65000),
('staff-acc-1', 'tenant-bfs', 'STF-02', 'Farooq Ahmed', 'accountant', 'Senior Accountant', 'M.Com, PIPFA', '[]', '[]', '2021-02-01', '+92 333 5566778', 'accounts@brightfuture.edu.pk', '35202-7654321-3', 'active', 55000);

-- 9. PARENTS
INSERT OR IGNORE INTO parents (id, tenant_id, name, father_or_husband_name, cnic, phone, whatsapp, email, occupation, address)
VALUES
('parent-1', 'tenant-bfs', 'Mohammad Rizwan', 'Haji Abdul Sattar', '35202-9876543-1', '+92 300 5544332', '+92 300 5544332', 'rizwan.father@gmail.com', 'Senior Civil Engineer (NESPAK)', 'House 18, Street 4, Canal View Housing Scheme, Lahore');

-- 10. STUDENTS
INSERT OR IGNORE INTO students (
    id, tenant_id, admission_no, name, father_name, gender, dob, admission_date,
    class_id, class_name, section_id, section_name, roll_no, parent_id, parent_contact,
    emergency_contact, address, b_form_or_cnic, status, monthly_fee
) VALUES
(
    'student-1', 'tenant-bfs', 'BFS-2024-0101', 'Hamza Rizwan', 'Mohammad Rizwan', 'Male', '2010-04-12', '2024-04-01',
    'class-9-matric', 'Class 9 (Matric Science)', 'sec-9-a', 'A', '01', 'parent-1', '+92 300 5544332',
    '+92 321 9876543 (Mother)', 'House 18, Street 4, Canal View, Lahore', '35202-4567890-1', 'active', 6500
),
(
    'student-2', 'tenant-bfs', 'BFS-2024-0102', 'Ayesha Rizwan', 'Mohammad Rizwan', 'Female', '2013-09-20', '2024-04-01',
    'class-5', 'Class 5', 'sec-prep-rose', 'Rose', '04', 'parent-1', '+92 300 5544332',
    '+92 321 9876543 (Mother)', 'House 18, Street 4, Canal View, Lahore', '35202-7890123-2', 'active', 5200
);

-- 11. FEE INVOICES
INSERT OR IGNORE INTO fee_invoices (
    id, tenant_id, invoice_no, student_id, student_name, admission_no, class_id, class_name,
    fee_month, issue_date, due_date, tuition_fee, exam_fee, admission_fee, other_charges, discount,
    late_fee, total_amount, amount_paid, balance, status
) VALUES
(
    'inv-oct-2026-001', 'tenant-bfs', 'INV-2026-10-001', 'student-1', 'Hamza Rizwan', 'BFS-2024-0101',
    'class-9-matric', 'Class 9 (Matric Science)', 'October 2026', '2026-10-01', '2026-10-15',
    6500, 500, 0, 200, 0, 0, 7200, 7200, 0, 'paid'
),
(
    'inv-nov-2026-001', 'tenant-bfs', 'INV-2026-11-001', 'student-1', 'Hamza Rizwan', 'BFS-2024-0101',
    'class-9-matric', 'Class 9 (Matric Science)', 'November 2026', '2026-11-01', '2026-11-15',
    6500, 0, 0, 0, 0, 0, 6500, 0, 6500, 'pending'
);

-- 12. FEE PAYMENTS
INSERT OR IGNORE INTO fee_payments (
    id, tenant_id, invoice_id, invoice_no, receipt_no, student_id, student_name, amount, payment_date, payment_method, transaction_ref, received_by
) VALUES
(
    'pay-101', 'tenant-bfs', 'inv-oct-2026-001', 'INV-2026-10-001', 'REC-948201', 'student-1', 'Hamza Rizwan',
    7200, '2026-10-08', 'bank_transfer', 'HBL-FT-98402198', 'Farooq Ahmed (Accountant)'
);

-- 13. EXAMS & RESULTS
INSERT OR IGNORE INTO exams (id, tenant_id, title, session, term, start_date, end_date, status)
VALUES
('exam-mid-2026', 'tenant-bfs', 'Mid-Term Examinations 2026', '2026-2027', 'Mid Term', '2026-09-15', '2026-09-28', 'announced');

INSERT OR IGNORE INTO student_results (
    id, tenant_id, exam_id, exam_title, student_id, student_name, roll_no, class_id, class_name,
    total_marks, total_obtained, percentage, grade, position_in_class, status, teacher_remarks
) VALUES
(
    'res-hamza-mid26', 'tenant-bfs', 'exam-mid-2026', 'Mid-Term Examinations 2026', 'student-1', 'Hamza Rizwan',
    '01', 'class-9-matric', 'Class 9 (Matric Science)', 500, 438, 87.6, 'A+', 2, 'pass',
    'Excellent academic conceptual clarity in Physics and Mathematics. Highly disciplined student.'
);

-- 14. RESULT SUBJECT MARKS
INSERT OR IGNORE INTO result_subject_marks (id, tenant_id, result_id, subject_id, subject_name, total_marks, obtained_marks, passing_marks, grade, remarks)
VALUES
('rsm-1', 'tenant-bfs', 'res-hamza-mid26', 'sub-physics', 'Physics', 75, 68, 25, 'A+', 'Outstanding numerical problem solving'),
('rsm-2', 'tenant-bfs', 'res-hamza-mid26', 'sub-math', 'Mathematics', 75, 72, 25, 'A+', 'Full marks in algebraic theorem proof'),
('rsm-3', 'tenant-bfs', 'res-hamza-mid26', 'sub-chem', 'Chemistry', 75, 61, 25, 'A', 'Good grasp of stoichiometry'),
('rsm-4', 'tenant-bfs', 'res-hamza-mid26', 'sub-eng', 'English', 75, 64, 25, 'A', 'Impressive essay and comprehension'),
('rsm-5', 'tenant-bfs', 'res-hamza-mid26', 'sub-urdu', 'Urdu', 75, 62, 25, 'A', 'Well structured Tashreeh'),
('rsm-6', 'tenant-bfs', 'res-hamza-mid26', 'sub-isla', 'Islamiat', 50, 46, 17, 'A+', 'Exceptional Quranic translation recitation'),
('rsm-7', 'tenant-bfs', 'res-hamza-mid26', 'sub-pak', 'Pakistan Studies', 50, 45, 17, 'A+', 'Clear historical timelines');

-- 15. HOMEWORK
INSERT OR IGNORE INTO homework (
    id, tenant_id, title, description, class_id, class_name, section, subject_name, teacher_name, assigned_date, due_date, status
) VALUES
(
    'hw-1', 'tenant-bfs', 'Numerical Problems Chapter 4 (Work & Energy)',
    'Solve Exercise numericals 4.1 to 4.6 in the Physics Homework register. Show formulas, SI units, and step-by-step calculations.',
    'class-9-matric', 'Class 9 (Matric Science)', 'A', 'Physics', 'Sir Zeeshan Haider', '2026-10-12', '2026-10-16', 'active'
);

-- 16. ANNOUNCEMENTS
INSERT OR IGNORE INTO announcements (
    id, tenant_id, title, content, target_audience, target_class_name, is_urdu, status, author_name, created_at
) VALUES
(
    'anc-1', 'tenant-bfs', 'Parent-Teacher Meeting (PTM) for Mid-Term Results',
    'Dear Parents, the Parent-Teacher Meeting (PTM) to discuss Mid-Term academic progress and fee clearance will be held this Saturday, October 18, 2026, from 09:00 AM to 01:00 PM. Punctual attendance is requested.',
    'parents', NULL, 0, 'published', 'Prof. Nasreen Akhtar (Principal)', '2026-10-10 10:00:00'
);
