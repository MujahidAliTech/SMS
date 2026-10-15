// ============================================================================
// Students Route Handlers (Server-Authoritative Tenant Scoping & Relational Integrity)
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';

interface StudentDbRow {
  id: string;
  tenant_id: string;
  admission_no: string;
  name: string;
  father_name: string;
  mother_name: string | null;
  gender: 'Male' | 'Female';
  dob: string;
  admission_date: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  roll_no: string;
  parent_id: string;
  parent_contact: string;
  emergency_contact: string | null;
  address: string;
  b_form_or_cnic: string;
  previous_school: string | null;
  status: 'active' | 'inactive' | 'alumni' | 'struck_off';
  photo_url: string | null;
  photo_key: string | null;
  monthly_fee: number;
  created_at: string;
  updated_at: string;
}

function formatStudent(row: StudentDbRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    admissionNo: row.admission_no,
    name: row.name,
    fatherName: row.father_name,
    motherName: row.mother_name || undefined,
    gender: row.gender,
    dob: row.dob,
    admissionDate: row.admission_date,
    classId: row.class_id,
    className: row.class_name,
    sectionId: row.section_id,
    sectionName: row.section_name,
    rollNo: row.roll_no,
    parentId: row.parent_id,
    parentContact: row.parent_contact,
    emergencyContact: row.emergency_contact || undefined,
    address: row.address,
    bFormOrCnic: row.b_form_or_cnic,
    previousSchool: row.previous_school || undefined,
    status: row.status,
    photoUrl: row.photo_key ? `/api/v1/media/avatar/students/${row.id}` : (row.photo_url || undefined),
    photoKey: row.photo_key || undefined,
    monthlyFee: row.monthly_fee
  };
}

/**
 * GET /api/v1/students
 * Supports search, classId, status, gender query parameters
 */
