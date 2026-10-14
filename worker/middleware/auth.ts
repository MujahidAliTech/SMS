// ============================================================================
// Authentication & Multi-Tenant Security Middleware
// ============================================================================

import { Env, AuthContext, AuthUser, AuthTenant } from '../types';
import { sha256Hash } from '../utils/crypto';
import { errorResponse } from '../utils/response';

export const SESSION_COOKIE_NAME = 'tc_session';

/**
 * Extracts session token from HttpOnly cookie or Authorization Bearer header.
 */
export function extractToken(request: Request): string | null {
  // 1. Check Cookie header
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        return decodeURIComponent(c.substring(SESSION_COOKIE_NAME.length + 1));
      }
    }
  }

  // 2. Fallback to Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Validates CSRF for state-changing requests when using cookie-based authentication.
 */
export function validateCsrf(request: Request): Response | null {
  const method = request.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  // If request uses Authorization Bearer, CSRF is not applicable
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return null;
  }

  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const requestHost = new URL(request.url).host;
      if (
        originHost !== requestHost &&
        !originHost.includes('localhost') &&
        !originHost.includes('127.0.0.1')
      ) {
        return errorResponse('CSRF violation: Cross-origin state mutation rejected', 403);
      }
    } catch {
      return errorResponse('CSRF violation: Malformed Origin header', 403);
    }
  }

  return null;
}

/**
 * Authenticates request by resolving token hash in D1 user_sessions table.
 * Crucially derives the authorized tenant strictly from the server-side database.
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<{ auth: AuthContext | null; error?: Response }> {
  // Check CSRF protection for cookie-based mutative operations
  const csrfError = validateCsrf(request);
  if (csrfError) {
    return { auth: null, error: csrfError };
  }

  const token = extractToken(request);
  if (!token) {
    return { auth: null, error: errorResponse('Authentication required: Missing session token', 401) };
  }

  const tokenHash = await sha256Hash(token);

  // Look up active session joined with user details
  const sessionRecord = await env.DB.prepare(`
    SELECT 
      s.id as session_id,
      s.expires_at,
      s.revoked_at,
      s.tenant_id as session_tenant_id,
      u.id as user_id,
      u.tenant_id as user_tenant_id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.avatar_url,
      u.linked_entity_id,
      u.is_active
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL
    LIMIT 1
  `).bind(tokenHash).first<{
    session_id: string;
    expires_at: string;
    revoked_at: string | null;
    session_tenant_id: string | null;
    user_id: string;
    user_tenant_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    role: AuthUser['role'];
    avatar_url: string | null;
    linked_entity_id: string | null;
    is_active: number;
  }>();

  if (!sessionRecord) {
    return { auth: null, error: errorResponse('Invalid or expired session', 401) };
  }

  if (sessionRecord.is_active !== 1) {
    return { auth: null, error: errorResponse('User account has been deactivated', 403) };
  }

  // Check expiration timestamp
  const now = new Date().toISOString();
  if (sessionRecord.expires_at < now) {
    return { auth: null, error: errorResponse('Session has expired. Please log in again', 401) };
  }

  const tenantId = sessionRecord.user_tenant_id || sessionRecord.session_tenant_id;
  let tenant: AuthTenant | null = null;

  if (tenantId) {
    tenant = await env.DB.prepare(`
      SELECT id, slug, name, type, status, plan_id
      FROM tenants
      WHERE id = ?
      LIMIT 1
    `).bind(tenantId).first<AuthTenant>();

    if (tenant && tenant.status === 'suspended') {
      return { auth: null, error: errorResponse('This school institution has been suspended by platform administration', 403) };
    }
  }

  const user: AuthUser = {
    id: sessionRecord.user_id,
    tenantId: tenantId ?? null,
    name: sessionRecord.name,
    email: sessionRecord.email,
    phone: sessionRecord.phone,
    role: sessionRecord.role,
    avatarUrl: sessionRecord.avatar_url,
    linkedEntityId: sessionRecord.linked_entity_id
  };

  return {
    auth: {
      user,
      tenant,
      sessionId: sessionRecord.session_id
    }
  };
}

/**
 * Enforces role-based permissions on an authenticated request.
 */
export function requireRoles(
  auth: AuthContext,
  allowedRoles: AuthUser['role'][]
): Response | null {
  if (!allowedRoles.includes(auth.user.role)) {
    return errorResponse(
      `Access denied: Role '${auth.user.role}' is not authorized for this action`,
      403
    );
  }
  return null;
}

/**
 * Enforces strict multi-tenant isolation.
 * Prevents any user from querying or modifying a tenant they do not belong to.
 */
export function enforceTenantScoping(
  auth: AuthContext,
  requestedTenantId: string | undefined | null
): string | Response {
  // Super admin can access any tenant if requested, or their own
  if (auth.user.role === 'super_admin') {
    return requestedTenantId || (auth.tenant ? auth.tenant.id : '');
  }

  // School-level users MUST only access their own tenant
  const userTenantId = auth.tenant?.id || auth.user.tenantId;
  if (!userTenantId) {
    return errorResponse('User is not assigned to any school tenant', 403);
  }

  if (requestedTenantId && requestedTenantId !== userTenantId) {
    return errorResponse(
      'Cross-tenant violation: You cannot access records belonging to another school',
      403
    );
  }

  return userTenantId;
}
