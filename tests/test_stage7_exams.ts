// ============================================================================
// Automated Test Suite for Stage 7: Exams, Marks Entry, Grading & Report Cards
// Multi-Tenant School Management SaaS (TaleemCloud)
// ============================================================================

import { DatabaseSync } from 'node:sqlite';
import { Env, D1Database, D1PreparedStatement, D1Response } from '../worker/types';
import { sha256Hash } from '../worker/utils/crypto';
import {
  handleGetExams,
  handleCreateExam,
  handleUpdateExam,
  handleGetSubjects,
  handleCreateSubject,
  handleGetMarksRoster,
  handleSaveMarks,
  handleSubmitResultsForReview,
  handleApproveResults,
  handlePublishResults,
  handleUnpublishResults,
  handleGetResults,
  handleGetReportCard,
  handleCorrectResult,
  handleGetExamAuditLogs,
  handleGetExamSummary
} from '../worker/routes/exams';

function createTestD1(db: DatabaseSync): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      return {
        bind(...values: unknown[]) {
          const flatValues = values.map(v => (v === undefined ? null : v)) as any[];
          return {
            async first<T = unknown>(colName?: string): Promise<T | null> {
              const stmt = db.prepare(query);
              const row = stmt.get(...flatValues) as Record<string, unknown> | undefined;
              if (!row) return null;
              if (colName) return (row[colName] as T) ?? null;
              return row as unknown as T;
            },
            async all<T = unknown>(): Promise<D1Response<T>> {
              const stmt = db.prepare(query);
              const rows = stmt.all(...flatValues) as T[];
              return { results: rows, success: true, meta: { changes: 0 } };
            },
            async run<T = unknown>(): Promise<D1Response<T>> {
              const stmt = db.prepare(query);
              const info = stmt.run(...flatValues);
              return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
            },
            bind: () => this
          };
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = db.prepare(query);
          const row = stmt.get() as Record<string, unknown> | undefined;
          if (!row) return null;
          if (colName) return (row[colName] as T) ?? null;
          return row as unknown as T;
        },
        async all<T = unknown>(): Promise<D1Response<T>> {
          const stmt = db.prepare(query);
          const rows = stmt.all() as T[];
          return { results: rows, success: true, meta: { changes: 0 } };
        },
        async run<T = unknown>(): Promise<D1Response<T>> {
          const stmt = db.prepare(query);
          const info = stmt.run();
          return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
        }
      };
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Response<T>[]> {
      const results: D1Response<T>[] = [];
      for (const s of statements) {
        results.push(await s.run<T>());
      }
      return results;
    },
    async exec(query: string): Promise<{ count: number; duration: number }> {
      db.exec(query);
      return { count: 1, duration: 0 };
    }
  };
}

async function getData<T = any>(res: Response): Promise<T> {
  const json = await res.json() as any;
  return json.data !== undefined ? json.data : json;
}

