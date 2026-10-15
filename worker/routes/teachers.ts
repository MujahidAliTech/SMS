// ============================================================================
// Teachers & Staff Route Handlers (Server-Authoritative Tenant Scoping & Relational Protection)
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';

interface TeacherDbRow {
  id: string;
  tenant_id: string;
  teacher_code: string | null;
  name: string;
  role: 'teacher' | 'principal' | 'accountant' | 'staff';
  designation: string;
  qualification: string;
  subjects_json: string;
  assigned_classes_json: string;
  joining_date: string;
  phone: string;
  email: string;
  cnic: string;
  employment_status: 'active' | 'leave' | 'resigned';
  salary_monthly: number;
  photo_url: string | null;
  photo_key: string | null;
  created_at: string;
  updated_at: string;
}

function formatTeacher(row: TeacherDbRow) {
  let subjects: string[] = [];
  try {
    subjects = JSON.parse(row.subjects_json || '[]');
  } catch {
    subjects = [];
  }

  let assignedClasses: string[] = [];
  try {
    assignedClasses = JSON.parse(row.assigned_classes_json || '[]');
  } catch {
    assignedClasses = [];
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    teacherCode: row.teacher_code || undefined,
    name: row.name,
    role: row.role,
    designation: row.designation,
    qualification: row.qualification,
    subjects,
    assignedClasses,
    joiningDate: row.joining_date,
    phone: row.phone,
    email: row.email,
    cnic: row.cnic,
    employmentStatus: row.employment_status,
    salaryMonthly: row.salary_monthly,
    photoUrl: row.photo_key ? `/api/v1/media/avatar/teachers/${row.id}` : (row.photo_url || undefined),
    photoKey: row.photo_key || undefined
  };
}

/**
 * GET /api/v1/teachers
 * Supports search, role, status query parameters
 */
