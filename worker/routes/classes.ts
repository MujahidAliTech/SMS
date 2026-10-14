// ============================================================================
// Classes & Sections Route Handlers (Server-Authoritative Tenant Scoping)
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';

/**
 * GET /api/v1/classes
 * Query: ?tenantId=... (optional, verified against authContext)
 */
export async function handleGetClasses(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');

  // Enforce server-side tenant scoping
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') {
    return scopedTenantId; // Returns error Response if forbidden
  }

  // Safe parameterized query binding the verified tenant ID
  const classes = await env.DB.prepare(`
    SELECT 
      c.id, c.tenant_id, c.name, c.grade_numeric, c.class_teacher_name,
      c.capacity,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.tenant_id = c.tenant_id) as total_students,
      c.monthly_tuition_fee,
      (
        SELECT json_group_array(sec.name)
        FROM class_sections sec
        WHERE sec.class_id = c.id
      ) as sections_json
    FROM school_classes c
    WHERE c.tenant_id = ?
    ORDER BY c.grade_numeric ASC, c.name ASC
  `).bind(scopedTenantId).all<{
    id: string;
    tenant_id: string;
    name: string;
    grade_numeric: number;
    class_teacher_name: string | null;
    capacity: number;
    total_students: number;
    monthly_tuition_fee: number;
    sections_json: string;
  }>();

  const formatted = classes.results.map(c => {
    let sections: string[] = [];
    try {
      sections = JSON.parse(c.sections_json || '[]');
    } catch {
      sections = [];
    }
    return {
      id: c.id,
      tenantId: c.tenant_id,
      name: c.name,
      gradeNumeric: c.grade_numeric,
      sections: sections.length > 0 ? sections : ['A'],
      classTeacherName: c.class_teacher_name || undefined,
      capacity: c.capacity,
      totalStudents: c.total_students,
      monthlyTuitionFee: c.monthly_tuition_fee
    };
  });

  return jsonResponse(formatted, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/classes/:id
 */
export async function handleGetClassById(classId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const c = await env.DB.prepare(`
    SELECT 
      c.id, c.tenant_id, c.name, c.grade_numeric, c.class_teacher_name,
      c.capacity,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.tenant_id = c.tenant_id) as total_students,
      c.monthly_tuition_fee,
      (
        SELECT json_group_array(sec.name)
        FROM class_sections sec
        WHERE sec.class_id = c.id
      ) as sections_json
    FROM school_classes c
    WHERE c.id = ? AND c.tenant_id = ?
    LIMIT 1
  `).bind(classId, scopedTenantId).first<{
    id: string;
    tenant_id: string;
    name: string;
    grade_numeric: number;
    class_teacher_name: string | null;
    capacity: number;
    total_students: number;
    monthly_tuition_fee: number;
    sections_json: string;
  }>();

  if (!c) {
    return errorResponse('Class not found', 404);
  }

  let sections: string[] = [];
  try {
    sections = JSON.parse(c.sections_json || '[]');
  } catch {
    sections = [];
  }

  return jsonResponse({
    id: c.id,
    tenantId: c.tenant_id,
    name: c.name,
    gradeNumeric: c.grade_numeric,
    sections: sections.length > 0 ? sections : ['A'],
    classTeacherName: c.class_teacher_name || undefined,
    capacity: c.capacity,
    totalStudents: c.total_students,
    monthlyTuitionFee: c.monthly_tuition_fee
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/classes
 * Body: { name, gradeNumeric, capacity, monthlyTuitionFee, classTeacherName, sections }
 */
export async function handleCreateClass(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  // Only School Admin, Principal, or Super Admin can create classes
  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  let body: {
    tenantId?: string;
    name?: string;
    gradeNumeric?: number;
    capacity?: number;
    monthlyTuitionFee?: number;
    classTeacherName?: string;
    sections?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  if (!body.name || !body.name.trim()) {
    return errorResponse('Class title/name is required (e.g. Class 9)', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // Check uniqueness of class name within tenant
  const existing = await env.DB.prepare(`
    SELECT id FROM school_classes WHERE tenant_id = ? AND LOWER(name) = LOWER(?) LIMIT 1
  `).bind(scopedTenantId, body.name.trim()).first();

  if (existing) {
    return errorResponse(`A class named "${body.name.trim()}" already exists in this school`, 409);
  }

  const classId = `class-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const gradeNumeric = Number(body.gradeNumeric) || 0;
  const capacity = Number(body.capacity) || 40;
  const monthlyTuitionFee = Number(body.monthlyTuitionFee) || 5000;
  const classTeacherName = body.classTeacherName ? body.classTeacherName.trim() : null;

  try {
    await env.DB.prepare(`
      INSERT INTO school_classes (id, tenant_id, name, grade_numeric, class_teacher_name, capacity, monthly_tuition_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(classId, scopedTenantId, body.name.trim(), gradeNumeric, classTeacherName, capacity, monthlyTuitionFee).run();

    // Insert sections if provided
    const sections = Array.isArray(body.sections) && body.sections.length > 0 ? body.sections : ['A'];
    for (const sec of sections) {
      const cleanSec = sec.trim();
      if (!cleanSec) continue;
      const secId = `sec-${classId}-${cleanSec.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      await env.DB.prepare(`
        INSERT OR IGNORE INTO class_sections (id, tenant_id, class_id, name, capacity)
        VALUES (?, ?, ?, ?, ?)
      `).bind(secId, scopedTenantId, classId, cleanSec, Math.floor(capacity / sections.length) || 30).run();
    }

    return jsonResponse({
      id: classId,
      tenantId: scopedTenantId,
      name: body.name.trim(),
      gradeNumeric,
      sections,
      classTeacherName: classTeacherName || undefined,
      capacity,
      totalStudents: 0,
      monthlyTuitionFee
    }, 201, {}, scopedTenantId);
  } catch (err) {
    return errorResponse(`Failed to create class: ${(err as Error).message}`, 400);
  }
}

/**
 * PUT /api/v1/classes/:id
 * Body: { name, gradeNumeric, capacity, monthlyTuitionFee, classTeacherName, sections }
 */
export async function handleUpdateClass(classId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  let body: {
    tenantId?: string;
    name?: string;
    gradeNumeric?: number;
    capacity?: number;
    monthlyTuitionFee?: number;
    classTeacherName?: string;
    sections?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // Verify class exists and belongs to this tenant
  const currentClass = await env.DB.prepare(`
    SELECT id, name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(classId, scopedTenantId).first<{ id: string; name: string }>();

  if (!currentClass) {
    return errorResponse('Class not found or does not belong to your school', 404);
  }

  const name = body.name ? body.name.trim() : currentClass.name;
  const gradeNumeric = body.gradeNumeric !== undefined ? Number(body.gradeNumeric) : 0;
  const capacity = body.capacity !== undefined ? Number(body.capacity) : 40;
  const monthlyTuitionFee = body.monthlyTuitionFee !== undefined ? Number(body.monthlyTuitionFee) : 5000;
  const classTeacherName = body.classTeacherName !== undefined ? (body.classTeacherName ? body.classTeacherName.trim() : null) : null;

  try {
    await env.DB.prepare(`
      UPDATE school_classes
      SET name = ?, grade_numeric = ?, class_teacher_name = ?, capacity = ?, monthly_tuition_fee = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(name, gradeNumeric, classTeacherName, capacity, monthlyTuitionFee, classId, scopedTenantId).run();

    // If sections provided, sync sections
    if (Array.isArray(body.sections) && body.sections.length > 0) {
      const newSectionNames = body.sections.map(s => s.trim()).filter(Boolean);

      // Find existing sections
      const existingSections = await env.DB.prepare(`
        SELECT id, name FROM class_sections WHERE class_id = ? AND tenant_id = ?
      `).bind(classId, scopedTenantId).all<{ id: string; name: string }>();

      // Check if any removed section has students assigned to it
      for (const ex of existingSections.results) {
        if (!newSectionNames.includes(ex.name)) {
          const studentCount = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM students WHERE section_id = ? AND tenant_id = ?
          `).bind(ex.id, scopedTenantId).first<{ count: number }>();

          if (studentCount && studentCount.count > 0) {
            return errorResponse(
              `Cannot remove section "${ex.name}" because ${studentCount.count} student(s) are assigned to it. Please reassign students first.`,
              409
            );
          }

          // Safe to delete this empty section
          await env.DB.prepare(`
            DELETE FROM class_sections WHERE id = ? AND tenant_id = ?
          `).bind(ex.id, scopedTenantId).run();
        }
      }

      // Add new sections
      for (const sName of newSectionNames) {
        const secId = `sec-${classId}-${sName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        await env.DB.prepare(`
          INSERT OR IGNORE INTO class_sections (id, tenant_id, class_id, name, capacity)
          VALUES (?, ?, ?, ?, ?)
        `).bind(secId, scopedTenantId, classId, sName, Math.floor(capacity / newSectionNames.length) || 30).run();
      }
    }

    // Return updated class
    return await handleGetClassById(classId, request, env);
  } catch (err) {
    return errorResponse(`Failed to update class: ${(err as Error).message}`, 400);
  }
}

/**
 * DELETE /api/v1/classes/:id
 * Strictly validates relationships before deleting (Part C requirement)
 */
export async function handleDeleteClass(classId: string, request: Request, env: Env): Promise<Response> {
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
  const cls = await env.DB.prepare(`
    SELECT id, name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(classId, scopedTenantId).first<{ id: string; name: string }>();

  if (!cls) {
    return errorResponse('Class not found or does not belong to your school', 404);
  }

  // 2. Validate student relationship (Cannot delete if students are enrolled)
  const studentCheck = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM students WHERE class_id = ? AND tenant_id = ?
  `).bind(classId, scopedTenantId).first<{ count: number }>();

  if (studentCheck && studentCheck.count > 0) {
    return errorResponse(
      `Cannot delete class "${cls.name}" because ${studentCheck.count} student(s) are currently enrolled in it. You must reassign or remove students before deleting this class.`,
      409
    );
  }

  // 3. Remove associated sections and class
  try {
    await env.DB.prepare(`
      DELETE FROM class_sections WHERE class_id = ? AND tenant_id = ?
    `).bind(classId, scopedTenantId).run();

    await env.DB.prepare(`
      DELETE FROM school_classes WHERE id = ? AND tenant_id = ?
    `).bind(classId, scopedTenantId).run();

    return jsonResponse({
      message: `Class "${cls.name}" and its sections were deleted successfully.`,
      id: classId
    }, 200, {}, scopedTenantId);
  } catch (err) {
    return errorResponse(`Failed to delete class: ${(err as Error).message}`, 400);
  }
}
