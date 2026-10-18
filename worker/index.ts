// ============================================================================
// TaleemCloud Cloudflare Worker Entry Point
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env } from './types';
import { jsonResponse, errorResponse } from './utils/response';
import { handleHealthCheck, handleVersion } from './routes/health';
import { handleLogin, handleLogout, handleGetMe } from './routes/auth';
import { handleGetPublicTenant, handleGetCurrentTenant, handleListTenants } from './routes/tenants';
import {
  handleGetClasses,
  handleGetClassById,
  handleCreateClass,
  handleUpdateClass,
  handleDeleteClass
} from './routes/classes';
import {
  handleGetStudents,
  handleGetStudentById,
  handleCreateStudent,
  handleUpdateStudent,
  handleDeleteStudent
} from './routes/students';
import {
  handleGetTeachers,
  handleGetTeacherById,
  handleCreateTeacher,
  handleUpdateTeacher,
  handleDeleteTeacher
} from './routes/teachers';
import {
  handleUploadProfilePicture,
  handleDeleteProfilePicture,
  handleGetProfilePicture
} from './routes/media';
import {
  handleGetUsers,
  handleGetUserById,
  handleCreateUser,
  handleUpdateUser,
  handleUpdateUserStatus,
  handleResetPassword,
  handleRevokeSessions
} from './routes/users';
import {
  handleGetAttendance,
  handleSaveBatchAttendance,
  handleGetStudentAttendance,
  handleGetAttendanceSummary,
  handleCorrectAttendance,
  handleGetAttendanceCorrections
} from './routes/attendance';
import {
  handleGetFeeHeads,
  handleCreateFeeHead,
  handleGetFeeStructures,
  handleSetFeeStructure,
  handleGetInvoices,
  handleGetInvoiceById,
  handleCreateInvoice,
  handleApplyConcession,
  handleRecordPayment,
  handleGetReceipt,
  handleReversePayment,
  handleGetStudentLedger,
  handleGetFinancialSummary,
  handleGetFeeAuditLogs
} from './routes/fees';