export async function handleGetStudents(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const search = url.searchParams.get('search')?.toLowerCase().trim() || '';
  const classId = url.searchParams.get('classId');
  const status = url.searchParams.get('status');
  const gender = url.searchParams.get('gender');

  let query = `
    SELECT *
    FROM students
    WHERE tenant_id = ?
  `;
  const params: unknown[] = [scopedTenantId];

  if (classId && classId !== 'all') {
    query += ` AND class_id = ?`;
    params.push(classId);
  }

  if (status && status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (gender && gender !== 'all') {
    query += ` AND gender = ?`;
    params.push(gender);
  }

  if (search) {
    query += ` AND (
      LOWER(name) LIKE ? OR
      LOWER(admission_no) LIKE ? OR
      LOWER(roll_no) LIKE ? OR
      LOWER(father_name) LIKE ? OR
      parent_contact LIKE ?
    )`;
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard, wildcard);
  }

  query += ` ORDER BY class_name ASC, roll_no ASC, name ASC`;

  const results = await env.DB.prepare(query).bind(...params).all<StudentDbRow>();
  const formatted = results.results.map(formatStudent);

  return jsonResponse(formatted, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/students/:id
 */
export async function handleGetStudentById(studentId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const row = await env.DB.prepare(`
    SELECT * FROM students WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(studentId, scopedTenantId).first<StudentDbRow>();

  if (!row) {
    return errorResponse('Student not found in your school records', 404);
  }

  return jsonResponse(formatStudent(row), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/students
 * Creates a new student record with relational verification
 */
export async function handleCreateStudent(request: Request, env: Env): Promise<Response> {
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

  // Validation
  const name = body.name?.trim();
  const fatherName = body.fatherName?.trim();
  const admissionNo = body.admissionNo?.trim();
  const classId = body.classId;
  const sectionId = body.sectionId;
  const gender = body.gender === 'Female' ? 'Female' : 'Male';
  const rollNo = body.rollNo?.trim() || '01';
  const parentContact = body.parentContact?.trim() || '';
  const monthlyFee = Number(body.monthlyFee) || 5000;

  if (!name || !fatherName || !admissionNo || !classId) {
    return errorResponse('Required fields missing: name, fatherName, admissionNo, and classId are mandatory', 400);
  }

  // 1. Verify unique admission number within tenant
  const existingAdmission = await env.DB.prepare(`
    SELECT id FROM students WHERE tenant_id = ? AND LOWER(admission_no) = LOWER(?) LIMIT 1
  `).bind(scopedTenantId, admissionNo).first();

  if (existingAdmission) {
    return errorResponse(`Admission number "${admissionNo}" is already assigned to another student in this school`, 409);
  }

  // 2. Verify that classId exists and belongs to this tenant
  const classRecord = await env.DB.prepare(`
    SELECT id, name, monthly_tuition_fee FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(classId, scopedTenantId).first<{ id: string; name: string; monthly_tuition_fee: number }>();

  if (!classRecord) {
    return errorResponse('The selected academic class does not exist or does not belong to your school', 400);
  }

  // 3. Verify section or resolve default
  let resolvedSectionId = sectionId;
  let resolvedSectionName = body.sectionName || 'A';

  if (sectionId) {
    const secRecord = await env.DB.prepare(`
      SELECT id, name FROM class_sections WHERE id = ? AND class_id = ? AND tenant_id = ? LIMIT 1
    `).bind(sectionId, classId, scopedTenantId).first<{ id: string; name: string }>();

    if (secRecord) {
      resolvedSectionName = secRecord.name;
    } else {
      // Find first available section for this class
      const firstSec = await env.DB.prepare(`
        SELECT id, name FROM class_sections WHERE class_id = ? AND tenant_id = ? LIMIT 1
      `).bind(classId, scopedTenantId).first<{ id: string; name: string }>();
      if (firstSec) {
        resolvedSectionId = firstSec.id;
        resolvedSectionName = firstSec.name;
      } else {
        resolvedSectionId = `sec-${classId}-a`;
        resolvedSectionName = 'A';
      }
    }
  } else {
    resolvedSectionId = `sec-${classId}-a`;
  }

  // 4. Resolve Parent Record
  let parentId = body.parentId;
  if (!parentId) {
    // Find or create parent
    const existingParent = await env.DB.prepare(`
      SELECT id FROM parents WHERE tenant_id = ? AND (phone = ? OR name = ?) LIMIT 1
    `).bind(scopedTenantId, parentContact, fatherName).first<{ id: string }>();

    if (existingParent) {
      parentId = existingParent.id;
    } else {
      parentId = `parent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await env.DB.prepare(`
        INSERT INTO parents (id, tenant_id, name, father_or_husband_name, cnic, phone, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        parentId,
        scopedTenantId,
        fatherName,
        fatherName,
        body.bFormOrCnic || '35202-0000000-1',
        parentContact || '+92 300 0000000',
        body.address || 'Pakistan'
      ).run();
    }
  }

  const studentId = `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const dob = body.dob || '2012-01-01';
  const admissionDate = body.admissionDate || new Date().toISOString().split('T')[0];
  const bFormOrCnic = body.bFormOrCnic?.trim() || '35202-0000000-1';
  const address = body.address?.trim() || 'Pakistan';
  const status = body.status || 'active';

  try {
    await env.DB.prepare(`
      INSERT INTO students (
        id, tenant_id, admission_no, name, father_name, mother_name, gender, dob, admission_date,
        class_id, class_name, section_id, section_name, roll_no, parent_id, parent_contact,
        emergency_contact, address, b_form_or_cnic, previous_school, status, monthly_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      studentId, scopedTenantId, admissionNo, name, fatherName, body.motherName || null,
      gender, dob, admissionDate, classId, classRecord.name, resolvedSectionId, resolvedSectionName,
      rollNo, parentId, parentContact, body.emergencyContact || null, address, bFormOrCnic,
      body.previousSchool || null, status, monthlyFee
    ).run();

    // Update tenant active student count
    await env.DB.prepare(`
      UPDATE tenants
      SET active_student_count = (SELECT COUNT(*) FROM students WHERE tenant_id = ? AND status = 'active'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(scopedTenantId, scopedTenantId).run();

    return await handleGetStudentById(studentId, request, env);
  } catch (err) {
    return errorResponse(`Failed to create student record: ${(err as Error).message}`, 400);
  }
}

/**
 * PUT /api/v1/students/:id
 * Updates student information
 */
export async function handleUpdateStudent(studentId: string, request: Request, env: Env): Promise<Response> {
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

  // Verify student exists and belongs to tenant
  const existing = await env.DB.prepare(`
    SELECT * FROM students WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(studentId, scopedTenantId).first<StudentDbRow>();

  if (!existing) {
    return errorResponse('Student record not found in your school', 404);
  }

  // Check unique admissionNo if changed
  if (body.admissionNo && body.admissionNo.trim().toLowerCase() !== existing.admission_no.toLowerCase()) {
    const duplicate = await env.DB.prepare(`
      SELECT id FROM students WHERE tenant_id = ? AND LOWER(admission_no) = LOWER(?) AND id != ? LIMIT 1
    `).bind(scopedTenantId, body.admissionNo.trim(), studentId).first();

    if (duplicate) {
      return errorResponse(`Admission number "${body.admissionNo}" is already assigned to another student`, 409);
    }
  }

  // Verify classId if changed
  let className = existing.class_name;
  if (body.classId && body.classId !== existing.class_id) {
    const cls = await env.DB.prepare(`
      SELECT name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
    `).bind(body.classId, scopedTenantId).first<{ name: string }>();

    if (!cls) {
      return errorResponse('Selected academic class is invalid or belongs to another institution', 400);
    }
    className = cls.name;
  }

  const updatedName = body.name !== undefined ? body.name.trim() : existing.name;
  const updatedFatherName = body.fatherName !== undefined ? body.fatherName.trim() : existing.father_name;
  const updatedMotherName = body.motherName !== undefined ? body.motherName : existing.mother_name;
  const updatedAdmissionNo = body.admissionNo !== undefined ? body.admissionNo.trim() : existing.admission_no;
  const updatedClassId = body.classId !== undefined ? body.classId : existing.class_id;
  const updatedSectionId = body.sectionId !== undefined ? body.sectionId : existing.section_id;
  const updatedSectionName = body.sectionName !== undefined ? body.sectionName : existing.section_name;
  const updatedRollNo = body.rollNo !== undefined ? body.rollNo.trim() : existing.roll_no;
  const updatedGender = body.gender !== undefined ? (body.gender === 'Female' ? 'Female' : 'Male') : existing.gender;
  const updatedDob = body.dob !== undefined ? body.dob : existing.dob;
  const updatedAdmissionDate = body.admissionDate !== undefined ? body.admissionDate : existing.admission_date;
  const updatedParentContact = body.parentContact !== undefined ? body.parentContact.trim() : existing.parent_contact;
  const updatedEmergencyContact = body.emergencyContact !== undefined ? body.emergencyContact : existing.emergency_contact;
  const updatedAddress = body.address !== undefined ? body.address.trim() : existing.address;
  const updatedBFormOrCnic = body.bFormOrCnic !== undefined ? body.bFormOrCnic.trim() : existing.b_form_or_cnic;
  const updatedPreviousSchool = body.previousSchool !== undefined ? body.previousSchool : existing.previous_school;
  const updatedStatus = body.status !== undefined ? body.status : existing.status;
  const updatedMonthlyFee = body.monthlyFee !== undefined ? Number(body.monthlyFee) : existing.monthly_fee;

  try {
    await env.DB.prepare(`
      UPDATE students
      SET name = ?, father_name = ?, mother_name = ?, admission_no = ?, class_id = ?, class_name = ?,
          section_id = ?, section_name = ?, roll_no = ?, gender = ?, dob = ?, admission_date = ?,
          parent_contact = ?, emergency_contact = ?, address = ?, b_form_or_cnic = ?,
          previous_school = ?, status = ?, monthly_fee = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      updatedName, updatedFatherName, updatedMotherName, updatedAdmissionNo, updatedClassId, className,
      updatedSectionId, updatedSectionName, updatedRollNo, updatedGender, updatedDob, updatedAdmissionDate,
      updatedParentContact, updatedEmergencyContact, updatedAddress, updatedBFormOrCnic,
      updatedPreviousSchool, updatedStatus, updatedMonthlyFee, studentId, scopedTenantId
    ).run();

    // Update tenant active student count
    await env.DB.prepare(`
      UPDATE tenants
      SET active_student_count = (SELECT COUNT(*) FROM students WHERE tenant_id = ? AND status = 'active'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(scopedTenantId, scopedTenantId).run();

    return await handleGetStudentById(studentId, request, env);
  } catch (err) {
    return errorResponse(`Failed to update student record: ${(err as Error).message}`, 400);
  }
}

/**
 * DELETE /api/v1/students/:id
 * Enforces relational integrity before permanent removal
 */
export async function handleDeleteStudent(studentId: string, request: Request, env: Env): Promise<Response> {
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
  const student = await env.DB.prepare(`
    SELECT id, name, photo_key FROM students WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(studentId, scopedTenantId).first<{ id: string; name: string; photo_key: string | null }>();

  if (!student) {
    return errorResponse('Student record not found in your school', 404);
  }

  // 2. Relational Integrity Checks
  const feeInvoices = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM fee_invoices WHERE student_id = ? AND tenant_id = ?
  `).bind(studentId, scopedTenantId).first<{ count: number }>();

  const examResults = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM student_results WHERE student_id = ? AND tenant_id = ?
  `).bind(studentId, scopedTenantId).first<{ count: number }>();

  const feeCount = feeInvoices?.count || 0;
  const resCount = examResults?.count || 0;

  if (feeCount > 0 || resCount > 0) {
    return errorResponse(
      `Cannot permanently delete student "${student.name}": active financial fee invoices (${feeCount}) and academic exam records (${resCount}) exist. To maintain audit integrity and historical archives, please set the student status to 'inactive' or 'alumni' instead.`,
      409
    );
  }

  try {
    // 3. Clean up profile picture in Cloudflare R2 if present
    if (student.photo_key && env.STORAGE) {
      try {
        await env.STORAGE.delete(student.photo_key);
      } catch (r2Err) {
        console.warn('Failed to delete student R2 photo object:', r2Err);
      }
    }

    // 4. Delete student record
    await env.DB.prepare(`
      DELETE FROM students WHERE id = ? AND tenant_id = ?
    `).bind(studentId, scopedTenantId).run();

    // 5. Update tenant counts
    await env.DB.prepare(`
      UPDATE tenants
      SET active_student_count = (SELECT COUNT(*) FROM students WHERE tenant_id = ? AND status = 'active'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(scopedTenantId, scopedTenantId).run();

    return jsonResponse({
      message: `Student "${student.name}" was successfully deleted from school records.`,
      id: studentId
    }, 200, {}, scopedTenantId);
  } catch (err) {
    return errorResponse(`Failed to delete student: ${(err as Error).message}`, 400);
  }
}