export async function handleGetTeachers(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const search = url.searchParams.get('search')?.toLowerCase().trim() || '';
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');

  let query = `SELECT * FROM teachers_staff WHERE tenant_id = ?`;
  const params: unknown[] = [scopedTenantId];

  if (role && role !== 'all') {
    query += ` AND role = ?`;
    params.push(role);
  }

  if (status && status !== 'all') {
    query += ` AND employment_status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (
      LOWER(name) LIKE ? OR
      LOWER(designation) LIKE ? OR
      phone LIKE ? OR
      LOWER(cnic) LIKE ? OR
      LOWER(COALESCE(teacher_code, '')) LIKE ? OR
      LOWER(email) LIKE ?
    )`;
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
  }

  query += ` ORDER BY name ASC`;

  const results = await env.DB.prepare(query).bind(...params).all<TeacherDbRow>();
  const formatted = results.results.map(formatTeacher);

  return jsonResponse(formatted, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/teachers/:id
 */
export async function handleGetTeacherById(teacherId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const row = await env.DB.prepare(`
    SELECT * FROM teachers_staff WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(teacherId, scopedTenantId).first<TeacherDbRow>();

  if (!row) {
    return errorResponse('Faculty or staff record not found in your school', 404);
  }

  return jsonResponse(formatTeacher(row), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/teachers
 * Creates a new teacher/staff record with validation
 */
export async function handleCreateTeacher(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const designation = body.designation?.trim();
  const role = body.role || 'teacher';
  const cnic = body.cnic?.trim() || `35202-${Math.floor(1000000 + Math.random() * 9000000)}-1`;
  const teacherCode = body.teacherCode?.trim() || null;

  if (!name || !phone || !designation) {
    return errorResponse('Mandatory fields missing: Full name, phone number, and designation are required', 400);
  }

  // Check unique CNIC if present
  if (cnic) {
    const existingCnic = await env.DB.prepare(`
      SELECT id FROM teachers_staff WHERE tenant_id = ? AND cnic = ? LIMIT 1
    `).bind(scopedTenantId, cnic).first();

    if (existingCnic) {
      return errorResponse(`A staff member with CNIC "${cnic}" already exists in this school`, 409);
    }
  }

  // Check unique teacherCode if provided
  if (teacherCode) {
    const existingCode = await env.DB.prepare(`
      SELECT id FROM teachers_staff WHERE tenant_id = ? AND LOWER(teacher_code) = LOWER(?) LIMIT 1
    `).bind(scopedTenantId, teacherCode).first();

    if (existingCode) {
      return errorResponse(`Employee / Teacher Code "${teacherCode}" is already in use`, 409);
    }
  }

  const teacherId = `teacher-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const qualification = body.qualification?.trim() || 'Graduate';
  const subjectsJson = JSON.stringify(Array.isArray(body.subjects) ? body.subjects : ['General']);
  const assignedClassesJson = JSON.stringify(Array.isArray(body.assignedClasses) ? body.assignedClasses : []);
  const joiningDate = body.joiningDate || new Date().toISOString().split('T')[0];
  const email = body.email?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.edu.pk`;
  const employmentStatus = body.employmentStatus || 'active';
  const salaryMonthly = Number(body.salaryMonthly) || 45000;

  try {
    await env.DB.prepare(`
      INSERT INTO teachers_staff (
        id, tenant_id, teacher_code, name, role, designation, qualification, subjects_json,
        assigned_classes_json, joining_date, phone, email, cnic, employment_status, salary_monthly
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      teacherId, scopedTenantId, teacherCode, name, role, designation, qualification,
      subjectsJson, assignedClassesJson, joiningDate, phone, email, cnic, employmentStatus, salaryMonthly
    ).run();

    // Update tenant active teacher count
    await env.DB.prepare(`
      UPDATE tenants
      SET active_teacher_count = (SELECT COUNT(*) FROM teachers_staff WHERE tenant_id = ? AND employment_status = 'active'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(scopedTenantId, scopedTenantId).run();

    return await handleGetTeacherById(teacherId, request, env);
  } catch (err) {
    return errorResponse(`Failed to create staff record: ${(err as Error).message}`, 400);
  }
}

/**
 * PUT /api/v1/teachers/:id
 * Updates teacher/staff record
 */
export async function handleUpdateTeacher(teacherId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // Verify existence
  const existing = await env.DB.prepare(`
    SELECT * FROM teachers_staff WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(teacherId, scopedTenantId).first<TeacherDbRow>();

  if (!existing) {
    return errorResponse('Faculty or staff record not found in your school', 404);
  }

  // Check unique CNIC if changed
  if (body.cnic && body.cnic.trim() !== existing.cnic) {
    const duplicateCnic = await env.DB.prepare(`
      SELECT id FROM teachers_staff WHERE tenant_id = ? AND cnic = ? AND id != ? LIMIT 1
    `).bind(scopedTenantId, body.cnic.trim(), teacherId).first();

    if (duplicateCnic) {
      return errorResponse(`CNIC "${body.cnic}" is already registered to another staff member`, 409);
    }
  }

  // Check unique teacherCode if changed
  if (body.teacherCode && body.teacherCode.trim() !== (existing.teacher_code || '')) {
    const duplicateCode = await env.DB.prepare(`
      SELECT id FROM teachers_staff WHERE tenant_id = ? AND LOWER(teacher_code) = LOWER(?) AND id != ? LIMIT 1
    `).bind(scopedTenantId, body.teacherCode.trim(), teacherId).first();

    if (duplicateCode) {
      return errorResponse(`Employee code "${body.teacherCode}" is already in use`, 409);
    }
  }

  const name = body.name !== undefined ? body.name.trim() : existing.name;
  const teacherCode = body.teacherCode !== undefined ? (body.teacherCode ? body.teacherCode.trim() : null) : existing.teacher_code;
  const role = body.role !== undefined ? body.role : existing.role;
  const designation = body.designation !== undefined ? body.designation.trim() : existing.designation;
  const qualification = body.qualification !== undefined ? body.qualification.trim() : existing.qualification;
  const subjectsJson = body.subjects !== undefined ? JSON.stringify(body.subjects) : existing.subjects_json;
  const assignedClassesJson = body.assignedClasses !== undefined ? JSON.stringify(body.assignedClasses) : existing.assigned_classes_json;
  const joiningDate = body.joiningDate !== undefined ? body.joiningDate : existing.joining_date;
  const phone = body.phone !== undefined ? body.phone.trim() : existing.phone;
  const email = body.email !== undefined ? body.email.trim() : existing.email;
  const cnic = body.cnic !== undefined ? body.cnic.trim() : existing.cnic;
  const employmentStatus = body.employmentStatus !== undefined ? body.employmentStatus : existing.employment_status;
  const salaryMonthly = body.salaryMonthly !== undefined ? Number(body.salaryMonthly) : existing.salary_monthly;

  try {
    await env.DB.prepare(`
      UPDATE teachers_staff
      SET name = ?, teacher_code = ?, role = ?, designation = ?, qualification = ?,
          subjects_json = ?, assigned_classes_json = ?, joining_date = ?, phone = ?,
          email = ?, cnic = ?, employment_status = ?, salary_monthly = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      name, teacherCode, role, designation, qualification, subjectsJson, assignedClassesJson,
      joiningDate, phone, email, cnic, employmentStatus, salaryMonthly, teacherId, scopedTenantId
    ).run();

    // Update tenant count
    await env.DB.prepare(`
      UPDATE tenants
      SET active_teacher_count = (SELECT COUNT(*) FROM teachers_staff WHERE tenant_id = ? AND employment_status = 'active'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(scopedTenantId, scopedTenantId).run();

    return await handleGetTeacherById(teacherId, request, env);
  } catch (err) {
    return errorResponse(`Failed to update staff record: ${(err as Error).message}`, 400);
  }
}

/**
 * DELETE /api/v1/teachers/:id
 * Protects linked user logins, class teacher incharge assignments, and subjects
 */
export async function handleDeleteTeacher(teacherId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Verify existence
  const staff = await env.DB.prepare(`
    SELECT id, name, photo_key FROM teachers_staff WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(teacherId, scopedTenantId).first<{ id: string; name: string; photo_key: string | null }>();

  if (!staff) {
    return errorResponse('Staff record not found in your school', 404);
  }

  // 2. Relational Integrity Checks
  // A: Linked User Login
  const linkedUser = await env.DB.prepare(`
    SELECT id, email, name FROM users WHERE linked_entity_id = ? AND tenant_id = ? LIMIT 1
  `).bind(teacherId, scopedTenantId).first<{ id: string; email: string; name: string }>();

  if (linkedUser) {
    return errorResponse(
      `Cannot permanently delete faculty member "${staff.name}": an active user login account (${linkedUser.email}) is linked to this profile. Please remove or deactivate the user login account first.`,
      409
    );
  }

  // B: Assigned Class Incharge
  const inchargeClasses = await env.DB.prepare(`
    SELECT name FROM school_classes WHERE class_teacher_name = ? AND tenant_id = ? LIMIT 1
  `).bind(staff.name, scopedTenantId).first<{ name: string }>();

  if (inchargeClasses) {
    return errorResponse(
      `Cannot delete faculty member "${staff.name}": this teacher is assigned as the primary Class Teacher for "${inchargeClasses.name}". Please reassign the class incharge before deleting.`,
      409
    );
  }

  // C: Assigned Subjects
  const subjectRecord = await env.DB.prepare(`
    SELECT name FROM subjects WHERE teacher_id = ? AND tenant_id = ? LIMIT 1
  `).bind(teacherId, scopedTenantId).first<{ name: string }>();

  if (subjectRecord) {
    return errorResponse(
      `Cannot delete faculty member "${staff.name}": assigned as subject instructor for "${subjectRecord.name}". Please reassign the subject teacher first.`,
      409
    );
  }

  try {
    // 3. Clean up Cloudflare R2 photo
    if (staff.photo_key && env.STORAGE) {
      try {
        await env.STORAGE.delete(staff.photo_key);
      } catch (r2Err) {
        console.warn('Failed to delete staff R2 photo object:', r2Err);
      }
    }

    // 4. Delete record
    await env.DB.prepare(`
      DELETE FROM teachers_staff WHERE id = ? AND tenant_id = ?
    `).bind(teacherId, scopedTenantId).run();

    // 5. Update tenant counts
    await env.DB.prepare(`
      UPDATE tenants
      SET active_teacher_count = (SELECT COUNT(*) FROM teachers_staff WHERE tenant_id = ? AND employment_status = 'active'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(scopedTenantId, scopedTenantId).run();

    return jsonResponse({
      message: `Staff member "${staff.name}" was successfully removed from faculty records.`,
      id: teacherId
    }, 200, {}, scopedTenantId);
  } catch (err) {
    return errorResponse(`Failed to delete staff member: ${(err as Error).message}`, 400);
  }
}