async function runStage7Tests() {
  console.log('--- Starting Stage 7 Exam & Results Automated Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // Connect to actual local D1 database with full migrations
  const sqlite = new DatabaseSync('.local-d1.sqlite');
  const d1 = createTestD1(sqlite);
  const env: Env = {
    DB: d1,
    ENVIRONMENT: 'development',
    JWT_SECRET: 'test-jwt-secret-stage7'
  };

  const tenantId = 'tenant-bfs';
  const otherTenantId = 'tenant-alnoor';

  // Helper to create test session and return Authorization header
  async function createSession(userId: string, targetTenantId: string, role: string): Promise<string> {
    const rawToken = `test-token-st7-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const tokenHash = await sha256Hash(rawToken);
    const sessionId = `sess-st7-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    sqlite.prepare(`
      INSERT INTO user_sessions (id, user_id, tenant_id, role, token_hash, ip_address, user_agent, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, '127.0.0.1', 'AutomatedTest/1.0', datetime('now'), ?)
    `).run(sessionId, userId, targetTenantId, role, tokenHash, expiresAt);

    return `Bearer ${rawToken}`;
  }

  // Ensure test users exist
  const unassignedTeacherUserId = 'user-teacher-unassigned-st7';
  const unassignedStaffId = 'staff-unassigned-st7';
  sqlite.prepare(`
    INSERT OR REPLACE INTO teachers_staff (id, tenant_id, teacher_code, name, role, designation, qualification, subjects_json, assigned_classes_json, joining_date, phone, email, cnic, employment_status, salary_monthly)
    VALUES (?, ?, 'TCH-99', 'Madam Farzana', 'teacher', 'Primary Teacher', 'B.Ed', '[]', '["Class 1 (Primary)"]', '2023-01-01', '03001112233', 'farzana@test.pk', '35201-9999999-9', 'active', 40000)
  `).run(unassignedStaffId, tenantId);

  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, tenant_id, name, email, phone, role, is_active, linked_entity_id, created_at)
    VALUES (?, ?, 'Madam Farzana', 'farzana@test.pk', '03001112233', 'teacher', 1, ?, datetime('now'))
  `).run(unassignedTeacherUserId, tenantId, unassignedStaffId);

  const adminAuth = await createSession('user-admin-bfs', tenantId, 'school_admin');
  const principalAuth = await createSession('user-principal-bfs', tenantId, 'principal');
  const teacherAuth = await createSession('user-teacher-bfs', tenantId, 'teacher');
  const unassignedTeacherAuth = await createSession(unassignedTeacherUserId, tenantId, 'teacher');
  const accountantAuth = await createSession('user-accountant-bfs', tenantId, 'accountant');
  const parent1Auth = await createSession('user-parent-bfs', tenantId, 'parent');
  const student1Auth = await createSession('user-student-bfs', tenantId, 'student');
  const otherTenantAdminAuth = await createSession('user-admin-alnoor-st6', otherTenantId, 'school_admin');

  // Second parent (parent of student-3 Bilal Tariq)
  const parent2UserId = 'user-parent2-bfs';
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, tenant_id, name, email, phone, role, is_active, linked_entity_id, created_at)
    VALUES (?, ?, 'Tariq Mehmood', 'tariq.parent@test.pk', '03001234567', 'parent', 1, 'parent-2', datetime('now'))
  `).run(parent2UserId, tenantId);
  const parent2Auth = await createSession(parent2UserId, tenantId, 'parent');

  // Student 3 user (Bilal Tariq)
  const student3UserId = 'user-student3-bfs';
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, tenant_id, name, email, phone, role, is_active, linked_entity_id, created_at)
    VALUES (?, ?, 'Bilal Tariq', 'bilal.tariq@student.pk', '03007654321', 'student', 1, 'student-3', datetime('now'))
  `).run(student3UserId, tenantId);
  const student3Auth = await createSession(student3UserId, tenantId, 'student');

  function makeReq(path: string, method: string, authHeader?: string, body?: any) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    return new Request(`http://localhost:3000${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  const classId = 'class-9-matric';

  // Clean up any previous test exam records
  sqlite.prepare("DELETE FROM exams WHERE id LIKE 'exam-test-%'").run();
  sqlite.prepare("DELETE FROM student_results WHERE exam_id LIKE 'exam-test-%'").run();
  sqlite.prepare("DELETE FROM result_subject_marks WHERE result_id IN (SELECT id FROM student_results WHERE exam_id LIKE 'exam-test-%')").run();

  // ==========================================================================
  // TEST GROUP 1: EXAM CREATION, LISTING & LEAST PRIVILEGE ROLES
  // ==========================================================================
  console.log('\n--- Test Group 1: Exam Creation & Role Isolation ---');

  // 1.1 Accountant cannot view or create exams (least privilege)
  let res = await handleGetExams(makeReq('/api/v1/exams', 'GET', accountantAuth), env);
  assert(res.status === 403, 'Accountant role is rejected with 403 Forbidden on academic exams');

  // 1.2 Teacher cannot create exams
  res = await handleCreateExam(makeReq('/api/v1/exams', 'POST', teacherAuth, {
    title: 'Mid-Term Exam',
    startDate: '2026-11-01',
    endDate: '2026-11-15'
  }), env);
  assert(res.status === 403, 'Teacher cannot create exam schedules (403)');

  // 1.3 Invalid Dates validation
  res = await handleCreateExam(makeReq('/api/v1/exams', 'POST', adminAuth, {
    title: 'Invalid Date Exam',
    startDate: '2026-11-20',
    endDate: '2026-11-10' // earlier than start date
  }), env);
  assert(res.status === 400, 'Rejects exam creation when endDate is before startDate (400)');

  // 1.4 School Admin successfully creates an exam
  const examTitle = `Annual Board Assessment ${Date.now()}`;
  res = await handleCreateExam(makeReq('/api/v1/exams', 'POST', adminAuth, {
    tenantId,
    title: examTitle,
    session: '2026-2027',
    term: 'Mid Term',
    startDate: '2026-11-01',
    endDate: '2026-11-15'
  }), env);
  assert(res.status === 201, 'School Admin successfully creates Examination Schedule (201)');
  const createdExam = await getData(res);
  const examId = createdExam.id;
  assert(createdExam.publicationStatus === 'draft', 'Newly created exam default publication status is draft');
  assert(createdExam.session === '2026-2027', 'Exam session correctly stored as 2026-2027');

  // 1.5 Tenant Isolation: Other tenant cannot see this exam
  res = await handleGetExams(makeReq(`/api/v1/exams?tenantId=${otherTenantId}`, 'GET', otherTenantAdminAuth), env);
  assert(res.status === 200, 'Other tenant can list own exams');
  const otherTenantExams = await getData(res);
  assert(!otherTenantExams.some((e: any) => e.id === examId), 'Cross-tenant isolation: other tenant cannot see tenant-bfs exam');

  // ==========================================================================
  // TEST GROUP 2: CLASS MARKS ROSTER & TEACHER SCOPE VALIDATION
  // ==========================================================================
  console.log('\n--- Test Group 2: Class Marks Roster & Teacher Scope ---');

  // 2.1 Assigned Teacher (Sir Zeeshan Haider) can access Class 9 roster
  res = await handleGetMarksRoster(examId, classId, makeReq(`/api/v1/exams/${examId}/classes/${classId}/roster`, 'GET', teacherAuth), env);
  assert(res.status === 200, 'Assigned Teacher can access assigned Class 9 marks roster');
  const rosterData = await getData(res);
  assert(rosterData.roster.length >= 2, 'Roster contains students in Class 9 (Hamza Rizwan & Bilal Tariq)');
  assert(rosterData.subjects.length >= 5, 'Roster contains subjects configured for Class 9');

  // 2.2 Unassigned Teacher is denied with 403 Forbidden
  res = await handleGetMarksRoster(examId, classId, makeReq(`/api/v1/exams/${examId}/classes/${classId}/roster`, 'GET', unassignedTeacherAuth), env);
  assert(res.status === 403, 'Unassigned Teacher is denied access to Class 9 marks roster (403 Forbidden)');

  // 2.3 Principal can view any class roster
  res = await handleGetMarksRoster(examId, classId, makeReq(`/api/v1/exams/${examId}/classes/${classId}/roster`, 'GET', principalAuth), env);
  assert(res.status === 200, 'Principal can access Class 9 marks roster');

  // ==========================================================================
  // TEST GROUP 3: MARKS ENTRY, BOUNDS VALIDATION & ABSENT/EXEMPT LOGIC
  // ==========================================================================
  console.log('\n--- Test Group 3: Marks Entry, Bounds Validation & Absent/Exempt ---');

  // 3.1 Reject negative marks
  res = await handleSaveMarks(examId, makeReq(`/api/v1/exams/${examId}/marks`, 'POST', teacherAuth, {
    tenantId,
    classId,
    studentMarks: [{
      studentId: 'student-1',
      subjects: [{ subjectId: 'sub-phy-9', obtainedMarks: -5, marksStatus: 'present' }]
    }]
  }), env);
  assert(res.status === 400, 'Rejects negative marks submission with 400 Bad Request');

  // 3.2 Reject marks exceeding subject maximum (Physics max is 75)
  res = await handleSaveMarks(examId, makeReq(`/api/v1/exams/${examId}/marks`, 'POST', teacherAuth, {
    tenantId,
    classId,
    studentMarks: [{
      studentId: 'student-1',
      subjects: [{ subjectId: 'sub-phy-9', obtainedMarks: 80, marksStatus: 'present' }]
    }]
  }), env);
  assert(res.status === 400, 'Rejects marks exceeding subject maximum (80 / 75) with 400');

  // 3.3 Unassigned teacher cannot enter marks for Class 9
  res = await handleSaveMarks(examId, makeReq(`/api/v1/exams/${examId}/marks`, 'POST', unassignedTeacherAuth, {
    tenantId,
    classId,
    studentMarks: [{
      studentId: 'student-1',
      subjects: [{ subjectId: 'sub-phy-9', obtainedMarks: 65, marksStatus: 'present' }]
    }]
  }), env);
  assert(res.status === 403, 'Unassigned teacher cannot save marks for Class 9 (403)');

  // 3.4 Assigned teacher saves valid marks:
  // Student 1 (Hamza Rizwan): Physics 65/75, Math 70/75 (Total 135/150 = 90% -> Grade A+, Pass)
  // Student 3 (Bilal Tariq): Physics 15/75 (Fail < 25), Math 0/75 (Exempt)
  res = await handleSaveMarks(examId, makeReq(`/api/v1/exams/${examId}/marks`, 'POST', teacherAuth, {
    tenantId,
    classId,
    studentMarks: [
      {
        studentId: 'student-1',
        teacherRemarks: 'Brilliant conceptual grasp in science subjects',
        subjects: [
          { subjectId: 'sub-phy-9', obtainedMarks: 65, marksStatus: 'present' },
          { subjectId: 'sub-math-9', obtainedMarks: 70, marksStatus: 'present' }
        ]
      },
      {
        studentId: 'student-3',
        teacherRemarks: 'Needs reinforcement in physics basics',
        subjects: [
          { subjectId: 'sub-phy-9', obtainedMarks: 15, marksStatus: 'present' }, // Fail (<25)
          { subjectId: 'sub-math-9', obtainedMarks: 0, marksStatus: 'exempt', remarks: 'Medical Board Exemption' }
        ]
      }
    ]
  }), env);
  assert(res.status === 200, 'Assigned Teacher saves valid marks for Class 9 students');

  // 3.5 Verify Database Records for Student 1
  const s1Result = sqlite.prepare("SELECT * FROM student_results WHERE exam_id = ? AND student_id = ?").get(examId, 'student-1') as any;
  assert(s1Result !== undefined, 'Student 1 result record created in database');
  assert(s1Result.total_marks === 150, `Student 1 total marks matches 150 (actual: ${s1Result.total_marks})`);
  assert(s1Result.total_obtained === 135, `Student 1 total obtained matches 135 (actual: ${s1Result.total_obtained})`);
  assert(s1Result.percentage === 90, `Student 1 percentage is 90% (actual: ${s1Result.percentage})`);
  assert(s1Result.grade === 'A+', `Student 1 grade is A+ (actual: ${s1Result.grade})`);
  assert(s1Result.status === 'pass', `Student 1 status is pass (actual: ${s1Result.status})`);
  assert(s1Result.publication_status === 'draft', 'Initial publication status is draft');

  // 3.6 Verify Database Records for Student 3 (Fail + Exempt)
  const s3Result = sqlite.prepare("SELECT * FROM student_results WHERE exam_id = ? AND student_id = ?").get(examId, 'student-3') as any;
  assert(s3Result !== undefined, 'Student 3 result record created in database');
  assert(s3Result.total_marks === 75, `Exempt Math subject excluded from total max marks (actual: ${s3Result.total_marks})`);
  assert(s3Result.total_obtained === 15, `Student 3 obtained is 15 (actual: ${s3Result.total_obtained})`);
  assert(s3Result.grade === 'F', `Subject failure sets overall grade to F (actual: ${s3Result.grade})`);
  assert(s3Result.status === 'fail', `Subject failure sets overall status to fail (actual: ${s3Result.status})`);

  // 3.7 Verify Absent Student Handling
  res = await handleSaveMarks(examId, makeReq(`/api/v1/exams/${examId}/marks`, 'POST', teacherAuth, {
    tenantId,
    classId,
    studentMarks: [
      {
        studentId: 'student-3',
        subjects: [
          { subjectId: 'sub-phy-9', obtainedMarks: 0, marksStatus: 'absent' },
          { subjectId: 'sub-math-9', obtainedMarks: 0, marksStatus: 'exempt' }
        ]
      }
    ]
  }), env);
  assert(res.status === 200, 'Successfully updated marks with absent status');
  const s3Absent = sqlite.prepare("SELECT * FROM student_results WHERE exam_id = ? AND student_id = ?").get(examId, 'student-3') as any;
  assert(s3Absent.total_marks === 75, 'Absent subject is included in total max marks (75)');
  assert(s3Absent.total_obtained === 0, 'Absent subject contributes 0 to obtained marks');
  assert(s3Absent.status === 'fail', 'Absent subject is marked as fail');

  // ==========================================================================
  // TEST GROUP 4: REVIEW, APPROVAL & PUBLICATION WORKFLOW
  // ==========================================================================
  console.log('\n--- Test Group 4: Workflow: Draft -> Submitted -> Approved -> Published ---');

  // 4.1 Parents and Students CANNOT view draft marks
  res = await handleGetReportCard(examId, 'student-1', makeReq(`/api/v1/exams/${examId}/students/student-1/report-card`, 'GET', parent1Auth), env);
  assert(res.status === 403, 'Parent cannot access report card for unpublished draft exam (403)');

  res = await handleGetReportCard(examId, 'student-1', makeReq(`/api/v1/exams/${examId}/students/student-1/report-card`, 'GET', student1Auth), env);
  assert(res.status === 403, 'Student cannot access report card for unpublished draft exam (403)');

  // 4.2 Teacher CANNOT directly publish results
  res = await handlePublishResults(examId, makeReq(`/api/v1/exams/${examId}/publish`, 'POST', teacherAuth, {
    tenantId,
    classId
  }), env);
  assert(res.status === 403, 'Teacher cannot publish results directly (403 Forbidden)');

  // 4.3 Teacher submits results for review
  res = await handleSubmitResultsForReview(examId, makeReq(`/api/v1/exams/${examId}/submit`, 'POST', teacherAuth, {
    tenantId,
    classId
  }), env);
  assert(res.status === 200, 'Teacher submits class marks for Principal review');
  const submittedCheck = sqlite.prepare("SELECT publication_status FROM student_results WHERE exam_id = ?").all(examId) as any[];
  assert(submittedCheck.every(r => r.publication_status === 'submitted'), 'All class results transitioned to submitted');

  // 4.4 Cannot publish directly if not approved
  res = await handlePublishResults(examId, makeReq(`/api/v1/exams/${examId}/publish`, 'POST', principalAuth, {
    tenantId,
    classId
  }), env);
  assert(res.status === 400, 'Cannot publish results before formal approval (400)');

  // 4.5 Principal approves submitted results
  res = await handleApproveResults(examId, makeReq(`/api/v1/exams/${examId}/approve`, 'POST', principalAuth, {
    tenantId,
    classId
  }), env);
  assert(res.status === 200, 'Principal approves submitted results');
  const approvedCheck = sqlite.prepare("SELECT publication_status FROM student_results WHERE exam_id = ?").all(examId) as any[];
  assert(approvedCheck.every(r => r.publication_status === 'approved'), 'All class results transitioned to approved');

  // 4.6 Principal publishes approved results
  res = await handlePublishResults(examId, makeReq(`/api/v1/exams/${examId}/publish`, 'POST', principalAuth, {
    tenantId,
    classId
  }), env);
  assert(res.status === 200, 'Principal publishes approved results');
  const publishedCheck = sqlite.prepare("SELECT publication_status FROM student_results WHERE exam_id = ?").all(examId) as any[];
  assert(publishedCheck.every(r => r.publication_status === 'published'), 'All class results transitioned to published');

  // ==========================================================================
  // TEST GROUP 5: PARENT & STUDENT ACCESS, VERIFIED ISOLATION & REPORT CARDS
  // ==========================================================================
  console.log('\n--- Test Group 5: Parent & Student Access, Verified Isolation ---');

  // 5.1 Parent 1 can view published report card for their child (Student 1)
  res = await handleGetReportCard(examId, 'student-1', makeReq(`/api/v1/exams/${examId}/students/student-1/report-card`, 'GET', parent1Auth), env);
  assert(res.status === 200, 'Parent 1 can access published report card of linked child (Student 1)');
  const reportCard = await getData(res);
  assert(reportCard.student.id === 'student-1', 'Report card corresponds to Student 1 (Hamza Rizwan)');
  assert(reportCard.result.grade === 'A+', 'Report card shows verified Grade A+');
  assert(reportCard.subjectsMarks.length === 2, 'Report card contains accurate subject marks breakdown');

  // 5.2 Parent 1 CANNOT view Student 3 (unlinked child of Parent 2) -> 403 Forbidden
  res = await handleGetReportCard(examId, 'student-3', makeReq(`/api/v1/exams/${examId}/students/student-3/report-card`, 'GET', parent1Auth), env);
  assert(res.status === 403, 'Parent 1 is denied access to unlinked Student 3 report card (403 Forbidden)');

  // 5.3 Parent 2 can view Student 3
  res = await handleGetReportCard(examId, 'student-3', makeReq(`/api/v1/exams/${examId}/students/student-3/report-card`, 'GET', parent2Auth), env);
  assert(res.status === 200, 'Parent 2 can access published report card of linked child (Student 3)');

  // 5.4 Student 1 can view own report card
  res = await handleGetReportCard(examId, 'student-1', makeReq(`/api/v1/exams/${examId}/students/student-1/report-card`, 'GET', student1Auth), env);
  assert(res.status === 200, 'Student 1 can view their own published report card');

  // 5.5 Student 1 CANNOT view Student 3 report card by changing student ID in URL -> 403 Forbidden
  res = await handleGetReportCard(examId, 'student-3', makeReq(`/api/v1/exams/${examId}/students/student-3/report-card`, 'GET', student1Auth), env);
  assert(res.status === 403, 'Student 1 cannot view Student 3 report card via URL tampering (403 Forbidden)');

  // 5.6 Cross-Tenant Admin cannot view Tenant BFS report card
  res = await handleGetReportCard(examId, 'student-1', makeReq(`/api/v1/exams/${examId}/students/student-1/report-card`, 'GET', otherTenantAdminAuth), env);
  assert(res.status === 403 || res.status === 404, 'Admin from other tenant cannot view student report card (403 or 404)');

  // ==========================================================================
  // TEST GROUP 6: AUDITED RESULT CORRECTIONS
  // ==========================================================================
  console.log('\n--- Test Group 6: Audited Result Corrections on Published Results ---');

  // 6.1 Once published, teacher cannot directly overwrite marks
  res = await handleSaveMarks(examId, makeReq(`/api/v1/exams/${examId}/marks`, 'POST', teacherAuth, {
    tenantId,
    classId,
    studentMarks: [{
      studentId: 'student-1',
      subjects: [{ subjectId: 'sub-phy-9', obtainedMarks: 72, marksStatus: 'present' }]
    }]
  }), env);
  assert(res.status === 403, 'Teacher cannot directly edit published marks (requires authorized correction)');

  // 6.2 Correction without mandatory reason is rejected
  const s1ResRow = sqlite.prepare("SELECT id FROM student_results WHERE exam_id = ? AND student_id = ?").get(examId, 'student-1') as any;
  res = await handleCorrectResult(examId, s1ResRow.id, makeReq(`/api/v1/exams/${examId}/results/${s1ResRow.id}/correct`, 'POST', principalAuth, {
    tenantId,
    subjectId: 'sub-phy-9',
    newObtainedMarks: 72,
    reason: '   ' // empty reason
  }), env);
  assert(res.status === 400, 'Result correction without valid reason is rejected (400)');

  // 6.3 Principal executes audited correction: Physics from 65 to 72 (new total 142/150 = 94.67%)
  res = await handleCorrectResult(examId, s1ResRow.id, makeReq(`/api/v1/exams/${examId}/results/${s1ResRow.id}/correct`, 'POST', principalAuth, {
    tenantId,
    subjectId: 'sub-phy-9',
    newObtainedMarks: 72,
    reason: 'Recounting of paper per board rechecking application #REC-9821'
  }), env);
  assert(res.status === 200, 'Principal successfully executes authorized result correction');
  const correctionData = await getData(res);
  assert(correctionData.correction.oldObtainedMarks === 65, 'Correction recorded original marks (65)');
  assert(correctionData.correction.newObtainedMarks === 72, 'Correction recorded updated marks (72)');
  assert(correctionData.updatedResult.totalObtained === 142, `Updated total marks recalculated to 142 (actual: ${correctionData.updatedResult.totalObtained})`);
  assert(correctionData.updatedResult.percentage === 94.67, `Updated percentage recalculated to 94.67% (actual: ${correctionData.updatedResult.percentage})`);

  // 6.4 Verify Immutable Audit Log and Correction Record in DB
  const correctionInDb = sqlite.prepare("SELECT * FROM result_corrections WHERE result_id = ?").all(s1ResRow.id);
  assert(correctionInDb.length === 1, 'result_corrections table has exactly 1 immutable entry');
  assert((correctionInDb[0] as any).reason.includes('REC-9821'), 'Correction record maintains verified reason');

  // ==========================================================================
  // TEST GROUP 7: EXAM SUMMARY & AUDIT TRAIL
  // ==========================================================================
  console.log('\n--- Test Group 7: Exam Summary & Performance Reports ---');

  res = await handleGetExamSummary(examId, makeReq(`/api/v1/exams/${examId}/summary`, 'GET', principalAuth), env);
  assert(res.status === 200, 'Principal retrieves overall and class-wise exam summary');
  const summary = await getData(res);
  assert(summary.overall.totalStudents === 2, 'Summary tracks both evaluated students');
  assert(summary.overall.passed === 1 && summary.overall.failed === 1, 'Summary accurately counts 1 pass, 1 fail');
  assert(summary.overall.passPercentage === 50, 'Overall pass percentage is 50%');

  // Audit trail check
  res = await handleGetExamAuditLogs(examId, makeReq(`/api/v1/exams/${examId}/audit-logs`, 'GET', principalAuth), env);
  assert(res.status === 200, 'Principal can view complete exam audit trail');
  const logs = await getData(res);
  assert(logs.length >= 4, `Exam audit trail captures full lifecycle (actions recorded: ${logs.length})`);

  console.log(`\n======================================================`);
  console.log(`Stage 7 Automated Test Suite Summary:`);
  console.log(`Total Passed: ${passed}`);
  console.log(`Total Failed: ${failed}`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStage7Tests().catch(err => {
  console.error('Fatal error in Stage 7 tests:', err);
  process.exit(1);
});
