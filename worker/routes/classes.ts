// ============================================================================
// Classes & Sections Route Handlers (Server-Authoritative Tenant Scoping)
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
      c.capacity, c.total_students, c.monthly_tuition_fee,
      (
        SELECT json_group_array(s.name)
        FROM class_sections s
        WHERE s.class_id = c.id
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
      sections,
      classTeacherName: c.class_teacher_name || undefined,
      capacity: c.capacity,
      totalStudents: c.total_students,
      monthlyTuitionFee: c.monthly_tuition_fee
    };
  });

  return jsonResponse(formatted, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/classes
 * Body: { name, gradeNumeric, capacity, monthlyTuitionFee, sections }
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
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.name) {
    return errorResponse('Class name is required (e.g. Class 9)', 400);
  }

  const tenantId = auth.user.tenantId || auth.tenant?.id;
  if (!tenantId) {
    return errorResponse('Missing school context for class creation', 400);
  }

  const classId = `class-${Date.now()}`;
  const gradeNumeric = Number(body.gradeNumeric) || 0;
  const capacity = Number(body.capacity) || 40;
  const monthlyTuitionFee = Number(body.monthlyTuitionFee) || 5000;
  const classTeacherName = body.classTeacherName || null;

  try {
    await env.DB.prepare(`
      INSERT INTO school_classes (id, tenant_id, name, grade_numeric, class_teacher_name, capacity, monthly_tuition_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(classId, tenantId, body.name.trim(), gradeNumeric, classTeacherName, capacity, monthlyTuitionFee).run();

    // Insert sections if provided
    const sections = Array.isArray(body.sections) && body.sections.length > 0 ? body.sections : ['A'];
    for (const sec of sections) {
      const secId = `sec-${classId}-${sec.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      await env.DB.prepare(`
        INSERT OR IGNORE INTO class_sections (id, tenant_id, class_id, name)
        VALUES (?, ?, ?, ?)
      `).bind(secId, tenantId, classId, sec.trim()).run();
    }

    return jsonResponse({
      id: classId,
      tenantId,
      name: body.name.trim(),
      gradeNumeric,
      sections,
      classTeacherName: classTeacherName || undefined,
      capacity,
      totalStudents: 0,
      monthlyTuitionFee
    }, 201, {}, tenantId);
  } catch (err) {
    return errorResponse(`Failed to create class: ${(err as Error).message}`, 400);
  }
}
