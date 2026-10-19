// ============================================================================
// Fees, Invoices, Challans, Payments & Financial Reports Route Handlers
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env, AuthUser } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';
import { getParentIdForUser, getStudentIdForUser } from './students';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'online';
export type InvoiceStatus = 'paid' | 'pending' | 'partial' | 'overdue';

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'online'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns current date string (YYYY-MM-DD) in Pakistan Standard Time (Asia/Karachi, UTC+5)
 */
export function getSchoolTodayDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Checks if a given due date has passed using Pakistan Standard Time policy
 */
export function isDateOverdue(dueDate: string): boolean {
  if (!dueDate || !DATE_REGEX.test(dueDate)) return false;
  const today = getSchoolTodayDate();
  return today > dueDate;
}

interface FeeInvoiceDbRow {
  id: string;
  tenant_id: string;
  invoice_no: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_id: string;
  class_name: string;
  fee_month: string;
  academic_session: string | null;
  issue_date: string;
  due_date: string;
  tuition_fee: number;
  exam_fee: number;
  admission_fee: number;
  other_charges: number;
  discount: number;
  late_fee: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: InvoiceStatus;
  concession_type: string | null;
  concession_reason: string | null;
  concession_approved_by: string | null;
  fee_items_json: string | null;
  created_at: string;
  updated_at: string;
}

interface FeePaymentDbRow {
  id: string;
  tenant_id: string;
  invoice_id: string;
  invoice_no: string;
  receipt_no: string;
  student_id: string;
  student_name: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  received_by: string;
  created_at: string;
  is_reversed: number;
  reversal_id: string | null;
  idempotency_key: string | null;
}

/**
 * Format invoice row safely for API response
 */