function handleCors(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle CORS Preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 2. Only intercept /api/* routes
    if (!path.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // ----------------------------------------------------------------------
      // Health & System Information Endpoints
      // ----------------------------------------------------------------------
      if (path === '/api/v1/health' && method === 'GET') {
        return await handleHealthCheck(env);
      }
      if (path === '/api/v1/version' && method === 'GET') {
        return handleVersion();
      }

      // ----------------------------------------------------------------------
      // Authentication Endpoints
      // ----------------------------------------------------------------------
      if (path === '/api/v1/auth/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      if (path === '/api/v1/auth/logout' && method === 'POST') {
        return await handleLogout(request, env);
      }
      if (path === '/api/v1/auth/me' && method === 'GET') {
        return await handleGetMe(request, env);
      }

      // ----------------------------------------------------------------------
      // Tenants & School Endpoints
      // ----------------------------------------------------------------------
      if (path.startsWith('/api/v1/tenants/public/') && method === 'GET') {
        const slug = path.replace('/api/v1/tenants/public/', '');
        return await handleGetPublicTenant(slug, env);
      }
      if (path === '/api/v1/tenants/current' && method === 'GET') {
        return await handleGetCurrentTenant(request, env);
      }
      if (path === '/api/v1/tenants' && method === 'GET') {
        return await handleListTenants(request, env);
      }

      // ----------------------------------------------------------------------
      // Classes & Academics Endpoints
      // ----------------------------------------------------------------------
      if (path === '/api/v1/classes' && method === 'GET') {
        return await handleGetClasses(request, env);
      }
      if (path === '/api/v1/classes' && method === 'POST') {
        return await handleCreateClass(request, env);
      }
      if (path.startsWith('/api/v1/classes/') && method === 'GET') {
        const classId = path.replace('/api/v1/classes/', '').split('/')[0];
        return await handleGetClassById(classId, request, env);
      }
      if (path.startsWith('/api/v1/classes/') && method === 'PUT') {
        const classId = path.replace('/api/v1/classes/', '').split('/')[0];
        return await handleUpdateClass(classId, request, env);
      }
      if (path.startsWith('/api/v1/classes/') && method === 'DELETE') {
        const classId = path.replace('/api/v1/classes/', '').split('/')[0];
        return await handleDeleteClass(classId, request, env);
      }

      // ----------------------------------------------------------------------
      // Students Endpoints
      // ----------------------------------------------------------------------
      if (path === '/api/v1/students' && method === 'GET') {
        return await handleGetStudents(request, env);
      }
      if (path === '/api/v1/students' && method === 'POST') {
        return await handleCreateStudent(request, env);
      }
      // Student photo upload / removal
      if (path.startsWith('/api/v1/students/') && path.endsWith('/photo')) {
        const parts = path.split('/');
        const studentId = parts[4];
        if (method === 'POST') return await handleUploadProfilePicture('students', studentId, request, env);
        if (method === 'DELETE') return await handleDeleteProfilePicture('students', studentId, request, env);
      }
      if (path.startsWith('/api/v1/students/') && method === 'GET') {
        const studentId = path.replace('/api/v1/students/', '').split('/')[0];
        return await handleGetStudentById(studentId, request, env);
      }
      if (path.startsWith('/api/v1/students/') && method === 'PUT') {
        const studentId = path.replace('/api/v1/students/', '').split('/')[0];
        return await handleUpdateStudent(studentId, request, env);
      }
      if (path.startsWith('/api/v1/students/') && method === 'DELETE') {
        const studentId = path.replace('/api/v1/students/', '').split('/')[0];
        return await handleDeleteStudent(studentId, request, env);
      }

      // ----------------------------------------------------------------------
      // Teachers & Staff Endpoints
      // ----------------------------------------------------------------------
      if (path === '/api/v1/teachers' && method === 'GET') {
        return await handleGetTeachers(request, env);
      }
      if (path === '/api/v1/teachers' && method === 'POST') {
        return await handleCreateTeacher(request, env);
      }
      // Teacher photo upload / removal
      if (path.startsWith('/api/v1/teachers/') && path.endsWith('/photo')) {
        const parts = path.split('/');
        const teacherId = parts[4];
        if (method === 'POST') return await handleUploadProfilePicture('teachers', teacherId, request, env);
        if (method === 'DELETE') return await handleDeleteProfilePicture('teachers', teacherId, request, env);
      }
      if (path.startsWith('/api/v1/teachers/') && method === 'GET') {
        const teacherId = path.replace('/api/v1/teachers/', '').split('/')[0];
        return await handleGetTeacherById(teacherId, request, env);
      }
      if (path.startsWith('/api/v1/teachers/') && method === 'PUT') {
        const teacherId = path.replace('/api/v1/teachers/', '').split('/')[0];
        return await handleUpdateTeacher(teacherId, request, env);
      }
      if (path.startsWith('/api/v1/teachers/') && method === 'DELETE') {
        const teacherId = path.replace('/api/v1/teachers/', '').split('/')[0];
        return await handleDeleteTeacher(teacherId, request, env);
      }

      // ----------------------------------------------------------------------
      // Media & Private Avatar Delivery Endpoint (Cloudflare R2)
      // ----------------------------------------------------------------------
      if (path.startsWith('/api/v1/media/avatar/') && method === 'GET') {
        // e.g. /api/v1/media/avatar/students/student-1 or /api/v1/media/avatar/teachers/teacher-1
        const parts = path.replace('/api/v1/media/avatar/', '').split('/');
        const entityType = parts[0] as 'students' | 'teachers';
        const entityId = parts[1];
        if ((entityType === 'students' || entityType === 'teachers') && entityId) {
          return await handleGetProfilePicture(entityType, entityId, request, env);
        }
      }

      // ----------------------------------------------------------------------
      // User Management Endpoints (Admin RBAC)
      // ----------------------------------------------------------------------
      if (path === '/api/v1/users' && method === 'GET') {
        return await handleGetUsers(request, env);
      }
      if (path === '/api/v1/users' && method === 'POST') {
        return await handleCreateUser(request, env);
      }
      if (path.startsWith('/api/v1/users/') && path.endsWith('/status') && (method === 'PATCH' || method === 'PUT')) {
        const parts = path.split('/');
        const userId = parts[4];
        return await handleUpdateUserStatus(userId, request, env);
      }
      if (path.startsWith('/api/v1/users/') && path.endsWith('/reset-password') && method === 'POST') {
        const parts = path.split('/');
        const userId = parts[4];
        return await handleResetPassword(userId, request, env);
      }
      if (path.startsWith('/api/v1/users/') && path.endsWith('/revoke-sessions') && method === 'POST') {
        const parts = path.split('/');
        const userId = parts[4];
        return await handleRevokeSessions(userId, request, env);
      }
      if (path.startsWith('/api/v1/users/') && method === 'GET') {
        const userId = path.replace('/api/v1/users/', '').split('/')[0];
        return await handleGetUserById(userId, request, env);
      }
      if (path.startsWith('/api/v1/users/') && method === 'PUT') {
        const userId = path.replace('/api/v1/users/', '').split('/')[0];
        return await handleUpdateUser(userId, request, env);
      }

      // ----------------------------------------------------------------------
      // Attendance Endpoints (Tenant-Scoped, Audited Daily Roll Call)
      // ----------------------------------------------------------------------
      if (path === '/api/v1/attendance/summary' && method === 'GET') {
        return await handleGetAttendanceSummary(request, env);
      }
      if (path === '/api/v1/attendance/corrections' && method === 'GET') {
        return await handleGetAttendanceCorrections(request, env);
      }
      if (path.startsWith('/api/v1/attendance/student/') && method === 'GET') {
        const studentId = path.replace('/api/v1/attendance/student/', '').split('/')[0];
        return await handleGetStudentAttendance(studentId, request, env);
      }
      if (path === '/api/v1/attendance/batch' && method === 'POST') {
        return await handleSaveBatchAttendance(request, env);
      }
      if (path === '/api/v1/attendance' && method === 'POST') {
        return await handleSaveBatchAttendance(request, env);
      }
      if (path.startsWith('/api/v1/attendance/') && (path.endsWith('/correct') || method === 'PUT')) {
        const parts = path.replace('/api/v1/attendance/', '').split('/');
        const recordId = parts[0];
        return await handleCorrectAttendance(recordId, request, env);
      }
      if (path === '/api/v1/attendance' && method === 'GET') {
        return await handleGetAttendance(request, env);
      }

      // ----------------------------------------------------------------------
      // Fee, Invoices, Payments & Financial Report Endpoints (Stage 6)
      // ----------------------------------------------------------------------
      if (path === '/api/v1/fees/heads' && method === 'GET') {
        return await handleGetFeeHeads(request, env);
      }
      if (path === '/api/v1/fees/heads' && method === 'POST') {
        return await handleCreateFeeHead(request, env);
      }
      if (path === '/api/v1/fees/structures' && method === 'GET') {
        return await handleGetFeeStructures(request, env);
      }
      if (path === '/api/v1/fees/structures' && method === 'POST') {
        return await handleSetFeeStructure(request, env);
      }
      if (path === '/api/v1/fees/reports/summary' && method === 'GET') {
        return await handleGetFinancialSummary(request, env);
      }
      if (path === '/api/v1/fees/audit-logs' && method === 'GET') {
        return await handleGetFeeAuditLogs(request, env);
      }
      if (path.startsWith('/api/v1/fees/students/') && path.endsWith('/ledger') && method === 'GET') {
        const studentId = path.replace('/api/v1/fees/students/', '').replace('/ledger', '').split('/')[0];
        return await handleGetStudentLedger(studentId, request, env);
      }
      if (path.startsWith('/api/v1/fees/payments/') && path.endsWith('/reverse') && method === 'POST') {
        const paymentId = path.replace('/api/v1/fees/payments/', '').replace('/reverse', '').split('/')[0];
        return await handleReversePayment(paymentId, request, env);
      }
      if (path.startsWith('/api/v1/fees/payments/') && path.endsWith('/receipt') && method === 'GET') {
        const paymentId = path.replace('/api/v1/fees/payments/', '').replace('/receipt', '').split('/')[0];
        return await handleGetReceipt(paymentId, request, env);
      }
      if (path === '/api/v1/fees/payments' && method === 'POST') {
        return await handleRecordPayment(request, env);
      }
      if (path.startsWith('/api/v1/fees/invoices/') && path.endsWith('/concession') && method === 'PUT') {
        const invoiceId = path.replace('/api/v1/fees/invoices/', '').replace('/concession', '').split('/')[0];
        return await handleApplyConcession(invoiceId, request, env);
      }
      if (path.startsWith('/api/v1/fees/invoices/') && method === 'GET') {
        const invoiceId = path.replace('/api/v1/fees/invoices/', '').split('/')[0];
        return await handleGetInvoiceById(invoiceId, request, env);
      }
      if (path === '/api/v1/fees/invoices' && method === 'GET') {
        return await handleGetInvoices(request, env);
      }
      if (path === '/api/v1/fees/invoices' && method === 'POST') {
        return await handleCreateInvoice(request, env);
      }

      // ----------------------------------------------------------------------
      // Fallback 404 for unhandled API paths
      // ----------------------------------------------------------------------
      return errorResponse(`Endpoint not found: ${method} ${path}`, 404);

    } catch (err) {
      console.error('Unhandled Worker API Exception:', err);
      return errorResponse(
        'Internal Server Error in Cloudflare Worker',
        500,
        env.ENVIRONMENT === 'development' ? (err as Error).message : null
      );
    }
  }
};
