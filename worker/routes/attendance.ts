// ============================================================================
// Attendance Route Handlers (Tenant Scoping, Role Authorization & Audit Trail)
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env, AuthUser } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';
import { getTeacherAssignedClasses, getParentIdForUser, getStudentIdForUser } from './students';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

const VALID_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'leave'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface AttendanceDbRow {
  id: string;
  tenant_id: string;
  date: string;
  student_id: string;
  student_name: string;
  class_id: string;
  section_id: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string;
  recorded_by_user_id: string | null;
  updated_at: string | null;
}

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && dateStr === d.toISOString().split('T')[0];
}

/**
 * Format attendance database row safely
 */
function formatAttendance(row: AttendanceDbRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    date: row.date,
    studentId: row.student_id,
    studentName: row.student_name,
    classId: row.class_id,
    sectionId: row.section_id,
    status: row.status,
    remarks: row.remarks || undefined,
    recordedByUserId: row.recorded_by_user_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  };
}

/**
 * GET /api/v1/attendance
 * Retrieves class attendance for a specific date and section.
 * - School Admin & Principal: Any class in tenant
 * - Teacher: Assigned classes only
 * - Others: 403 Forbidden
 */
export async function handleGetAttendance(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const userRole = auth.user.role;
  if (!['school_admin', 'principal', 'teacher', 'super_admin'].includes(userRole)) {
    return errorResponse(`Access denied: Role '${userRole}' is not authorized to access class attendance rosters`, 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const classId = url.searchParams.get('classId');
  const sectionId = url.searchParams.get('sectionId');
  const date = url.searchParams.get('date');

  if (!classId) {
    return errorResponse('Query parameter "classId" is required', 400);
  }

  if (!date || !isValidDate(date)) {
    return errorResponse('Valid "date" parameter in YYYY-MM-DD format is required', 400);
  }

  // Teacher class assignment authorization check
  if (userRole === 'teacher') {
    const { classIds, classNames } = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!classIds.has(classId) && !classNames.has(classId)) {
      return errorResponse('Access denied: You are not assigned to view or record attendance for this academic class', 403);
    }
  }

  // 1. Fetch enrolled active students for this class/section
  let studentQuery = `
    SELECT id, name, roll_no, class_id, class_name, section_id, section_name
    FROM students
    WHERE tenant_id = ? AND class_id = ? AND status = 'active'
  `;
  const studentParams: unknown[] = [scopedTenantId, classId];

  if (sectionId && sectionId !== 'all') {
    studentQuery += ` AND section_id = ?`;
    studentParams.push(sectionId);
  }

  studentQuery += ` ORDER BY roll_no ASC, name ASC`;

  const studentsList = await env.DB.prepare(studentQuery).bind(...studentParams).all<{
    id: string;
    name: string;
    roll_no: string;
    class_id: string;
    class_name: string;
    section_id: string;
    section_name: string;
  }>();

  // 2. Fetch existing attendance records for this date
  let attQuery = `
    SELECT *
    FROM attendance_records
    WHERE tenant_id = ? AND class_id = ? AND date = ?
  `;
  const attParams: unknown[] = [scopedTenantId, classId, date];

  if (sectionId && sectionId !== 'all') {
    attQuery += ` AND section_id = ?`;
    attParams.push(sectionId);
  }

  const attResults = await env.DB.prepare(attQuery).bind(...attParams).all<AttendanceDbRow>();
  const recordsMap = new Map<string, AttendanceDbRow>();
  for (const r of attResults.results) {
    recordsMap.set(r.student_id, r);
  }

  // 3. Combine roster with existing records or default 'present'
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  const roster = studentsList.results.map(st => {
    const existing = recordsMap.get(st.id);
    const status: AttendanceStatus = existing ? existing.status : 'present';

    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'leave') leaveCount++;

    return {
      studentId: st.id,
      studentName: st.name,
      rollNo: st.roll_no,
      classId: st.class_id,
      className: st.class_name,
      sectionId: st.section_id,
      sectionName: st.section_name,
      date,
      status,
      remarks: existing?.remarks || undefined,
      recordId: existing?.id || undefined,
      isRecorded: !!existing,
      updatedAt: existing?.updated_at || existing?.created_at || undefined
    };
  });

  const totalStudents = roster.length;
  const attendanceRate = totalStudents > 0
    ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
    : 0;

  return jsonResponse({
    classId,
    sectionId: sectionId || 'all',
    date,
    totalStudents,
    presentCount,
    absentCount,
    lateCount,
    leaveCount,
    attendanceRate,
    isMarked: attResults.results.length > 0,
    roster
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/attendance/batch
 * Saves or updates daily attendance for a class roster.
 * - School Admin & Principal: Any class
 * - Teacher: Assigned classes only
 * - Audits corrections when status changes
 */
export async function handleSaveBatchAttendance(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const userRole = auth.user.role;
  if (!['school_admin', 'principal', 'teacher', 'super_admin'].includes(userRole)) {
    return errorResponse(`Access denied: Role '${userRole}' is not authorized to submit attendance records`, 403);
  }

  let body: {
    tenantId?: string;
    classId?: string;
    sectionId?: string;
    date?: string;
    records?: Array<{
      studentId: string;
      status: AttendanceStatus;
      remarks?: string;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId, sectionId, date, records } = body;

  if (!classId) {
    return errorResponse('Class ID is required', 400);
  }

  if (!date || !isValidDate(date)) {
    return errorResponse('A valid calendar date in YYYY-MM-DD format is required', 400);
  }

  if (!Array.isArray(records) || records.length === 0) {
    return errorResponse('Records array must contain at least one student attendance entry', 400);
  }

  if (records.length > 250) {
    return errorResponse('Batch size exceeds maximum limit of 250 records', 400);
  }

  // Teacher class assignment authorization
  if (userRole === 'teacher') {
    const { classIds, classNames } = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!classIds.has(classId) && !classNames.has(classId)) {
      return errorResponse('Access denied: You are not assigned to record attendance for this class', 403);
    }
  }

  // Verify class exists and belongs to this tenant
  const classRecord = await env.DB.prepare(`
    SELECT id, name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(classId, scopedTenantId).first<{ id: string; name: string }>();

  if (!classRecord) {
    return errorResponse('Selected class does not exist in your school', 404);
  }

  // Verify all students belong to tenant & this class
  const studentIds = records.map(r => r.studentId);
  const placeholders = studentIds.map(() => '?').join(',');
  const validStudents = await env.DB.prepare(`
    SELECT id, name, class_id, section_id
    FROM students
    WHERE tenant_id = ? AND class_id = ? AND id IN (${placeholders})
  `).bind(scopedTenantId, classId, ...studentIds).all<{
    id: string;
    name: string;
    class_id: string;
    section_id: string;
  }>();

  const studentMap = new Map<string, { name: string; section_id: string }>();
  for (const s of validStudents.results) {
    studentMap.set(s.id, { name: s.name, section_id: s.section_id });
  }

  // Find existing attendance records for audit tracking
  const existingRecords = await env.DB.prepare(`
    SELECT *
    FROM attendance_records
    WHERE tenant_id = ? AND date = ? AND student_id IN (${placeholders})
  `).bind(scopedTenantId, date, ...studentIds).all<AttendanceDbRow>();

  const existingMap = new Map<string, AttendanceDbRow>();
  for (const ex of existingRecords.results) {
    existingMap.set(ex.student_id, ex);
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let correctionCount = 0;

  for (const entry of records) {
    const studentInfo = studentMap.get(entry.studentId);
    if (!studentInfo) {
      // Skip students not belonging to this class & tenant
      continue;
    }

    if (!VALID_STATUSES.includes(entry.status)) {
      return errorResponse(`Invalid attendance status: '${entry.status}'. Must be present, absent, late, or leave`, 400);
    }

    const cleanRemarks = entry.remarks ? entry.remarks.trim().substring(0, 250) : null;
    const existing = existingMap.get(entry.studentId);

    if (existing) {
      // Check if status changed to log auditable correction
      if (existing.status !== entry.status || existing.remarks !== cleanRemarks) {
        // 1. Audit trail insertion
        const corrId = `corr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await env.DB.prepare(`
          INSERT INTO attendance_corrections (
            id, tenant_id, attendance_record_id, student_id, date, old_status, new_status,
            old_remarks, new_remarks, reason, changed_by_user_id, changed_by_user_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          corrId,
          scopedTenantId,
          existing.id,
          entry.studentId,
          date,
          existing.status,
          entry.status,
          existing.remarks,
          cleanRemarks,
          'Roster correction submitted',
          auth.user.id,
          auth.user.name
        ).run();
        correctionCount++;

        // 2. Update record
        await env.DB.prepare(`
          UPDATE attendance_records
          SET status = ?, remarks = ?, updated_at = datetime('now'), recorded_by_user_id = ?
          WHERE id = ? AND tenant_id = ?
        `).bind(entry.status, cleanRemarks, auth.user.id, existing.id, scopedTenantId).run();
        updatedCount++;
      }
    } else {
      // Insert fresh attendance record
      const recordId = `att-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const resolvedSectionId = studentInfo.section_id || sectionId || 'sec-default';

      await env.DB.prepare(`
        INSERT INTO attendance_records (
          id, tenant_id, date, student_id, student_name, class_id, section_id,
          status, remarks, created_at, updated_at, recorded_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
      `).bind(
        recordId,
        scopedTenantId,
        date,
        entry.studentId,
        studentInfo.name,
        classId,
        resolvedSectionId,
        entry.status,
        cleanRemarks,
        auth.user.id
      ).run();
      insertedCount++;
    }
  }

  return jsonResponse({
    message: `Attendance marked successfully for ${date}`,
    classId,
    date,
    totalProcessed: records.length,
    insertedCount,
    updatedCount,
    correctionCount
  }, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/attendance/student/:id
 * Retrieves attendance history for a single student.
 * - Parent: Only their verified child
 * - Student: Only their own profile
 * - Teacher: Only students in assigned classes
 * - Admin/Principal: Full history in tenant
 * - Accountant: 403 Forbidden
 */
export async function handleGetStudentAttendance(studentId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const userRole = auth.user.role;
  if (userRole === 'accountant') {
    return errorResponse('Access denied: Accountant role does not have authorization for student attendance histories', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Fetch student record in tenant
  const student = await env.DB.prepare(`
    SELECT id, name, admission_no, roll_no, class_id, class_name, section_id, section_name, parent_id
    FROM students
    WHERE id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(studentId, scopedTenantId).first<{
    id: string;
    name: string;
    admission_no: string;
    roll_no: string;
    class_id: string;
    class_name: string;
    section_id: string;
    section_name: string;
    parent_id: string;
  }>();

  if (!student) {
    return errorResponse('Student not found in your school records', 404);
  }

  // 2. Role-based authorization
  if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (!myStudentId || studentId !== myStudentId) {
      return errorResponse('Access denied: You can only view your own attendance records', 403);
    }
  } else if (userRole === 'parent') {
    const parentId = await getParentIdForUser(env, scopedTenantId, auth.user);
    if (!parentId || student.parent_id !== parentId) {
      return errorResponse('Access denied: You can only view attendance for your own registered children', 403);
    }
  } else if (userRole === 'teacher') {
    const { classIds, classNames } = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!classIds.has(student.class_id) && !classNames.has(student.class_name)) {
      return errorResponse('Access denied: You are not assigned to this student\'s class', 403);
    }
  }

  // 3. Query records
  const month = url.searchParams.get('month'); // e.g. "2026-10"
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  let query = `
    SELECT *
    FROM attendance_records
    WHERE tenant_id = ? AND student_id = ?
  `;
  const params: unknown[] = [scopedTenantId, studentId];

  if (month) {
    query += ` AND strftime('%Y-%m', date) = ?`;
    params.push(month);
  } else if (startDate && endDate) {
    query += ` AND date >= ? AND date <= ?`;
    params.push(startDate, endDate);
  }

  query += ` ORDER BY date DESC`;

  const results = await env.DB.prepare(query).bind(...params).all<AttendanceDbRow>();

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  for (const r of results.results) {
    if (r.status === 'present') presentCount++;
    else if (r.status === 'absent') absentCount++;
    else if (r.status === 'late') lateCount++;
    else if (r.status === 'leave') leaveCount++;
  }

  const totalDays = results.results.length;
  const attendanceRate = totalDays > 0
    ? Math.round(((presentCount + lateCount) / totalDays) * 100)
    : 0;

  return jsonResponse({
    student: {
      id: student.id,
      name: student.name,
      admissionNo: student.admission_no,
      rollNo: student.roll_no,
      className: student.class_name,
      sectionName: student.section_name
    },
    totalDays,
    presentCount,
    absentCount,
    lateCount,
    leaveCount,
    attendanceRate,
    records: results.results.map(formatAttendance)
  }, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/attendance/summary
 * Aggregated attendance statistics for classes across the school on a date or month.
 */
export async function handleGetAttendanceSummary(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const userRole = auth.user.role;
  if (!['school_admin', 'principal', 'teacher', 'super_admin'].includes(userRole)) {
    return errorResponse(`Access denied: Role '${userRole}' is not authorized to access school attendance summaries`, 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  if (!isValidDate(date)) {
    return errorResponse('Valid date in YYYY-MM-DD format is required', 400);
  }

  let teacherAssignedClassIds: Set<string> | null = null;
  if (userRole === 'teacher') {
    const { classIds } = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    teacherAssignedClassIds = classIds;
  }

  // Query classes
  const classes = await env.DB.prepare(`
    SELECT id, name
    FROM school_classes
    WHERE tenant_id = ?
    ORDER BY grade_numeric ASC, name ASC
  `).bind(scopedTenantId).all<{ id: string; name: string }>();

  // Query attendance aggregated by class
  const attSummary = await env.DB.prepare(`
    SELECT 
      class_id,
      COUNT(*) as total_marked,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
      SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave_count
    FROM attendance_records
    WHERE tenant_id = ? AND date = ?
    GROUP BY class_id
  `).bind(scopedTenantId, date).all<{
    class_id: string;
    total_marked: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    leave_count: number;
  }>();

  const summaryMap = new Map(attSummary.results.map(s => [s.class_id, s]));

  let overallPresent = 0;
  let overallAbsent = 0;
  let overallLate = 0;
  let overallLeave = 0;
  let overallMarked = 0;

  const classBreakdown = classes.results
    .filter(c => !teacherAssignedClassIds || teacherAssignedClassIds.has(c.id))
    .map(c => {
      const s = summaryMap.get(c.id);
      const totalMarked = s?.total_marked || 0;
      const present = s?.present_count || 0;
      const absent = s?.absent_count || 0;
      const late = s?.late_count || 0;
      const leave = s?.leave_count || 0;
      const rate = totalMarked > 0 ? Math.round(((present + late) / totalMarked) * 100) : 0;

      overallPresent += present;
      overallAbsent += absent;
      overallLate += late;
      overallLeave += leave;
      overallMarked += totalMarked;

      return {
        classId: c.id,
        className: c.name,
        isMarked: totalMarked > 0,
        totalMarked,
        present,
        absent,
        late,
        leave,
        rate
      };
    });

  const overallRate = overallMarked > 0 ? Math.round(((overallPresent + overallLate) / overallMarked) * 100) : 0;

  return jsonResponse({
    date,
    overall: {
      totalMarked: overallMarked,
      present: overallPresent,
      absent: overallAbsent,
      late: overallLate,
      leave: overallLeave,
      rate: overallRate
    },
    classes: classBreakdown
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/attendance/:id/correct
 * Corrects an individual attendance record with mandatory audit trail.
 */
export async function handleCorrectAttendance(recordId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const userRole = auth.user.role;
  if (!['school_admin', 'principal', 'teacher', 'super_admin'].includes(userRole)) {
    return errorResponse(`Access denied: Role '${userRole}' cannot correct attendance`, 403);
  }

  let body: {
    tenantId?: string;
    newStatus?: AttendanceStatus;
    newRemarks?: string;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { newStatus, newRemarks, reason } = body;

  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return errorResponse('Valid "newStatus" (present, absent, late, leave) is required', 400);
  }

  // 1. Fetch current record
  const currentRecord = await env.DB.prepare(`
    SELECT *
    FROM attendance_records
    WHERE id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(recordId, scopedTenantId).first<AttendanceDbRow>();

  if (!currentRecord) {
    return errorResponse('Attendance record not found', 404);
  }

  // Teacher authorization check
  if (userRole === 'teacher') {
    const { classIds, classNames } = await getTeacherAssignedClasses(env, scopedTenantId, auth.user);
    if (!classIds.has(currentRecord.class_id) && !classNames.has(currentRecord.class_id)) {
      return errorResponse('Access denied: You are not assigned to this student\'s class', 403);
    }
  }

  const cleanRemarks = newRemarks ? newRemarks.trim().substring(0, 250) : null;
  const cleanReason = reason ? reason.trim().substring(0, 250) : 'Administrative correction';

  // 2. Insert audit trail record
  const auditId = `corr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await env.DB.prepare(`
    INSERT INTO attendance_corrections (
      id, tenant_id, attendance_record_id, student_id, date, old_status, new_status,
      old_remarks, new_remarks, reason, changed_by_user_id, changed_by_user_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    auditId,
    scopedTenantId,
    currentRecord.id,
    currentRecord.student_id,
    currentRecord.date,
    currentRecord.status,
    newStatus,
    currentRecord.remarks,
    cleanRemarks,
    cleanReason,
    auth.user.id,
    auth.user.name
  ).run();

  // 3. Update record
  await env.DB.prepare(`
    UPDATE attendance_records
    SET status = ?, remarks = ?, updated_at = datetime('now'), recorded_by_user_id = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(newStatus, cleanRemarks, auth.user.id, recordId, scopedTenantId).run();

  const updated = await env.DB.prepare(`
    SELECT * FROM attendance_records WHERE id = ? LIMIT 1
  `).bind(recordId).first<AttendanceDbRow>();

  return jsonResponse({
    message: 'Attendance record corrected successfully with audit log entry',
    correctionId: auditId,
    record: formatAttendance(updated!)
  }, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/attendance/corrections
 * Retrieves audit log of corrections.
 */
export async function handleGetAttendanceCorrections(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const userRole = auth.user.role;
  if (!['school_admin', 'principal', 'super_admin'].includes(userRole)) {
    return errorResponse(`Access denied: Role '${userRole}' cannot view audit logs`, 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const date = url.searchParams.get('date');
  const studentId = url.searchParams.get('studentId');

  let query = `
    SELECT c.*, s.name as student_name
    FROM attendance_corrections c
    LEFT JOIN students s ON c.student_id = s.id
    WHERE c.tenant_id = ?
  `;
  const params: unknown[] = [scopedTenantId];

  if (date) {
    query += ` AND c.date = ?`;
    params.push(date);
  }

  if (studentId) {
    query += ` AND c.student_id = ?`;
    params.push(studentId);
  }

  query += ` ORDER BY c.created_at DESC LIMIT 100`;

  const results = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    attendance_record_id: string;
    student_id: string;
    student_name: string | null;
    date: string;
    old_status: string;
    new_status: string;
    old_remarks: string | null;
    new_remarks: string | null;
    reason: string | null;
    changed_by_user_id: string;
    changed_by_user_name: string | null;
    created_at: string;
  }>();

  return jsonResponse(results.results, 200, {}, scopedTenantId);
}
