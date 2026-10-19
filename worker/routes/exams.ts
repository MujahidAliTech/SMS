// ============================================================================
// Exams, Marks Entry, Grading, Result Publication & Report Cards Route Handlers
// Multi-Tenant School Management SaaS (TaleemCloud)
// ============================================================================

import { Env, AuthUser } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';
import { getTeacherAssignedClasses, getParentIdForUser, getStudentIdForUser } from './students';

export type ExamTerm = 'First Term' | 'Mid Term' | 'Pre-Board' | 'Final Term' | 'Monthly Test';
export type ExamStatus = 'upcoming' | 'ongoing' | 'completed' | 'announced' | 'draft';
export type PublicationStatus = 'draft' | 'submitted' | 'approved' | 'published';
export type MarksStatus = 'present' | 'absent' | 'exempt';

const VALID_TERMS: ExamTerm[] = ['First Term', 'Mid Term', 'Pre-Board', 'Final Term', 'Monthly Test'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Standard Pakistani BISE / Board Grading Scale
export function calculateGrade(percentage: number): { grade: string; remarks: string; gpa: number } {
  const p = Math.round(percentage * 100) / 100;
  if (p >= 80) return { grade: 'A+', remarks: 'Exceptional Performance', gpa: 4.0 };
  if (p >= 70) return { grade: 'A', remarks: 'Excellent Performance', gpa: 3.7 };
  if (p >= 60) return { grade: 'B', remarks: 'Very Good Performance', gpa: 3.0 };
  if (p >= 50) return { grade: 'C', remarks: 'Good Standing', gpa: 2.5 };
  if (p >= 40) return { grade: 'D', remarks: 'Fair Performance', gpa: 2.0 };
  if (p >= 33) return { grade: 'E', remarks: 'Satisfactory / Pass', gpa: 1.0 };
  return { grade: 'F', remarks: 'Needs Improvement / Fail', gpa: 0.0 };
}

/**
 * Resolves all student IDs linked to a parent user
 */
async function getParentChildrenIds(env: Env, tenantId: string, user: AuthUser): Promise<Set<string>> {
  const childrenSet = new Set<string>();
  const parentId = await getParentIdForUser(env, tenantId, user);
  if (!parentId) return childrenSet;

  const rows = await env.DB.prepare(`
    SELECT id FROM students WHERE tenant_id = ? AND parent_id = ?
  `).bind(tenantId, parentId).all<{ id: string }>();

  for (const r of rows.results) {
    childrenSet.add(r.id);
  }
  return childrenSet;
}

/**
 * Immutable audit log writer for exam operations
 */
async function logExamAudit(
  env: Env,
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  user: AuthUser,
  reason?: string
) {
  try {
    const auditId = `ea-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await env.DB.prepare(`
      INSERT INTO exam_audit_logs (
        id, tenant_id, action, entity_type, entity_id, details_json,
        performed_by_user_id, performed_by_user_name, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      auditId,
      tenantId,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      user.id,
      user.name,
      reason || null
    ).run();
  } catch (err) {
    console.error('Failed to log exam audit:', err);
  }
}

// ============================================================================
// 1. EXAMS CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/exams
 * List exams for the tenant.
 * Parents and Students see only published exams.
 * Teachers, Principals, Admins see all tenant exams.
 */
export async function handleGetExams(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  if (auth.user.role === 'accountant') {
    return errorResponse('Access denied: Accountants do not have access to academic exams and marks', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const session = url.searchParams.get('session');
  const term = url.searchParams.get('term');
  const userRole = auth.user.role;

  let query = `SELECT * FROM exams WHERE tenant_id = ?`;
  const params: unknown[] = [scopedTenantId];

  // Parents and students can ONLY see published exams
  if (userRole === 'parent' || userRole === 'student') {
    query += ` AND (publication_status = 'published' OR status = 'announced')`;
  }

  if (session && session !== 'all') {
    query += ` AND (session = ? OR academic_session = ?)`;
    params.push(session, session);
  }
  if (term && term !== 'all') {
    query += ` AND term = ?`;
    params.push(term);
  }

  query += ` ORDER BY start_date DESC, created_at DESC`;

  const rows = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    tenant_id: string;
    title: string;
    session: string;
    academic_session: string | null;
    term: string;
    start_date: string;
    end_date: string;
    status: string;
    publication_status: string;
    created_at: string;
    updated_at: string;
  }>();

  return jsonResponse(rows.results.map(r => ({
    id: r.id,
    tenantId: r.tenant_id,
    title: r.title,
    session: r.academic_session || r.session || '2026-2027',
    term: r.term,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    publicationStatus: r.publication_status || 'draft',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  })), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/exams
 * Create a new examination schedule (school_admin, super_admin).
 */
export async function handleCreateExam(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    title?: string;
    session?: string;
    term?: ExamTerm;
    startDate?: string;
    endDate?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const title = body.title?.trim();
  if (!title || title.length < 3) return errorResponse('Valid exam title (minimum 3 characters) is required', 400);

  const session = body.session?.trim() || '2026-2027';
  const term = body.term || 'Mid Term';
  if (!VALID_TERMS.includes(term)) {
    return errorResponse(`Invalid term. Allowed terms: ${VALID_TERMS.join(', ')}`, 400);
  }

  if (!body.startDate || !DATE_REGEX.test(body.startDate)) {
    return errorResponse('Valid startDate (YYYY-MM-DD) is required', 400);
  }
  if (!body.endDate || !DATE_REGEX.test(body.endDate)) {
    return errorResponse('Valid endDate (YYYY-MM-DD) is required', 400);
  }
  if (body.endDate < body.startDate) {
    return errorResponse('endDate cannot be earlier than startDate', 400);
  }

  const examId = `exam-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await env.DB.prepare(`
    INSERT INTO exams (
      id, tenant_id, title, session, academic_session, term, start_date, end_date,
      status, publication_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', 'draft', datetime('now'), datetime('now'))
  `).bind(
    examId,
    scopedTenantId,
    title,
    session,
    session,
    term,
    body.startDate,
    body.endDate
  ).run();

  await logExamAudit(env, scopedTenantId, 'EXAM_CREATED', 'exam', examId, {
    title,
    session,
    term,
    startDate: body.startDate,
    endDate: body.endDate
  }, auth.user);

  return jsonResponse({
    id: examId,
    tenantId: scopedTenantId,
    title,
    session,
    term,
    startDate: body.startDate,
    endDate: body.endDate,
    status: 'upcoming',
    publicationStatus: 'draft'
  }, 201, {}, scopedTenantId);
}

/**
 * PUT /api/v1/exams/:id
 * Update examination metadata (school_admin, super_admin).
 */
export async function handleUpdateExam(examId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    title?: string;
    session?: string;
    term?: ExamTerm;
    startDate?: string;
    endDate?: string;
    status?: ExamStatus;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const existing = await env.DB.prepare(`
    SELECT * FROM exams WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(examId, scopedTenantId).first<{
    id: string;
    title: string;
    session: string;
    term: string;
    start_date: string;
    end_date: string;
    status: string;
  }>();

  if (!existing) return errorResponse('Exam not found in your school records', 404);

  const title = body.title?.trim() || existing.title;
  const session = body.session?.trim() || existing.session;
  const term = body.term || (existing.term as ExamTerm);
  const startDate = body.startDate || existing.start_date;
  const endDate = body.endDate || existing.end_date;
  const status = body.status || existing.status;

  if (endDate < startDate) {
    return errorResponse('endDate cannot be earlier than startDate', 400);
  }

  await env.DB.prepare(`
    UPDATE exams
    SET title = ?, session = ?, academic_session = ?, term = ?, start_date = ?, end_date = ?, status = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(title, session, session, term, startDate, endDate, status, examId, scopedTenantId).run();

  await logExamAudit(env, scopedTenantId, 'EXAM_UPDATED', 'exam', examId, {
    old: existing,
    new: { title, session, term, startDate, endDate, status }
  }, auth.user);

  return jsonResponse({
    id: examId,
    tenantId: scopedTenantId,
    title,
    session,
    term,
    startDate,
    endDate,
    status
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 2. SUBJECTS CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/exams/subjects
 * List configured subjects for a class with max marks and passing marks.
 */
export async function handleGetSubjects(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  if (auth.user.role === 'accountant') {
    return errorResponse('Access denied', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const classId = url.searchParams.get('classId');

  let query = `SELECT * FROM subjects WHERE tenant_id = ?`;
  const params: unknown[] = [scopedTenantId];

  if (classId && classId !== 'all') {
    query += ` AND class_id = ?`;
    params.push(classId);
  }

  query += ` ORDER BY name ASC`;
  const rows = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    tenant_id: string;
    class_id: string;
    name: string;
    code: string;
    teacher_id: string | null;
    teacher_name: string | null;
    total_marks: number;
    passing_marks: number;
    created_at: string;
  }>();

  return jsonResponse(rows.results.map(s => ({
    id: s.id,
    tenantId: s.tenant_id,
    classId: s.class_id,
    name: s.name,
    code: s.code,
    teacherId: s.teacher_id,
    teacherName: s.teacher_name,
    totalMarks: Number(s.total_marks || 100),
    passingMarks: Number(s.passing_marks || 40),
    createdAt: s.created_at
  })), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/exams/subjects
 * Configure a new subject for a class (school_admin, super_admin).
 */
export async function handleCreateSubject(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    classId?: string;
    name?: string;
    code?: string;
    teacherId?: string;
    teacherName?: string;
    totalMarks?: number;
    passingMarks?: number;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId, name, code } = body;
  if (!classId) return errorResponse('classId is required', 400);
  if (!name || name.trim().length < 2) return errorResponse('Valid subject name is required', 400);
  if (!code || code.trim().length < 1) return errorResponse('Valid subject code is required', 400);

  const totalMarks = Math.max(10, Math.floor(body.totalMarks || 100));
  const passingMarks = Math.max(1, Math.floor(body.passingMarks || Math.round(totalMarks * 0.33)));
  if (passingMarks > totalMarks) {
    return errorResponse('passingMarks cannot exceed totalMarks', 400);
  }

  const subId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await env.DB.prepare(`
    INSERT OR REPLACE INTO subjects (
      id, tenant_id, class_id, name, code, teacher_id, teacher_name,
      total_marks, passing_marks, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    subId,
    scopedTenantId,
    classId,
    name.trim(),
    code.trim().toUpperCase(),
    body.teacherId || null,
    body.teacherName || null,
    totalMarks,
    passingMarks
  ).run();

  await logExamAudit(env, scopedTenantId, 'SUBJECT_CONFIGURED', 'subject', subId, {
    classId,
    name: name.trim(),
    totalMarks,
    passingMarks
  }, auth.user);

  return jsonResponse({
    id: subId,
    tenantId: scopedTenantId,
    classId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    totalMarks,
    passingMarks
  }, 201, {}, scopedTenantId);
}

// ============================================================================
// 3. MARKS ENTRY, DRAFTING & ROSTER REGISTER
// ============================================================================

/**
 * GET /api/v1/exams/:examId/classes/:classId/roster
 * Retrieve class roster and active marks register for an examination.
 * Teachers can ONLY access classes assigned to them.
 */
export async function handleGetMarksRoster(
  examId: string,
  classId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  if (auth.user.role === 'accountant') {
    return errorResponse('Access denied: Accountants do not have access to marks registers', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // Teacher Assignment Check: Must be assigned to this class!
  if (auth.user.role === 'teacher') {
    const teacherClasses = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!teacherClasses.classIds.has(classId)) {
      return errorResponse('Access denied: You are not assigned to enter marks for this class', 403);
    }
  }

  // 1. Verify Exam exists
  const exam = await env.DB.prepare(`
    SELECT * FROM exams WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(examId, scopedTenantId).first<{ id: string; title: string; publication_status: string }>();

  if (!exam) return errorResponse('Exam not found in your school records', 404);

  // 2. Fetch class subjects
  const subjects = await env.DB.prepare(`
    SELECT * FROM subjects WHERE class_id = ? AND tenant_id = ? ORDER BY name ASC
  `).bind(classId, scopedTenantId).all<{
    id: string;
    name: string;
    code: string;
    total_marks: number;
    passing_marks: number;
    teacher_id: string | null;
  }>();

  // 3. Fetch active students in class
  const students = await env.DB.prepare(`
    SELECT id, name, roll_no, admission_no, class_id, class_name, section_name
    FROM students
    WHERE class_id = ? AND tenant_id = ? AND status = 'active'
    ORDER BY roll_no ASC, name ASC
  `).bind(classId, scopedTenantId).all<{
    id: string;
    name: string;
    roll_no: string;
    admission_no: string;
    class_id: string;
    class_name: string;
    section_name: string;
  }>();

  // 4. Fetch existing results & subject marks
  const existingResults = await env.DB.prepare(`
    SELECT * FROM student_results WHERE exam_id = ? AND class_id = ? AND tenant_id = ?
  `).bind(examId, classId, scopedTenantId).all<{
    id: string;
    student_id: string;
    total_marks: number;
    total_obtained: number;
    percentage: number;
    grade: string;
    status: string;
    publication_status: string;
    teacher_remarks: string | null;
  }>();

  const resultMap = new Map<string, typeof existingResults.results[0]>();
  for (const r of existingResults.results) {
    resultMap.set(r.student_id, r);
  }

  // Fetch all subject marks for these results
  const resultIds = existingResults.results.map(r => r.id);
  const subjectMarksList: any[] = [];
  if (resultIds.length > 0) {
    const placeholders = resultIds.map(() => '?').join(',');
    const marksRows = await env.DB.prepare(`
      SELECT * FROM result_subject_marks WHERE result_id IN (${placeholders})
    `).bind(...resultIds).all<{
      id: string;
      result_id: string;
      subject_id: string;
      subject_name: string;
      total_marks: number;
      obtained_marks: number;
      passing_marks: number;
      grade: string;
      marks_status: string;
      is_absent: number;
      is_exempt: number;
      remarks: string | null;
    }>();
    subjectMarksList.push(...marksRows.results);
  }

  const marksByResult = new Map<string, any[]>();
  for (const m of subjectMarksList) {
    if (!marksByResult.has(m.result_id)) marksByResult.set(m.result_id, []);
    marksByResult.get(m.result_id)!.push({
      subjectId: m.subject_id,
      subjectName: m.subject_name,
      totalMarks: Number(m.total_marks),
      obtainedMarks: Number(m.obtained_marks),
      passingMarks: Number(m.passing_marks),
      grade: m.grade,
      marksStatus: m.marks_status || (m.is_absent ? 'absent' : (m.is_exempt ? 'exempt' : 'present')),
      remarks: m.remarks
    });
  }

  const roster = students.results.map(st => {
    const res = resultMap.get(st.id);
    return {
      student: {
        id: st.id,
        name: st.name,
        rollNo: st.roll_no,
        admissionNo: st.admission_no,
        sectionName: st.section_name
      },
      resultId: res?.id || null,
      publicationStatus: res?.publication_status || 'draft',
      totalMarks: res ? Number(res.total_marks) : 0,
      totalObtained: res ? Number(res.total_obtained) : 0,
      percentage: res ? Number(res.percentage) : 0,
      grade: res?.grade || '—',
      status: res?.status || 'pending',
      teacherRemarks: res?.teacher_remarks || '',
      subjectMarks: res ? (marksByResult.get(res.id) || []) : []
    };
  });

  return jsonResponse({
    exam: {
      id: exam.id,
      title: exam.title,
      publicationStatus: exam.publication_status
    },
    classId,
    subjects: subjects.results.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      totalMarks: Number(s.total_marks),
      passingMarks: Number(s.passing_marks)
    })),
    roster
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/exams/:examId/marks
 * Enter or update draft marks for students in a class.
 * Teachers can only enter marks for assigned classes.
 * Enforces negative/over-max bounds and deterministic grading.
 */
export async function handleSaveMarks(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['teacher', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    classId?: string;
    studentMarks?: Array<{
      studentId: string;
      subjects: Array<{
        subjectId: string;
        obtainedMarks: number;
        marksStatus?: MarksStatus; // 'present' | 'absent' | 'exempt'
        remarks?: string;
      }>;
      teacherRemarks?: string;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId, studentMarks } = body;
  if (!classId) return errorResponse('classId is required', 400);
  if (!Array.isArray(studentMarks) || studentMarks.length === 0) {
    return errorResponse('studentMarks array is required', 400);
  }

  // Teacher Authorization Check
  if (auth.user.role === 'teacher') {
    const teacherClasses = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!teacherClasses.classIds.has(classId)) {
      return errorResponse('Access denied: You are not assigned to enter marks for this class', 403);
    }
  }

  // Fetch Exam
  const exam = await env.DB.prepare(`
    SELECT * FROM exams WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(examId, scopedTenantId).first<{ id: string; title: string; publication_status: string }>();

  if (!exam) return errorResponse('Exam not found in your school records', 404);

  // If already published, require the formal result correction endpoint
  if (auth.user.role === 'teacher') {
    if (exam.publication_status === 'published') {
      return errorResponse('Cannot directly edit marks for published exams. Contact the Principal for an authorized correction.', 403);
    }
    const publishedCheck = await env.DB.prepare(`
      SELECT count(*) as c FROM student_results
      WHERE exam_id = ? AND class_id = ? AND tenant_id = ? AND publication_status = 'published'
    `).bind(examId, classId, scopedTenantId).first<{ c: number }>();
    if (publishedCheck && publishedCheck.c > 0) {
      return errorResponse('Cannot directly edit marks for published results. Contact the Principal for an authorized correction.', 403);
    }
  }

  // Fetch Class Subjects
  const subjectsRows = await env.DB.prepare(`
    SELECT * FROM subjects WHERE class_id = ? AND tenant_id = ?
  `).bind(classId, scopedTenantId).all<{
    id: string;
    name: string;
    code: string;
    total_marks: number;
    passing_marks: number;
  }>();

  const subjectMap = new Map<string, typeof subjectsRows.results[0]>();
  for (const s of subjectsRows.results) {
    subjectMap.set(s.id, s);
  }

  // Fetch Class
  const classRow = await env.DB.prepare(`
    SELECT id, name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(classId, scopedTenantId).first<{ id: string; name: string }>();

  if (!classRow) return errorResponse('Class not found', 404);

  let processedCount = 0;

  // Process marks per student
  for (const entry of studentMarks) {
    const student = await env.DB.prepare(`
      SELECT id, name, roll_no FROM students WHERE id = ? AND class_id = ? AND tenant_id = ? LIMIT 1
    `).bind(entry.studentId, classId, scopedTenantId).first<{ id: string; name: string; roll_no: string }>();

    if (!student) continue;

    let totalMaxMarks = 0;
    let totalObtainedMarks = 0;
    let hasFail = false;
    const computedSubjectMarks: Array<{
      subjectId: string;
      subjectName: string;
      totalMarks: number;
      obtainedMarks: number;
      passingMarks: number;
      grade: string;
      marksStatus: MarksStatus;
      isAbsent: boolean;
      isExempt: boolean;
      remarks?: string;
    }> = [];

    for (const subEntry of entry.subjects) {
      const subject = subjectMap.get(subEntry.subjectId);
      if (!subject) continue;

      const marksStatus: MarksStatus = subEntry.marksStatus || 'present';
      const maxMarks = Number(subject.total_marks);
      const passMarks = Number(subject.passing_marks);

      // BOUNDS VALIDATION: Reject negative marks or marks exceeding maximum
      if (marksStatus === 'present') {
        if (typeof subEntry.obtainedMarks !== 'number' || isNaN(subEntry.obtainedMarks)) {
          return errorResponse(`Invalid numerical marks for ${subject.name} on student ${student.name}`, 400);
        }
        if (subEntry.obtainedMarks < 0) {
          return errorResponse(`Obtained marks cannot be negative for ${subject.name} (${subEntry.obtainedMarks})`, 400);
        }
        if (subEntry.obtainedMarks > maxMarks) {
          return errorResponse(`Obtained marks (${subEntry.obtainedMarks}) exceed maximum marks (${maxMarks}) for ${subject.name}`, 400);
        }
      }

      let cleanObtained = 0;
      let subjectGrade = 'F';

      if (marksStatus === 'absent') {
        cleanObtained = 0;
        subjectGrade = 'F';
        hasFail = true;
        totalMaxMarks += maxMarks; // Absent counts towards max marks in BISE policy
      } else if (marksStatus === 'exempt') {
        cleanObtained = 0;
        subjectGrade = 'EXEMPT';
        // Exempt is excluded from both totalMaxMarks and totalObtainedMarks
      } else {
        cleanObtained = Math.round(subEntry.obtainedMarks * 100) / 100;
        const subPct = maxMarks > 0 ? (cleanObtained / maxMarks) * 100 : 0;
        subjectGrade = calculateGrade(subPct).grade;
        if (cleanObtained < passMarks) {
          hasFail = true;
        }
        totalMaxMarks += maxMarks;
        totalObtainedMarks += cleanObtained;
      }

      computedSubjectMarks.push({
        subjectId: subject.id,
        subjectName: subject.name,
        totalMarks: maxMarks,
        obtainedMarks: cleanObtained,
        passingMarks: passMarks,
        grade: subjectGrade,
        marksStatus,
        isAbsent: marksStatus === 'absent',
        isExempt: marksStatus === 'exempt',
        remarks: subEntry.remarks
      });
    }

    const overallPercentage = totalMaxMarks > 0
      ? Math.round((totalObtainedMarks / totalMaxMarks) * 10000) / 100
      : 0;

    const overallGrade = hasFail ? 'F' : calculateGrade(overallPercentage).grade;
    const finalStatus: 'pass' | 'fail' = (hasFail || overallPercentage < 33) ? 'fail' : 'pass';

    // Find or create student_results row
    let resultRow = await env.DB.prepare(`
      SELECT id FROM student_results WHERE exam_id = ? AND student_id = ? AND tenant_id = ? LIMIT 1
    `).bind(examId, student.id, scopedTenantId).first<{ id: string }>();

    const resultId = resultRow?.id || `res-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    if (!resultRow) {
      await env.DB.prepare(`
        INSERT INTO student_results (
          id, tenant_id, exam_id, exam_title, student_id, student_name, roll_no,
          class_id, class_name, total_marks, total_obtained, percentage, grade,
          status, teacher_remarks, publication_status, submitted_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))
      `).bind(
        resultId,
        scopedTenantId,
        examId,
        exam.title,
        student.id,
        student.name,
        student.roll_no,
        classRow.id,
        classRow.name,
        totalMaxMarks,
        totalObtainedMarks,
        overallPercentage,
        overallGrade,
        finalStatus,
        entry.teacherRemarks?.trim() || null,
        auth.user.name
      ).run();
    } else {
      await env.DB.prepare(`
        UPDATE student_results
        SET total_marks = ?, total_obtained = ?, percentage = ?, grade = ?,
            status = ?, teacher_remarks = ?, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(
        totalMaxMarks,
        totalObtainedMarks,
        overallPercentage,
        overallGrade,
        finalStatus,
        entry.teacherRemarks?.trim() || null,
        resultId,
        scopedTenantId
      ).run();
    }

    // Insert or replace subject marks with UNIQUE(result_id, subject_id)
    for (const sm of computedSubjectMarks) {
      const markRowId = `rsm-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      await env.DB.prepare(`
        INSERT INTO result_subject_marks (
          id, tenant_id, result_id, subject_id, subject_name,
          total_marks, obtained_marks, passing_marks, grade, remarks,
          marks_status, is_absent, is_exempt, entered_by_teacher_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(result_id, subject_id) DO UPDATE SET
          total_marks = excluded.total_marks,
          obtained_marks = excluded.obtained_marks,
          passing_marks = excluded.passing_marks,
          grade = excluded.grade,
          remarks = excluded.remarks,
          marks_status = excluded.marks_status,
          is_absent = excluded.is_absent,
          is_exempt = excluded.is_exempt,
          entered_by_teacher_id = excluded.entered_by_teacher_id
      `).bind(
        markRowId,
        scopedTenantId,
        resultId,
        sm.subjectId,
        sm.subjectName,
        sm.totalMarks,
        sm.obtainedMarks,
        sm.passingMarks,
        sm.grade,
        sm.remarks || null,
        sm.marksStatus,
        sm.isAbsent ? 1 : 0,
        sm.isExempt ? 1 : 0,
        auth.user.id
      ).run();
    }

    processedCount++;
  }

  await logExamAudit(env, scopedTenantId, 'MARKS_SAVED', 'exam', examId, {
    classId,
    className: classRow.name,
    processedCount
  }, auth.user);

  return jsonResponse({
    message: `Marks register updated for ${processedCount} students. Status: Draft.`,
    processedCount,
    classId,
    examId
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 4. REVIEW, APPROVAL & PUBLICATION WORKFLOW
// ============================================================================

/**
 * POST /api/v1/exams/:examId/submit
 * Teacher or Admin submits drafted marks for class review.
 */
export async function handleSubmitResultsForReview(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['teacher', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: { tenantId?: string; classId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId } = body;
  if (!classId) return errorResponse('classId is required for submission', 400);

  // If teacher, verify assigned class
  if (auth.user.role === 'teacher') {
    const teacherClasses = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!teacherClasses.classIds.has(classId)) {
      return errorResponse('Access denied: You are not assigned to submit results for this class', 403);
    }
  }

  const updateRes = await env.DB.prepare(`
    UPDATE student_results
    SET publication_status = 'submitted', submitted_by = ?, updated_at = datetime('now')
    WHERE exam_id = ? AND class_id = ? AND tenant_id = ? AND publication_status = 'draft'
  `).bind(auth.user.name, examId, classId, scopedTenantId).run();

  await logExamAudit(env, scopedTenantId, 'MARKS_SUBMITTED_FOR_REVIEW', 'class', classId, {
    examId,
    submittedBy: auth.user.name,
    recordsCount: updateRes.meta?.changes || 0
  }, auth.user);

  return jsonResponse({
    message: `Results for class submitted to Principal for review and approval.`,
    submittedCount: updateRes.meta?.changes || 0
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/exams/:examId/approve
 * Principal or School Admin approves submitted marks for publication.
 */
export async function handleApproveResults(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['principal', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: { tenantId?: string; classId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId } = body;

  let query = `
    UPDATE student_results
    SET publication_status = 'approved', approved_by = ?, updated_at = datetime('now')
    WHERE exam_id = ? AND tenant_id = ? AND publication_status IN ('draft', 'submitted')
  `;
  const params: unknown[] = [auth.user.name, examId, scopedTenantId];

  if (classId) {
    query += ` AND class_id = ?`;
    params.push(classId);
  }

  const updateRes = await env.DB.prepare(query).bind(...params).run();

  await logExamAudit(env, scopedTenantId, 'MARKS_APPROVED', 'exam', examId, {
    classId: classId || 'all',
    approvedBy: auth.user.name,
    approvedCount: updateRes.meta?.changes || 0
  }, auth.user, body.reason);

  return jsonResponse({
    message: `Examination results approved by Principal. Ready for public release.`,
    approvedCount: updateRes.meta?.changes || 0
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/exams/:examId/publish
 * Principal or School Admin officially publishes approved results to parents and students.
 */
export async function handlePublishResults(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['principal', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: { tenantId?: string; classId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId } = body;

  // Verify that results exist and are not empty
  let checkQuery = `SELECT count(*) as c FROM student_results WHERE exam_id = ? AND tenant_id = ?`;
  const checkParams: unknown[] = [examId, scopedTenantId];
  if (classId) {
    checkQuery += ` AND class_id = ?`;
    checkParams.push(classId);
  }

  const countRow = await env.DB.prepare(checkQuery).bind(...checkParams).first<{ c: number }>();
  if (!countRow || countRow.c === 0) {
    return errorResponse('Cannot publish results: No student marks records exist for this examination', 400);
  }

  // Enforce workflow: results must be approved before publication
  let unapprovedQuery = `
    SELECT count(*) as c FROM student_results
    WHERE exam_id = ? AND tenant_id = ? AND publication_status IN ('draft', 'submitted')
  `;
  const unapprovedParams: unknown[] = [examId, scopedTenantId];
  if (classId) {
    unapprovedQuery += ` AND class_id = ?`;
    unapprovedParams.push(classId);
  }

  const unapprovedRow = await env.DB.prepare(unapprovedQuery).bind(...unapprovedParams).first<{ c: number }>();
  if (unapprovedRow && unapprovedRow.c > 0) {
    return errorResponse(
      `Cannot publish results: ${unapprovedRow.c} results have not been formally approved yet. Please review and approve results first.`,
      400
    );
  }

  // Publish student_results
  let pubQuery = `
    UPDATE student_results
    SET publication_status = 'published', published_at = datetime('now'), published_by = ?, updated_at = datetime('now')
    WHERE exam_id = ? AND tenant_id = ?
  `;
  const pubParams: unknown[] = [auth.user.name, examId, scopedTenantId];

  if (classId) {
    pubQuery += ` AND class_id = ?`;
    pubParams.push(classId);
  }

  const pubRes = await env.DB.prepare(pubQuery).bind(...pubParams).run();

  // Mark exam as published & announced
  await env.DB.prepare(`
    UPDATE exams
    SET publication_status = 'published', status = 'announced', updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(examId, scopedTenantId).run();

  await logExamAudit(env, scopedTenantId, 'RESULTS_PUBLISHED', 'exam', examId, {
    classId: classId || 'all',
    publishedBy: auth.user.name,
    count: pubRes.meta?.changes || 0
  }, auth.user);

  return jsonResponse({
    message: `Academic results officially published. Student report cards are now accessible to students and parents.`,
    publishedCount: pubRes.meta?.changes || 0
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/exams/:examId/unpublish
 * Unpublish results in case of school administrative review.
 */
export async function handleUnpublishResults(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['principal', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: { tenantId?: string; classId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  if (!body.reason || body.reason.trim().length < 5) {
    return errorResponse('Mandatory administrative reason (min 5 chars) is required to unpublish results', 400);
  }

  let unpubQuery = `
    UPDATE student_results
    SET publication_status = 'approved', updated_at = datetime('now')
    WHERE exam_id = ? AND tenant_id = ? AND publication_status = 'published'
  `;
  const unpubParams: unknown[] = [examId, scopedTenantId];

  if (body.classId) {
    unpubQuery += ` AND class_id = ?`;
    unpubParams.push(body.classId);
  }

  const unpubRes = await env.DB.prepare(unpubQuery).bind(...unpubParams).run();

  await logExamAudit(env, scopedTenantId, 'RESULTS_UNPUBLISHED', 'exam', examId, {
    classId: body.classId || 'all',
    unpublishReason: body.reason.trim(),
    count: unpubRes.meta?.changes || 0
  }, auth.user, body.reason.trim());

  return jsonResponse({
    message: `Results unpublished and withdrawn from public view.`,
    count: unpubRes.meta?.changes || 0
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 5. RESULTS RETRIEVAL & REPORT CARDS
// ============================================================================

/**
 * GET /api/v1/exams/:examId/results
 * List student results.
 * Parents: linked children only, published only.
 * Students: self only, published only.
 * Teachers: assigned classes only.
 * Accountants: 403 Forbidden.
 */
export async function handleGetResults(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const userRole = auth.user.role;
  if (userRole === 'accountant') {
    return errorResponse('Access denied: Accountants do not have authorization for exam results', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const classId = url.searchParams.get('classId');
  const studentId = url.searchParams.get('studentId');

  let query = `SELECT * FROM student_results WHERE exam_id = ? AND tenant_id = ?`;
  const params: unknown[] = [examId, scopedTenantId];

  // PARENT AUTHORIZATION
  if (userRole === 'parent') {
    const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
    if (childIds.size === 0) {
      return jsonResponse([], 200, {}, scopedTenantId);
    }
    const placeholders = Array.from(childIds).map(() => '?').join(',');
    query += ` AND student_id IN (${placeholders}) AND publication_status = 'published'`;
    params.push(...Array.from(childIds));
  }
  // STUDENT AUTHORIZATION
  else if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (!myStudentId) {
      return errorResponse('Student account not linked to an active student record in school database', 403);
    }
    query += ` AND student_id = ? AND publication_status = 'published'`;
    params.push(myStudentId);
  }
  // TEACHER AUTHORIZATION
  else if (userRole === 'teacher') {
    const teacherClasses = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (classId) {
      if (!teacherClasses.classIds.has(classId)) {
        return errorResponse('Access denied: You are not assigned to this class', 403);
      }
      query += ` AND class_id = ?`;
      params.push(classId);
    } else {
      if (teacherClasses.classIds.size === 0) {
        return jsonResponse([], 200, {}, scopedTenantId);
      }
      const placeholders = Array.from(teacherClasses.classIds).map(() => '?').join(',');
      query += ` AND class_id IN (${placeholders})`;
      params.push(...Array.from(teacherClasses.classIds));
    }
  }
  // ADMIN / PRINCIPAL
  else {
    if (classId && classId !== 'all') {
      query += ` AND class_id = ?`;
      params.push(classId);
    }
    if (studentId) {
      query += ` AND student_id = ?`;
      params.push(studentId);
    }
  }

  query += ` ORDER BY class_name ASC, total_obtained DESC, roll_no ASC`;

  const resultsRows = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    tenant_id: string;
    exam_id: string;
    exam_title: string;
    student_id: string;
    student_name: string;
    roll_no: string;
    class_id: string;
    class_name: string;
    total_marks: number;
    total_obtained: number;
    percentage: number;
    grade: string;
    position_in_class: number | null;
    status: string;
    teacher_remarks: string | null;
    publication_status: string;
    published_at: string | null;
  }>();

  // If results exist, fetch subject marks for them
  const resultIds = resultsRows.results.map(r => r.id);
  const marksMap = new Map<string, any[]>();

  if (resultIds.length > 0) {
    const placeholders = resultIds.map(() => '?').join(',');
    const marks = await env.DB.prepare(`
      SELECT * FROM result_subject_marks WHERE result_id IN (${placeholders})
    `).bind(...resultIds).all<{
      result_id: string;
      subject_id: string;
      subject_name: string;
      total_marks: number;
      obtained_marks: number;
      passing_marks: number;
      grade: string;
      marks_status: string;
      is_absent: number;
      is_exempt: number;
      remarks: string | null;
    }>();

    for (const m of marks.results) {
      if (!marksMap.has(m.result_id)) marksMap.set(m.result_id, []);
      marksMap.get(m.result_id)!.push({
        subjectId: m.subject_id,
        subjectName: m.subject_name,
        totalMarks: Number(m.total_marks),
        obtainedMarks: Number(m.obtained_marks),
        passingMarks: Number(m.passing_marks),
        grade: m.grade,
        marksStatus: m.marks_status || (m.is_absent ? 'absent' : (m.is_exempt ? 'exempt' : 'present')),
        remarks: m.remarks
      });
    }
  }

  return jsonResponse(resultsRows.results.map(r => ({
    id: r.id,
    tenantId: r.tenant_id,
    examId: r.exam_id,
    examTitle: r.exam_title,
    studentId: r.student_id,
    studentName: r.student_name,
    rollNo: r.roll_no,
    classId: r.class_id,
    className: r.class_name,
    totalMarks: Number(r.total_marks),
    totalObtained: Number(r.total_obtained),
    percentage: Number(r.percentage),
    grade: r.grade,
    positionInClass: r.position_in_class || undefined,
    status: r.status,
    teacherRemarks: r.teacher_remarks || '',
    publicationStatus: r.publication_status,
    publishedAt: r.published_at || undefined,
    subjectsMarks: marksMap.get(r.id) || []
  })), 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/exams/:examId/students/:studentId/report-card
 * Full detailed report card for printing & official transcripts.
 * Enforces strict parent/student isolation and draft protection.
 */
export async function handleGetReportCard(
  examId: string,
  studentId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const userRole = auth.user.role;
  if (userRole === 'accountant') {
    return errorResponse('Access denied: Accountants do not have access to report cards', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Parent authorization: ONLY linked children
  if (userRole === 'parent') {
    const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
    if (!childIds.has(studentId)) {
      return errorResponse('Access denied: You are not authorized to view this student\'s report card', 403);
    }
  }

  // 2. Student authorization: ONLY self
  if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (myStudentId !== studentId) {
      return errorResponse('Access denied: You can only access your own report card', 403);
    }
  }

  // 3. Fetch Student Result
  const result = await env.DB.prepare(`
    SELECT * FROM student_results
    WHERE exam_id = ? AND student_id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(examId, studentId, scopedTenantId).first<{
    id: string;
    tenant_id: string;
    exam_id: string;
    exam_title: string;
    student_id: string;
    student_name: string;
    roll_no: string;
    class_id: string;
    class_name: string;
    total_marks: number;
    total_obtained: number;
    percentage: number;
    grade: string;
    position_in_class: number | null;
    status: string;
    teacher_remarks: string | null;
    publication_status: string;
    published_at: string | null;
  }>();

  if (!result) return errorResponse('Examination result record not found', 404);

  // Draft protection: Parents and students cannot view unpublished results!
  if ((userRole === 'parent' || userRole === 'student') && result.publication_status !== 'published') {
    return errorResponse('This report card is pending official publication by the school principal', 403);
  }

  // Teacher authorization check
  if (userRole === 'teacher') {
    const teacherClasses = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!teacherClasses.classIds.has(result.class_id)) {
      return errorResponse('Access denied: You are not assigned to this student\'s class', 403);
    }
  }

  // 4. Fetch Student demographic details
  const student = await env.DB.prepare(`
    SELECT id, name, admission_no, roll_no, father_name, class_name, section_name, b_form_or_cnic, dob
    FROM students WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(studentId, scopedTenantId).first<{
    id: string;
    name: string;
    admission_no: string;
    roll_no: string;
    father_name: string;
    class_name: string;
    section_name: string;
    b_form_or_cnic: string;
    dob: string;
  }>();

  // 5. Fetch Subject marks
  const subjectMarks = await env.DB.prepare(`
    SELECT * FROM result_subject_marks WHERE result_id = ? ORDER BY subject_name ASC
  `).bind(result.id).all<{
    subject_id: string;
    subject_name: string;
    total_marks: number;
    obtained_marks: number;
    passing_marks: number;
    grade: string;
    marks_status: string;
    is_absent: number;
    is_exempt: number;
    remarks: string | null;
  }>();

  // 6. Fetch School Branding
  const tenant = await env.DB.prepare(`
    SELECT id, name, branding_school_name, branding_address, branding_phone, branding_email,
           branding_affiliation_board, branding_logo_url
    FROM tenants WHERE id = ? LIMIT 1
  `).bind(scopedTenantId).first<{
    id: string;
    name: string;
    branding_school_name?: string;
    branding_address?: string;
    branding_phone?: string;
    branding_email?: string;
    branding_affiliation_board?: string;
    branding_logo_url?: string;
  }>();

  const mappedSubjects = subjectMarks.results.map(m => ({
    subjectId: m.subject_id,
    subjectName: m.subject_name,
    totalMarks: Number(m.total_marks),
    obtainedMarks: Number(m.obtained_marks),
    passingMarks: Number(m.passing_marks),
    grade: m.grade,
    marksStatus: m.marks_status || (m.is_absent ? 'absent' : (m.is_exempt ? 'exempt' : 'present')),
    remarks: m.remarks
  }));

  return jsonResponse({
    result: {
      id: result.id,
      examId: result.exam_id,
      examTitle: result.exam_title,
      totalMarks: Number(result.total_marks),
      totalObtained: Number(result.total_obtained),
      percentage: Number(result.percentage),
      grade: result.grade,
      positionInClass: result.position_in_class || undefined,
      status: result.status,
      teacherRemarks: result.teacher_remarks || 'Satisfactory academic progress.',
      publicationStatus: result.publication_status,
      publishedAt: result.published_at || undefined,
      subjectsMarks: mappedSubjects
    },
    subjectsMarks: mappedSubjects,
    student: student ? {
      id: student.id,
      name: student.name,
      fatherName: student.father_name,
      admissionNo: student.admission_no,
      rollNo: student.roll_no,
      className: student.class_name,
      sectionName: student.section_name,
      bFormOrCnic: student.b_form_or_cnic,
      dob: student.dob
    } : null,
    gradingScale: [
      { range: '80% - 100%', grade: 'A+', remarks: 'Exceptional Performance' },
      { range: '70% - 79%', grade: 'A', remarks: 'Excellent Performance' },
      { range: '60% - 69%', grade: 'B', remarks: 'Very Good' },
      { range: '50% - 59%', grade: 'C', remarks: 'Good' },
      { range: '40% - 49%', grade: 'D', remarks: 'Fair' },
      { range: '33% - 39%', grade: 'E', remarks: 'Pass' },
      { range: 'Below 33%', grade: 'F', remarks: 'Fail' }
    ],
    school: {
      name: tenant?.branding_school_name || tenant?.name || 'TaleemCloud Academy',
      address: tenant?.branding_address || 'Lahore, Pakistan',
      phone: tenant?.branding_phone || '',
      email: tenant?.branding_email || '',
      affiliationBoard: tenant?.branding_affiliation_board || 'BISE Lahore',
      logoUrl: tenant?.branding_logo_url
    }
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 6. RESULT CORRECTIONS & AUDIT LOGS
// ============================================================================

/**
 * POST /api/v1/exams/:examId/results/:resultId/correct
 * Formally correct published marks through a controlled, audited workflow.
 * Authorized: Principal, School Admin, Super Admin.
 */
export async function handleCorrectResult(
  examId: string,
  resultId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['principal', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    subjectId?: string;
    newObtainedMarks?: number;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { subjectId, newObtainedMarks, reason } = body;
  if (!subjectId) return errorResponse('subjectId is required', 400);
  if (typeof newObtainedMarks !== 'number' || newObtainedMarks < 0) {
    return errorResponse('Valid non-negative newObtainedMarks is required', 400);
  }
  if (!reason || reason.trim().length < 5) {
    return errorResponse('Mandatory justification reason (minimum 5 characters) is required for result correction', 400);
  }

  // 1. Fetch current result
  const result = await env.DB.prepare(`
    SELECT * FROM student_results WHERE id = ? AND exam_id = ? AND tenant_id = ? LIMIT 1
  `).bind(resultId, examId, scopedTenantId).first<{
    id: string;
    student_id: string;
    student_name: string;
    class_id: string;
    total_marks: number;
    total_obtained: number;
    grade: string;
  }>();

  if (!result) return errorResponse('Result record not found', 404);

  // 2. Fetch subject mark
  const currentMark = await env.DB.prepare(`
    SELECT * FROM result_subject_marks WHERE result_id = ? AND subject_id = ? LIMIT 1
  `).bind(resultId, subjectId).first<{
    id: string;
    total_marks: number;
    obtained_marks: number;
    passing_marks: number;
    grade: string;
  }>();

  if (!currentMark) return errorResponse('Subject mark record not found for this student result', 404);

  if (newObtainedMarks > currentMark.total_marks) {
    return errorResponse(`New obtained marks (${newObtainedMarks}) exceed subject maximum marks (${currentMark.total_marks})`, 400);
  }

  const oldObtained = Number(currentMark.obtained_marks);
  const oldGrade = currentMark.grade;

  const newPct = currentMark.total_marks > 0 ? (newObtainedMarks / currentMark.total_marks) * 100 : 0;
  const newGrade = calculateGrade(newPct).grade;

  // 3. Record correction audit in result_corrections
  const corrId = `corr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await env.DB.prepare(`
    INSERT INTO result_corrections (
      id, tenant_id, result_id, subject_id, exam_id, student_id,
      old_obtained_marks, new_obtained_marks, old_grade, new_grade,
      reason, corrected_by_user_id, corrected_by_user_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    corrId,
    scopedTenantId,
    resultId,
    subjectId,
    examId,
    result.student_id,
    oldObtained,
    newObtainedMarks,
    oldGrade,
    newGrade,
    reason.trim(),
    auth.user.id,
    auth.user.name
  ).run();

  // 4. Update result_subject_marks
  await env.DB.prepare(`
    UPDATE result_subject_marks
    SET obtained_marks = ?, grade = ?, marks_status = 'present', is_absent = 0
    WHERE result_id = ? AND subject_id = ?
  `).bind(newObtainedMarks, newGrade, resultId, subjectId).run();

  // 5. Recalculate student overall totals & grades
  const allMarks = await env.DB.prepare(`
    SELECT total_marks, obtained_marks, passing_marks, marks_status, is_absent, is_exempt
    FROM result_subject_marks WHERE result_id = ?
  `).bind(resultId).all<{
    total_marks: number;
    obtained_marks: number;
    passing_marks: number;
    marks_status: string;
    is_absent: number;
    is_exempt: number;
  }>();

  let totMax = 0;
  let totObt = 0;
  let hasFail = false;

  for (const m of allMarks.results) {
    if (m.is_exempt || m.marks_status === 'exempt') continue;
    totMax += Number(m.total_marks);
    totObt += Number(m.obtained_marks);
    if (m.is_absent || m.obtained_marks < m.passing_marks) {
      hasFail = true;
    }
  }

  const overallPct = totMax > 0 ? Math.round((totObt / totMax) * 10000) / 100 : 0;
  const overallGrade = hasFail ? 'F' : calculateGrade(overallPct).grade;
  const overallStatus = (hasFail || overallPct < 33) ? 'fail' : 'pass';

  await env.DB.prepare(`
    UPDATE student_results
    SET total_marks = ?, total_obtained = ?, percentage = ?, grade = ?, status = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(totMax, totObt, overallPct, overallGrade, overallStatus, resultId, scopedTenantId).run();

  await logExamAudit(env, scopedTenantId, 'RESULT_CORRECTED', 'student_result', resultId, {
    studentName: result.student_name,
    subjectId,
    oldObtained,
    newObtainedMarks,
    newOverallPercentage: overallPct,
    reason: reason.trim()
  }, auth.user, reason.trim());

  return jsonResponse({
    message: `Marks corrected successfully. Audit log registered.`,
    correctionId: corrId,
    correction: {
      id: corrId,
      resultId,
      subjectId,
      examId,
      studentId: result.student_id,
      oldObtainedMarks: oldObtained,
      newObtainedMarks,
      oldGrade,
      newGrade,
      reason: reason.trim(),
      correctedByUserId: auth.user.id,
      correctedByUserName: auth.user.name
    },
    updatedResult: {
      totalMarks: totMax,
      totalObtained: totObt,
      percentage: overallPct,
      grade: overallGrade,
      status: overallStatus
    },
    newObtainedMarks,
    newGrade,
    newTotalObtained: totObt,
    newPercentage: overallPct,
    newOverallGrade: overallGrade,
    status: overallStatus
  }, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/exams/:examId/audit-logs
 * Audit trail for all exam operations.
 */
export async function handleGetExamAuditLogs(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['principal', 'school_admin', 'super_admin']);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const logs = await env.DB.prepare(`
    SELECT * FROM exam_audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100
  `).bind(scopedTenantId).all<{
    id: string;
    tenant_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details_json: string;
    performed_by_user_id: string;
    performed_by_user_name: string;
    reason: string | null;
    created_at: string;
  }>();

  return jsonResponse(logs.results.map(l => {
    let details = {};
    try {
      details = JSON.parse(l.details_json || '{}');
    } catch {
      details = {};
    }
    return {
      id: l.id,
      tenantId: l.tenant_id,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details,
      performedByUserId: l.performed_by_user_id,
      performedByUserName: l.performed_by_user_name,
      reason: l.reason || undefined,
      createdAt: l.created_at
    };
  }), 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/exams/:examId/summary
 * Class-wise and subject-wise performance summaries.
 */
export async function handleGetExamSummary(
  examId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  if (auth.user.role === 'accountant') {
    return errorResponse('Access denied', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const classId = url.searchParams.get('classId');

  let query = `SELECT * FROM student_results WHERE exam_id = ? AND tenant_id = ?`;
  const params: unknown[] = [examId, scopedTenantId];

  if (classId && classId !== 'all') {
    query += ` AND class_id = ?`;
    params.push(classId);
  }

  const rows = await env.DB.prepare(query).bind(...params).all<{
    total_marks: number;
    total_obtained: number;
    percentage: number;
    grade: string;
    status: string;
  }>();

  let totalStudents = rows.results.length;
  let passCount = 0;
  let failCount = 0;
  let totalScore = 0;
  const gradeDistribution: Record<string, number> = {
    'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0
  };

  for (const r of rows.results) {
    if (r.status === 'pass') passCount++;
    else failCount++;

    totalScore += Number(r.percentage);
    const g = r.grade || 'F';
    gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
  }

  const averagePercentage = totalStudents > 0 ? Math.round((totalScore / totalStudents) * 100) / 100 : 0;
  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  return jsonResponse({
    examId,
    totalStudents,
    passCount,
    failCount,
    passRate,
    averagePercentage,
    gradeDistribution,
    overall: {
      totalStudents,
      passed: passCount,
      failed: failCount,
      passPercentage: passRate,
      averageScore: averagePercentage
    }
  }, 200, {}, scopedTenantId);
}