function formatInvoice(row: FeeInvoiceDbRow) {
  let feeItems: any[] = [];
  try {
    feeItems = JSON.parse(row.fee_items_json || '[]');
  } catch {
    feeItems = [];
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceNo: row.invoice_no,
    studentId: row.student_id,
    studentName: row.student_name,
    admissionNo: row.admission_no,
    classId: row.class_id,
    className: row.class_name,
    feeMonth: row.fee_month,
    academicSession: row.academic_session || '2026-2027',
    issueDate: row.issue_date,
    dueDate: row.due_date,
    tuitionFee: Number(row.tuition_fee || 0),
    examFee: Number(row.exam_fee || 0),
    admissionFee: Number(row.admission_fee || 0),
    otherCharges: Number(row.other_charges || 0),
    discount: Number(row.discount || 0),
    lateFee: Number(row.late_fee || 0),
    totalAmount: Number(row.total_amount || 0),
    amountPaid: Number(row.amount_paid || 0),
    balance: Number(row.balance || 0),
    status: row.status,
    concessionType: row.concession_type || undefined,
    concessionReason: row.concession_reason || undefined,
    concessionApprovedBy: row.concession_approved_by || undefined,
    feeItems,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Format payment row safely for API response
 */
function formatPayment(row: FeePaymentDbRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    invoiceNo: row.invoice_no,
    receiptNo: row.receipt_no,
    studentId: row.student_id,
    studentName: row.student_name,
    amount: Number(row.amount || 0),
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    transactionRef: row.transaction_ref || undefined,
    receivedBy: row.received_by,
    createdAt: row.created_at,
    isReversed: row.is_reversed === 1,
    reversalId: row.reversal_id || undefined
  };
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
 * Insert into financial audit log
 */
async function logFeeAudit(
  env: Env,
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  user: AuthUser
) {
  try {
    const auditId = `fa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await env.DB.prepare(`
      INSERT INTO fee_audit_logs (
        id, tenant_id, action, entity_type, entity_id, details_json,
        performed_by_user_id, performed_by_user_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      auditId,
      tenantId,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      user.id,
      user.name
    ).run();
  } catch (err) {
    console.error('Failed to write fee audit log:', err);
  }
}

// ============================================================================
// 1. FEE HEADS & STRUCTURES ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/fees/heads
 * List configured fee heads for the tenant.
 */
export async function handleGetFeeHeads(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  if (auth.user.role === 'teacher') {
    return errorResponse('Access denied: Teachers do not have authorization for fee configuration', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const heads = await env.DB.prepare(`
    SELECT * FROM fee_heads WHERE tenant_id = ? ORDER BY is_recurring DESC, name ASC
  `).bind(scopedTenantId).all<{
    id: string;
    tenant_id: string;
    name: string;
    code: string;
    description: string | null;
    is_recurring: number;
    default_amount: number;
    created_at: string;
    updated_at: string;
  }>();

  return jsonResponse(heads.results.map(h => ({
    id: h.id,
    tenantId: h.tenant_id,
    name: h.name,
    code: h.code,
    description: h.description || undefined,
    isRecurring: h.is_recurring === 1,
    defaultAmount: Number(h.default_amount || 0),
    createdAt: h.created_at,
    updatedAt: h.updated_at
  })), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/fees/heads
 * Create or configure a new fee head (school_admin, accountant, super_admin).
 */
export async function handleCreateFeeHead(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'accountant', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    name?: string;
    code?: string;
    description?: string;
    isRecurring?: boolean;
    defaultAmount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const name = body.name?.trim();
  const code = body.code?.trim().toUpperCase();
  if (!name || name.length < 2) return errorResponse('Valid fee head name is required', 400);
  if (!code || code.length < 1) return errorResponse('Valid fee head code is required', 400);

  const isRecurring = body.isRecurring !== false ? 1 : 0;
  const defaultAmount = Math.max(0, Math.floor(body.defaultAmount || 0));

  // Check unique
  const existing = await env.DB.prepare(`
    SELECT id FROM fee_heads WHERE tenant_id = ? AND (LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)) LIMIT 1
  `).bind(scopedTenantId, name, code).first();

  if (existing) {
    return errorResponse('A fee head with this name or code already exists in your school', 409);
  }

  const id = `fh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await env.DB.prepare(`
    INSERT INTO fee_heads (
      id, tenant_id, name, code, description, is_recurring, default_amount, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(id, scopedTenantId, name, code, body.description?.trim() || null, isRecurring, defaultAmount).run();

  await logFeeAudit(env, scopedTenantId, 'FEE_HEAD_CREATED', 'fee_head', id, { name, code, defaultAmount }, auth.user);

  return jsonResponse({
    id,
    tenantId: scopedTenantId,
    name,
    code,
    description: body.description?.trim(),
    isRecurring: isRecurring === 1,
    defaultAmount
  }, 201, {}, scopedTenantId);
}

/**
 * GET /api/v1/fees/structures
 * List fee structures (class-wise pricing) for session.
 */
export async function handleGetFeeStructures(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  if (auth.user.role === 'teacher') {
    return errorResponse('Access denied: Teachers do not have authorization for fee structures', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const classId = url.searchParams.get('classId');
  const session = url.searchParams.get('session') || '2026-2027';

  let query = `SELECT * FROM fee_structures WHERE tenant_id = ? AND academic_session = ?`;
  const params: unknown[] = [scopedTenantId, session];

  if (classId) {
    query += ` AND class_id = ?`;
    params.push(classId);
  }

  query += ` ORDER BY class_name ASC, fee_head_name ASC`;
  const structures = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    tenant_id: string;
    class_id: string;
    class_name: string;
    fee_head_id: string;
    fee_head_name: string;
    amount: number;
    academic_session: string;
    created_at: string;
    updated_at: string;
  }>();

  return jsonResponse(structures.results.map(s => ({
    id: s.id,
    tenantId: s.tenant_id,
    classId: s.class_id,
    className: s.class_name,
    feeHeadId: s.fee_head_id,
    feeHeadName: s.fee_head_name,
    amount: Number(s.amount || 0),
    academicSession: s.academic_session,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  })), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/fees/structures
 * Configure or update class fee structure.
 */
export async function handleSetFeeStructure(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'accountant', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    classId?: string;
    feeHeadId?: string;
    amount?: number;
    academicSession?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { classId, feeHeadId, amount } = body;
  const session = body.academicSession?.trim() || '2026-2027';

  if (!classId) return errorResponse('classId is required', 400);
  if (!feeHeadId) return errorResponse('feeHeadId is required', 400);
  if (typeof amount !== 'number' || amount < 0) {
    return errorResponse('Amount must be a non-negative integer (PKR)', 400);
  }

  // Verify class exists
  const classRow = await env.DB.prepare(`
    SELECT id, name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(classId, scopedTenantId).first<{ id: string; name: string }>();
  if (!classRow) return errorResponse('Class not found in your school', 404);

  // Verify fee head exists
  const headRow = await env.DB.prepare(`
    SELECT id, name FROM fee_heads WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(feeHeadId, scopedTenantId).first<{ id: string; name: string }>();
  if (!headRow) return errorResponse('Fee head not found in your school', 404);

  const cleanAmount = Math.floor(amount);
  const id = `fs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Upsert
  await env.DB.prepare(`
    INSERT INTO fee_structures (
      id, tenant_id, class_id, class_name, fee_head_id, fee_head_name, amount, academic_session, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(tenant_id, class_id, fee_head_id, academic_session) DO UPDATE SET
      amount = excluded.amount,
      updated_at = datetime('now')
  `).bind(id, scopedTenantId, classId, classRow.name, feeHeadId, headRow.name, cleanAmount, session).run();

  await logFeeAudit(env, scopedTenantId, 'FEE_STRUCTURE_UPDATED', 'fee_structure', classId, {
    className: classRow.name,
    feeHeadName: headRow.name,
    amount: cleanAmount,
    session
  }, auth.user);

  return jsonResponse({
    message: 'Fee structure updated successfully',
    classId,
    className: classRow.name,
    feeHeadId,
    feeHeadName: headRow.name,
    amount: cleanAmount,
    academicSession: session
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 2. INVOICE / CHALLAN ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/fees/invoices
 * List invoices with filters and server-side role scoping.
 */
export async function handleGetInvoices(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const userRole = auth.user.role;
  if (userRole === 'teacher') {
    return errorResponse('Access denied: Teachers do not have authorization to access student fee records', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const classId = url.searchParams.get('classId');
  const studentId = url.searchParams.get('studentId');
  const feeMonth = url.searchParams.get('feeMonth');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  let query = `SELECT * FROM fee_invoices WHERE tenant_id = ?`;
  const params: unknown[] = [scopedTenantId];

  // Role Scoping:
  if (userRole === 'parent') {
    const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
    if (childIds.size === 0) {
      return jsonResponse([], 200, {}, scopedTenantId);
    }
    const placeholders = Array.from(childIds).map(() => '?').join(',');
    query += ` AND student_id IN (${placeholders})`;
    params.push(...Array.from(childIds));
  } else if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (!myStudentId) {
      return jsonResponse([], 200, {}, scopedTenantId);
    }
    query += ` AND student_id = ?`;
    params.push(myStudentId);
  }

  // Additional query filters
  if (classId && classId !== 'all') {
    query += ` AND class_id = ?`;
    params.push(classId);
  }
  if (studentId) {
    if (userRole === 'parent') {
      const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
      if (!childIds.has(studentId)) {
        return errorResponse('Access denied: You are not authorized to view this student\'s invoices', 403);
      }
    } else if (userRole === 'student') {
      const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
      if (myStudentId !== studentId) {
        return errorResponse('Access denied: You can only view your own fee invoices', 403);
      }
    }
    query += ` AND student_id = ?`;
    params.push(studentId);
  }
  if (feeMonth && feeMonth !== 'all') {
    query += ` AND fee_month = ?`;
    params.push(feeMonth);
  }
  if (status && status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    query += ` AND (LOWER(student_name) LIKE ? OR LOWER(admission_no) LIKE ? OR LOWER(invoice_no) LIKE ?)`;
    params.push(s, s, s);
  }

  query += ` ORDER BY due_date DESC, created_at DESC LIMIT 200`;

  const results = await env.DB.prepare(query).bind(...params).all<FeeInvoiceDbRow>();
  return jsonResponse(results.results.map(formatInvoice), 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/fees/invoices/:id
 * Retrieve single invoice with its payment history.
 */
export async function handleGetInvoiceById(invoiceId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const userRole = auth.user.role;
  if (userRole === 'teacher') {
    return errorResponse('Access denied: Teachers do not have authorization for fee invoices', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const invoice = await env.DB.prepare(`
    SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(invoiceId, scopedTenantId).first<FeeInvoiceDbRow>();

  if (!invoice) return errorResponse('Invoice not found in your school records', 404);

  // Authorization check for parent & student
  if (userRole === 'parent') {
    const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
    if (!childIds.has(invoice.student_id)) {
      return errorResponse('Access denied: You are not authorized to view this invoice', 403);
    }
  } else if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (myStudentId !== invoice.student_id) {
      return errorResponse('Access denied: You can only view your own invoices', 403);
    }
  }

  // Fetch payments for this invoice
  const payments = await env.DB.prepare(`
    SELECT * FROM fee_payments WHERE invoice_id = ? AND tenant_id = ? ORDER BY payment_date DESC, created_at DESC
  `).bind(invoiceId, scopedTenantId).all<FeePaymentDbRow>();

  return jsonResponse({
    invoice: formatInvoice(invoice),
    payments: payments.results.map(formatPayment)
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/fees/invoices
 * Generate single or bulk class fee invoices (school_admin, accountant, super_admin).
 */
export async function handleCreateInvoice(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'accountant', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    studentId?: string;
    classId?: string;
    feeMonth?: string;
    academicSession?: string;
    issueDate?: string;
    dueDate?: string;
    tuitionFee?: number;
    examFee?: number;
    admissionFee?: number;
    otherCharges?: number;
    discount?: number;
    concessionType?: string;
    concessionReason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const feeMonth = body.feeMonth?.trim();
  const issueDate = body.issueDate?.trim();
  const dueDate = body.dueDate?.trim();
  const session = body.academicSession?.trim() || '2026-2027';

  if (!feeMonth) return errorResponse('feeMonth is required (e.g. "November 2026")', 400);
  if (!issueDate || !DATE_REGEX.test(issueDate)) return errorResponse('Valid issueDate (YYYY-MM-DD) is required', 400);
  if (!dueDate || !DATE_REGEX.test(dueDate)) return errorResponse('Valid dueDate (YYYY-MM-DD) is required', 400);
  if (new Date(dueDate) < new Date(issueDate)) return errorResponse('dueDate cannot precede issueDate', 400);

  // 1. Single student invoice generation
  if (body.studentId) {
    const student = await env.DB.prepare(`
      SELECT id, name, admission_no, class_id, class_name, monthly_fee
      FROM students
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    `).bind(body.studentId, scopedTenantId).first<{
      id: string;
      name: string;
      admission_no: string;
      class_id: string;
      class_name: string;
      monthly_fee: number;
    }>();

    if (!student) return errorResponse('Student not found in your school records', 404);

    // Prevent duplicate invoice for student & fee_month
    const dupCheck = await env.DB.prepare(`
      SELECT id, invoice_no FROM fee_invoices WHERE tenant_id = ? AND student_id = ? AND fee_month = ? LIMIT 1
    `).bind(scopedTenantId, student.id, feeMonth).first<{ id: string; invoice_no: string }>();

    if (dupCheck) {
      return errorResponse(`An invoice (${dupCheck.invoice_no}) already exists for ${student.name} for ${feeMonth}`, 409);
    }

    const tuition = body.tuitionFee !== undefined ? Math.max(0, Math.floor(body.tuitionFee)) : student.monthly_fee;
    const exam = Math.max(0, Math.floor(body.examFee || 0));
    const admission = Math.max(0, Math.floor(body.admissionFee || 0));
    const other = Math.max(0, Math.floor(body.otherCharges || 0));
    const discount = Math.max(0, Math.floor(body.discount || 0));

    // Decimal-safe integer summation
    const subtotal = tuition + exam + admission + other;
    const cleanDiscount = Math.min(subtotal, discount);
    const totalAmount = Math.max(0, subtotal - cleanDiscount);
    const balance = totalAmount;
    const status: InvoiceStatus = 'pending';

    const invoiceId = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoiceNo = `INV-${new Date(issueDate).getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const feeItems = [
      { headName: 'Monthly Tuition Fee', amount: tuition },
      ...(exam > 0 ? [{ headName: 'Examination Fee', amount: exam }] : []),
      ...(admission > 0 ? [{ headName: 'Admission Fee', amount: admission }] : []),
      ...(other > 0 ? [{ headName: 'Other Charges', amount: other }] : [])
    ];

    await env.DB.prepare(`
      INSERT INTO fee_invoices (
        id, tenant_id, invoice_no, student_id, student_name, admission_no,
        class_id, class_name, fee_month, academic_session, issue_date, due_date,
        tuition_fee, exam_fee, admission_fee, other_charges, discount, late_fee,
        total_amount, amount_paid, balance, status, concession_type, concession_reason,
        concession_approved_by, fee_items_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      invoiceId,
      scopedTenantId,
      invoiceNo,
      student.id,
      student.name,
      student.admission_no,
      student.class_id,
      student.class_name,
      feeMonth,
      session,
      issueDate,
      dueDate,
      tuition,
      exam,
      admission,
      other,
      cleanDiscount,
      totalAmount,
      balance,
      status,
      body.concessionType?.trim() || null,
      body.concessionReason?.trim() || null,
      cleanDiscount > 0 ? auth.user.name : null,
      JSON.stringify(feeItems)
    ).run();

    await logFeeAudit(env, scopedTenantId, 'INVOICE_GENERATED', 'invoice', invoiceId, {
      invoiceNo,
      studentId: student.id,
      totalAmount,
      feeMonth
    }, auth.user);

    const created = await env.DB.prepare(`SELECT * FROM fee_invoices WHERE id = ?`).bind(invoiceId).first<FeeInvoiceDbRow>();
    return jsonResponse(formatInvoice(created!), 201, {}, scopedTenantId);
  }

  // 2. Bulk Class Invoice Generation
  if (body.classId) {
    const classRow = await env.DB.prepare(`
      SELECT id, name FROM school_classes WHERE id = ? AND tenant_id = ? LIMIT 1
    `).bind(body.classId, scopedTenantId).first<{ id: string; name: string }>();

    if (!classRow) return errorResponse('Class not found in your school records', 404);

    const students = await env.DB.prepare(`
      SELECT id, name, admission_no, monthly_fee FROM students WHERE tenant_id = ? AND class_id = ? AND status = 'active'
    `).bind(scopedTenantId, body.classId).all<{
      id: string;
      name: string;
      admission_no: string;
      monthly_fee: number;
    }>();

    if (students.results.length === 0) {
      return errorResponse('No active students found in this class to bill', 400);
    }

    let generatedCount = 0;
    let skippedCount = 0;

    for (const st of students.results) {
      // Check existing
      const existing = await env.DB.prepare(`
        SELECT id FROM fee_invoices WHERE tenant_id = ? AND student_id = ? AND fee_month = ? LIMIT 1
      `).bind(scopedTenantId, st.id, feeMonth).first();

      if (existing) {
        skippedCount++;
        continue;
      }

      const tuition = st.monthly_fee || 5000;
      const exam = Math.max(0, Math.floor(body.examFee || 0));
      const other = Math.max(0, Math.floor(body.otherCharges || 0));
      const totalAmount = tuition + exam + other;

      const invoiceId = `inv-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const invoiceNo = `INV-${new Date(issueDate).getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const feeItems = [
        { headName: 'Monthly Tuition Fee', amount: tuition },
        ...(exam > 0 ? [{ headName: 'Examination Fee', amount: exam }] : []),
        ...(other > 0 ? [{ headName: 'Other Charges', amount: other }] : [])
      ];

      await env.DB.prepare(`
        INSERT INTO fee_invoices (
          id, tenant_id, invoice_no, student_id, student_name, admission_no,
          class_id, class_name, fee_month, academic_session, issue_date, due_date,
          tuition_fee, exam_fee, admission_fee, other_charges, discount, late_fee,
          total_amount, amount_paid, balance, status, fee_items_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, 0, ?, 'pending', ?, datetime('now'), datetime('now'))
      `).bind(
        invoiceId,
        scopedTenantId,
        invoiceNo,
        st.id,
        st.name,
        st.admission_no,
        classRow.id,
        classRow.name,
        feeMonth,
        session,
        issueDate,
        dueDate,
        tuition,
        exam,
        other,
        totalAmount,
        totalAmount,
        JSON.stringify(feeItems)
      ).run();

      generatedCount++;
    }

    await logFeeAudit(env, scopedTenantId, 'BULK_INVOICES_GENERATED', 'class', body.classId, {
      className: classRow.name,
      feeMonth,
      generatedCount,
      skippedCount
    }, auth.user);

    return jsonResponse({
      message: `Bulk invoice generation complete for ${classRow.name}: ${generatedCount} created, ${skippedCount} skipped (already billed).`,
      generatedCount,
      skippedCount,
      feeMonth
    }, 201, {}, scopedTenantId);
  }

  return errorResponse('Either studentId or classId must be provided to generate invoices', 400);
}

/**
 * PUT /api/v1/fees/invoices/:id/concession
 * Apply authorized discount/scholarship or adjustment to an invoice.
 */
export async function handleApplyConcession(invoiceId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  // Authorized: school_admin, principal, super_admin (accountant cannot grant concessions without admin approval)
  const roleCheck = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    discount?: number;
    concessionType?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  if (typeof body.discount !== 'number' || body.discount < 0) {
    return errorResponse('Valid non-negative discount amount (PKR) is required', 400);
  }
  if (!body.reason || body.reason.trim().length < 3) {
    return errorResponse('Mandatory justification reason is required for fee concession/discount', 400);
  }

  const invoice = await env.DB.prepare(`
    SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(invoiceId, scopedTenantId).first<FeeInvoiceDbRow>();

  if (!invoice) return errorResponse('Invoice not found in your school records', 404);

  const subtotal = invoice.tuition_fee + invoice.exam_fee + invoice.admission_fee + invoice.other_charges + invoice.late_fee;
  if (body.discount > subtotal) {
    return errorResponse(`Discount (PKR ${body.discount}) cannot exceed the invoice subtotal (PKR ${subtotal})`, 400);
  }

  const newDiscount = Math.min(subtotal, Math.floor(body.discount));
  const newTotal = Math.max(0, subtotal - newDiscount);
  const newBalance = Math.max(0, newTotal - invoice.amount_paid);

  let newStatus: InvoiceStatus = invoice.status;
  if (newBalance === 0) newStatus = 'paid';
  else if (invoice.amount_paid > 0) newStatus = 'partial';
  else newStatus = isDateOverdue(invoice.due_date) ? 'overdue' : 'pending';

  await env.DB.prepare(`
    UPDATE fee_invoices
    SET discount = ?, total_amount = ?, balance = ?, status = ?,
        concession_type = ?, concession_reason = ?, concession_approved_by = ?,
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    newDiscount,
    newTotal,
    newBalance,
    newStatus,
    body.concessionType?.trim() || 'administrative',
    body.reason.trim().substring(0, 250),
    auth.user.name,
    invoiceId,
    scopedTenantId
  ).run();

  await logFeeAudit(env, scopedTenantId, 'CONCESSION_APPLIED', 'invoice', invoiceId, {
    invoiceNo: invoice.invoice_no,
    oldDiscount: invoice.discount,
    newDiscount,
    reason: body.reason.trim(),
    authorizedBy: auth.user.name
  }, auth.user);

  const updated = await env.DB.prepare(`SELECT * FROM fee_invoices WHERE id = ?`).bind(invoiceId).first<FeeInvoiceDbRow>();
  return jsonResponse(formatInvoice(updated!), 200, {}, scopedTenantId);
}

// ============================================================================
// 3. PAYMENT & RECEIPT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/fees/payments
 * Record a payment or partial payment against an invoice.
 * Features idempotency and duplicate submission prevention.
 */
export async function handleRecordPayment(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'accountant', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: {
    tenantId?: string;
    invoiceId?: string;
    amount?: number;
    paymentDate?: string;
    paymentMethod?: PaymentMethod;
    transactionRef?: string;
    receivedBy?: string;
    idempotencyKey?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const { invoiceId, paymentDate, paymentMethod, transactionRef, idempotencyKey } = body;

  if (!invoiceId) return errorResponse('invoiceId is required', 400);
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return errorResponse('Payment amount must be a positive integer greater than zero', 400);
  }
  const cleanAmount = Math.floor(body.amount);

  if (!paymentDate || !DATE_REGEX.test(paymentDate)) {
    return errorResponse('Valid paymentDate (YYYY-MM-DD) is required', 400);
  }

  if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return errorResponse(`Invalid paymentMethod. Allowed methods: ${VALID_PAYMENT_METHODS.join(', ')}`, 400);
  }

  // 1. Strict Idempotency Key Validation: Must be provided, non-empty, min 8 chars
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length < 8) {
    return errorResponse('Valid idempotencyKey (minimum 8 characters string/UUID) is required for payment creation', 400);
  }
  const cleanKey = idempotencyKey.trim();
  if (cleanKey.length > 128) {
    return errorResponse('idempotencyKey must not exceed 128 characters', 400);
  }

  // 2. Existing Idempotency Check with strict payload mismatch detection
  const existingPayment = await env.DB.prepare(`
    SELECT * FROM fee_payments WHERE tenant_id = ? AND idempotency_key = ? LIMIT 1
  `).bind(scopedTenantId, cleanKey).first<FeePaymentDbRow>();

  if (existingPayment) {
    const isMatchingPayload =
      existingPayment.invoice_id === invoiceId &&
      Number(existingPayment.amount) === cleanAmount &&
      existingPayment.payment_method === paymentMethod;

    if (!isMatchingPayload) {
      return errorResponse(
        'Idempotency key already used with different payment parameters (invoice, amount, or method mismatch)',
        409
      );
    }

    const existingInvoice = await env.DB.prepare(`
      SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
    `).bind(existingPayment.invoice_id, scopedTenantId).first<FeeInvoiceDbRow>();

    return jsonResponse({
      message: 'Payment already processed (idempotent)',
      payment: formatPayment(existingPayment),
      invoice: existingInvoice ? formatInvoice(existingInvoice) : undefined
    }, 200, {}, scopedTenantId);
  }

  // 3. Fetch invoice and validate balance bounds
  const invoice = await env.DB.prepare(`
    SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(invoiceId, scopedTenantId).first<FeeInvoiceDbRow>();

  if (!invoice) return errorResponse('Invoice not found in your school records', 404);

  if (invoice.balance <= 0) {
    return errorResponse('This invoice has already been fully paid in full', 400);
  }

  if (cleanAmount > invoice.balance) {
    return errorResponse(`Payment amount (PKR ${cleanAmount}) exceeds the remaining balance (PKR ${invoice.balance})`, 400);
  }

  // 4. Record Payment with DB unique constraint and concurrent race handling
  const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const receiptNo = `REC-${new Date(paymentDate).getFullYear()}${String(new Date(paymentDate).getMonth() + 1).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;
  const receivedBy = body.receivedBy?.trim() || `${auth.user.name} (${auth.user.role === 'accountant' ? 'Accountant' : 'Admin'})`;

  try {
    await env.DB.prepare(`
      INSERT INTO fee_payments (
        id, tenant_id, invoice_id, invoice_no, receipt_no, student_id, student_name,
        amount, payment_date, payment_method, transaction_ref, received_by,
        created_at, is_reversed, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, ?)
    `).bind(
      paymentId,
      scopedTenantId,
      invoice.id,
      invoice.invoice_no,
      receiptNo,
      invoice.student_id,
      invoice.student_name,
      cleanAmount,
      paymentDate,
      paymentMethod,
      transactionRef?.trim() || null,
      receivedBy,
      cleanKey
    ).run();
  } catch (err: any) {
    // Concurrent race condition handler on unique constraint
    const racePayment = await env.DB.prepare(`
      SELECT * FROM fee_payments WHERE tenant_id = ? AND idempotency_key = ? LIMIT 1
    `).bind(scopedTenantId, cleanKey).first<FeePaymentDbRow>();

    if (racePayment) {
      const isMatchingPayload =
        racePayment.invoice_id === invoiceId &&
        Number(racePayment.amount) === cleanAmount &&
        racePayment.payment_method === paymentMethod;

      if (!isMatchingPayload) {
        return errorResponse(
          'Idempotency key already used with different payment parameters (invoice, amount, or method mismatch)',
          409
        );
      }

      const raceInvoice = await env.DB.prepare(`
        SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
      `).bind(racePayment.invoice_id, scopedTenantId).first<FeeInvoiceDbRow>();

      return jsonResponse({
        message: 'Payment already processed (idempotent)',
        payment: formatPayment(racePayment),
        invoice: raceInvoice ? formatInvoice(raceInvoice) : undefined
      }, 200, {}, scopedTenantId);
    }
    throw err;
  }

  const newAmountPaid = invoice.amount_paid + cleanAmount;
  const newBalance = Math.max(0, invoice.total_amount - newAmountPaid);
  const newStatus: InvoiceStatus = newBalance === 0 ? 'paid' : 'partial';

  await env.DB.prepare(`
    UPDATE fee_invoices
    SET amount_paid = ?, balance = ?, status = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(newAmountPaid, newBalance, newStatus, invoice.id, scopedTenantId).run();

  await logFeeAudit(env, scopedTenantId, 'PAYMENT_RECORDED', 'payment', paymentId, {
    receiptNo,
    invoiceNo: invoice.invoice_no,
    studentName: invoice.student_name,
    amount: cleanAmount,
    newBalance
  }, auth.user);

  const createdPayment = await env.DB.prepare(`SELECT * FROM fee_payments WHERE id = ?`).bind(paymentId).first<FeePaymentDbRow>();
  const updatedInvoice = await env.DB.prepare(`SELECT * FROM fee_invoices WHERE id = ?`).bind(invoice.id).first<FeeInvoiceDbRow>();

  return jsonResponse({
    message: `Payment of PKR ${cleanAmount} recorded successfully`,
    payment: formatPayment(createdPayment!),
    invoice: formatInvoice(updatedInvoice!)
  }, 201, {}, scopedTenantId);
}

/**
 * GET /api/v1/fees/payments/:id/receipt
 * Retrieve full printable receipt data with school branding information.
 */
export async function handleGetReceipt(paymentId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const userRole = auth.user.role;
  if (userRole === 'teacher') {
    return errorResponse('Access denied: Teachers do not have authorization for payment receipts', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const payment = await env.DB.prepare(`
    SELECT * FROM fee_payments WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(paymentId, scopedTenantId).first<FeePaymentDbRow>();

  if (!payment) return errorResponse('Payment record not found', 404);

  // Role authorization
  if (userRole === 'parent') {
    const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
    if (!childIds.has(payment.student_id)) {
      return errorResponse('Access denied: You are not authorized to view this receipt', 403);
    }
  } else if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (myStudentId !== payment.student_id) {
      return errorResponse('Access denied: You can only view your own receipts', 403);
    }
  }

  const invoice = await env.DB.prepare(`
    SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(payment.invoice_id, scopedTenantId).first<FeeInvoiceDbRow>();

  const tenant = await env.DB.prepare(`
    SELECT id, name, slug, branding_school_name, branding_address, branding_phone, branding_email, branding_affiliation_board
    FROM tenants WHERE id = ? LIMIT 1
  `).bind(scopedTenantId).first<{
    id: string;
    name: string;
    slug: string;
    branding_school_name?: string;
    branding_address?: string;
    branding_phone?: string;
    branding_email?: string;
    branding_affiliation_board?: string;
  }>();

  return jsonResponse({
    receipt: formatPayment(payment),
    invoice: invoice ? formatInvoice(invoice) : null,
    school: {
      name: tenant?.branding_school_name || tenant?.name || 'TaleemCloud Academy',
      address: tenant?.branding_address || 'Lahore, Pakistan',
      phone: tenant?.branding_phone || '',
      email: tenant?.branding_email || '',
      affiliationBoard: tenant?.branding_affiliation_board || 'BISE Lahore'
    }
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/fees/payments/:id/reverse
 * Record an authorized payment reversal without deleting the transaction history.
 */
export async function handleReversePayment(paymentId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'accountant', 'super_admin']);
  if (roleCheck) return roleCheck;

  let body: { tenantId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  if (!body.reason || body.reason.trim().length < 5) {
    return errorResponse('Mandatory authorization reason (min 5 characters) is required for payment reversal/refund', 400);
  }

  const payment = await env.DB.prepare(`
    SELECT * FROM fee_payments WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(paymentId, scopedTenantId).first<FeePaymentDbRow>();

  if (!payment) return errorResponse('Payment record not found', 404);

  if (payment.is_reversed === 1) {
    return errorResponse('This payment has already been reversed', 409);
  }

  const invoice = await env.DB.prepare(`
    SELECT * FROM fee_invoices WHERE id = ? AND tenant_id = ? LIMIT 1
  `).bind(payment.invoice_id, scopedTenantId).first<FeeInvoiceDbRow>();

  if (!invoice) return errorResponse('Associated invoice not found', 404);

  const reversalId = `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. Mark payment as reversed atomically only if is_reversed is currently 0 (concurrency protection)
  const updateRes = await env.DB.prepare(`
    UPDATE fee_payments
    SET is_reversed = 1, reversal_id = ?
    WHERE id = ? AND tenant_id = ? AND is_reversed = 0
  `).bind(reversalId, payment.id, scopedTenantId).run();

  if (!updateRes.meta.changes || updateRes.meta.changes === 0) {
    return errorResponse('This payment has already been reversed or is being processed concurrently', 409);
  }

  // 2. Insert immutable reversal audit record
  await env.DB.prepare(`
    INSERT INTO payment_reversals (
      id, tenant_id, payment_id, invoice_id, receipt_no, amount, reason,
      reversed_by_user_id, reversed_by_user_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    reversalId,
    scopedTenantId,
    payment.id,
    payment.invoice_id,
    payment.receipt_no,
    payment.amount,
    body.reason.trim().substring(0, 250),
    auth.user.id,
    auth.user.name
  ).run();

  // 3. Re-adjust invoice balance safely ensuring bounds [0, total_amount]
  const newAmountPaid = Math.max(0, invoice.amount_paid - payment.amount);
  const newBalance = Math.min(invoice.total_amount, invoice.balance + payment.amount);
  let newStatus: InvoiceStatus = 'pending';
  if (newBalance === 0) newStatus = 'paid';
  else if (newAmountPaid > 0) newStatus = 'partial';
  else newStatus = isDateOverdue(invoice.due_date) ? 'overdue' : 'pending';

  await env.DB.prepare(`
    UPDATE fee_invoices
    SET amount_paid = ?, balance = ?, status = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(newAmountPaid, newBalance, newStatus, invoice.id, scopedTenantId).run();

  await logFeeAudit(env, scopedTenantId, 'PAYMENT_REVERSED', 'payment', payment.id, {
    reversalId,
    receiptNo: payment.receipt_no,
    amount: payment.amount,
    reason: body.reason.trim()
  }, auth.user);

  return jsonResponse({
    message: `Payment ${payment.receipt_no} reversed successfully`,
    reversalId,
    reversalAmount: payment.amount,
    newInvoiceBalance: newBalance
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 4. STUDENT FEE LEDGER ENDPOINT
// ============================================================================

/**
 * GET /api/v1/fees/students/:id/ledger
 * Complete student fee ledger and outstanding account balance.
 */
export async function handleGetStudentLedger(studentId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const userRole = auth.user.role;
  if (userRole === 'teacher') {
    return errorResponse('Access denied: Teachers do not have authorization for fee ledgers', 403);
  }

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // Authorization: parent can only access linked child, student only self
  if (userRole === 'parent') {
    const childIds = await getParentChildrenIds(env, scopedTenantId, auth.user);
    if (!childIds.has(studentId)) {
      return errorResponse('Access denied: You are not authorized to view this student\'s ledger', 403);
    }
  } else if (userRole === 'student') {
    const myStudentId = await getStudentIdForUser(env, scopedTenantId, auth.user);
    if (myStudentId !== studentId) {
      return errorResponse('Access denied: You can only view your own fee ledger', 403);
    }
  }

  const student = await env.DB.prepare(`
    SELECT id, name, admission_no, roll_no, class_id, class_name, section_name, monthly_fee
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
    section_name: string;
    monthly_fee: number;
  }>();

  if (!student) return errorResponse('Student not found in your school records', 404);

  const invoices = await env.DB.prepare(`
    SELECT * FROM fee_invoices WHERE student_id = ? AND tenant_id = ? ORDER BY issue_date ASC
  `).bind(studentId, scopedTenantId).all<FeeInvoiceDbRow>();

  const payments = await env.DB.prepare(`
    SELECT * FROM fee_payments WHERE student_id = ? AND tenant_id = ? ORDER BY payment_date ASC
  `).bind(studentId, scopedTenantId).all<FeePaymentDbRow>();

  const totalBilled = invoices.results.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = payments.results.filter(p => p.is_reversed === 0).reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  return jsonResponse({
    student: {
      id: student.id,
      name: student.name,
      admissionNo: student.admission_no,
      rollNo: student.roll_no,
      className: student.class_name,
      sectionName: student.section_name,
      monthlyFee: student.monthly_fee
    },
    financialSummary: {
      totalBilled,
      totalPaid,
      outstandingBalance,
      invoiceCount: invoices.results.length,
      paymentCount: payments.results.length
    },
    invoices: invoices.results.map(formatInvoice),
    payments: payments.results.map(formatPayment)
  }, 200, {}, scopedTenantId);
}

// ============================================================================
// 5. FINANCIAL REPORTS & AUDIT LOGS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/fees/reports/summary
 * School-wide financial summary and collection statistics.
 */
export async function handleGetFinancialSummary(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'principal', 'accountant', 'super_admin']);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const session = url.searchParams.get('session') || '2026-2027';
  const feeMonth = url.searchParams.get('feeMonth');

  let invQuery = `SELECT * FROM fee_invoices WHERE tenant_id = ?`;
  const invParams: unknown[] = [scopedTenantId];
  if (feeMonth && feeMonth !== 'all') {
    invQuery += ` AND fee_month = ?`;
    invParams.push(feeMonth);
  }

  const allInvoices = await env.DB.prepare(invQuery).bind(...invParams).all<FeeInvoiceDbRow>();

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let partialCount = 0;
  let overdueCount = 0;

  for (const inv of allInvoices.results) {
    const tot = Number(inv.total_amount || 0);
    const pd = Number(inv.amount_paid || 0);
    const bal = Number(inv.balance || 0);

    totalBilled += tot;
    totalPaid += pd;
    totalOutstanding += bal;

    if (inv.status === 'paid') paidCount++;
    else if (inv.status === 'partial') partialCount++;
    else if (inv.status === 'overdue') {
      overdueCount++;
      totalOverdue += bal;
    } else {
      pendingCount++;
    }
  }

  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

  // Breakdown by payment methods
  const methodsSummary = await env.DB.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(amount) as total
    FROM fee_payments
    WHERE tenant_id = ? AND is_reversed = 0
    GROUP BY payment_method
  `).bind(scopedTenantId).all<{ payment_method: string; count: number; total: number }>();

  // Class breakdown
  const classBreakdown = await env.DB.prepare(`
    SELECT class_name, COUNT(*) as total_invoices,
           SUM(total_amount) as total_billed,
           SUM(amount_paid) as total_collected,
           SUM(balance) as total_outstanding
    FROM fee_invoices
    WHERE tenant_id = ?
    GROUP BY class_id, class_name
  `).bind(scopedTenantId).all<{
    class_name: string;
    total_invoices: number;
    total_billed: number;
    total_collected: number;
    total_outstanding: number;
  }>();

  return jsonResponse({
    academicSession: session,
    feeMonth: feeMonth || 'all',
    metrics: {
      totalBilled,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      collectionRate,
      invoiceCount: allInvoices.results.length,
      paidCount,
      partialCount,
      pendingCount,
      overdueCount
    },
    paymentMethods: methodsSummary.results.map(m => ({
      method: m.payment_method,
      count: Number(m.count || 0),
      totalAmount: Number(m.total || 0)
    })),
    classes: classBreakdown.results.map(c => ({
      className: c.class_name,
      totalInvoices: Number(c.total_invoices || 0),
      totalBilled: Number(c.total_billed || 0),
      totalCollected: Number(c.total_collected || 0),
      totalOutstanding: Number(c.total_outstanding || 0)
    }))
  }, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/fees/audit-logs
 * Financial audit trail of invoice generation, concessions, payments, and reversals.
 */
export async function handleGetFeeAuditLogs(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) return error || errorResponse('Unauthorized', 401);

  const roleCheck = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const action = url.searchParams.get('action');

  let query = `SELECT * FROM fee_audit_logs WHERE tenant_id = ?`;
  const params: unknown[] = [scopedTenantId];

  if (action && action !== 'all') {
    query += ` AND action = ?`;
    params.push(action);
  }

  query += ` ORDER BY created_at DESC LIMIT 100`;

  const logs = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    tenant_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details_json: string;
    performed_by_user_id: string;
    performed_by_user_name: string | null;
    created_at: string;
  }>();

  return jsonResponse(logs.results.map(l => {
    let details: any = {};
    try {
      details = JSON.parse(l.details_json || '{}');
    } catch {
      details = {};
    }
    return {
      id: l.id,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details,
      performedByUserId: l.performed_by_user_id,
      performedByUserName: l.performed_by_user_name || 'System Admin',
      createdAt: l.created_at
    };
  }), 200, {}, scopedTenantId);
}
