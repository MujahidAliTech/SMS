// ============================================================================
// User Management Route Handlers (Tenant-Scoped RBAC & Credential Security)
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env, AuthUser, UserRole } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';
import { generateRandomToken, hashPassword } from '../utils/crypto';

interface UserDbRow {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  linked_entity_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Format database user row safely.
 * Under NO circumstances are password hashes, salts, or token secrets exposed.
 */
function formatUser(row: UserDbRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined,
    linkedEntityId: row.linked_entity_id ?? undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const ALLOWED_SCHOOL_ROLES: UserRole[] = [
  'school_admin',
  'principal',
  'teacher',
  'accountant',
  'parent',
  'student'
];

/**
 * Helper to revoke all active sessions for a user
 */
async function revokeAllUserSessions(userId: string, env: Env): Promise<number> {
  const result = await env.DB.prepare(`
    UPDATE user_sessions
    SET revoked_at = datetime('now')
    WHERE user_id = ? AND revoked_at IS NULL
  `).bind(userId).run();

  return (result.meta?.changes as number) || 0;
}

/**
 * GET /api/v1/users
 * Lists users in the caller's tenant.
 * Authorized for school_admin and super_admin only.
 */
export async function handleGetUsers(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  // Only School Admin and Super Admin can manage users
  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const search = url.searchParams.get('search')?.toLowerCase().trim() || '';
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');

  let query = `SELECT * FROM users WHERE 1=1`;
  const params: unknown[] = [];

  // Super admin can filter by tenant or view platform users
  if (auth.user.role === 'super_admin') {
    if (scopedTenantId) {
      query += ` AND tenant_id = ?`;
      params.push(scopedTenantId);
    }
  } else {
    // School admin is strictly scoped to their tenant
    query += ` AND tenant_id = ?`;
    params.push(scopedTenantId);
  }

  if (role && role !== 'all') {
    query += ` AND role = ?`;
    params.push(role);
  }

  if (status && status !== 'all') {
    query += ` AND is_active = ?`;
    params.push(status === 'active' ? 1 : 0);
  }

  if (search) {
    query += ` AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)`;
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard);
  }

  query += ` ORDER BY created_at DESC`;

  const results = await env.DB.prepare(query).bind(...params).all<UserDbRow>();
  const formatted = results.results.map(formatUser);

  return jsonResponse(formatted, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/users/:id
 */
export async function handleGetUserById(userId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  let query = `SELECT * FROM users WHERE id = ?`;
  const params: unknown[] = [userId];

  if (auth.user.role !== 'super_admin') {
    query += ` AND tenant_id = ?`;
    params.push(scopedTenantId);
  }

  const user = await env.DB.prepare(query).bind(...params).first<UserDbRow>();

  if (!user) {
    return errorResponse('User account not found', 404);
  }

  return jsonResponse(formatUser(user), 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/users
 * Creates a new user account with credentials and role assignment.
 */
export async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  let body: {
    tenantId?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    password?: string;
    linkedEntityId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const phone = body.phone?.trim() || null;
  const role = body.role;
  const password = body.password;
  const linkedEntityId = body.linkedEntityId?.trim() || null;

  if (!name || !email || !role || !password) {
    return errorResponse('Required fields missing: name, email, role, and password are mandatory', 400);
  }

  // Privilege Escalation Check:
  // School admins cannot create super_admin accounts
  if (role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Access denied: School administrators cannot create super_admin accounts', 403);
  }

  if (!ALLOWED_SCHOOL_ROLES.includes(role) && role !== 'super_admin') {
    return errorResponse(`Invalid role specified: '${role}'`, 400);
  }

  // Password validation: Minimum 8 characters
  if (password.length < 8) {
    return errorResponse('Password must be at least 8 characters long', 400);
  }

  // Check email uniqueness across platform
  const existing = await env.DB.prepare(`
    SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1
  `).bind(email).first();

  if (existing) {
    return errorResponse(`An account with email "${email}" already exists`, 409);
  }

  const userId = `user-${Date.now()}-${generateRandomToken(4)}`;
  const tenantToAssign = role === 'super_admin' ? null : scopedTenantId;

  // Generate individual salt & hash password using PBKDF2-SHA256 (100,000 iterations)
  const saltHex = generateRandomToken(32);
  const hashHex = await hashPassword(password, saltHex);

  try {
    // 1. Insert user profile
    await env.DB.prepare(`
      INSERT INTO users (id, tenant_id, name, email, phone, role, linked_entity_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).bind(userId, tenantToAssign, name, email, phone, role, linkedEntityId).run();

    // 2. Insert credentials
    await env.DB.prepare(`
      INSERT INTO user_credentials (user_id, password_hash, password_salt, failed_attempts, password_changed_at, updated_at)
      VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))
    `).bind(userId, hashHex, saltHex).run();

    const createdUser = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ? LIMIT 1
    `).bind(userId).first<UserDbRow>();

    if (!createdUser) {
      return errorResponse('User created but failed to retrieve profile', 500);
    }

    return jsonResponse(formatUser(createdUser), 201, {}, scopedTenantId);
  } catch (err) {
    return errorResponse(`Failed to create user account: ${(err as Error).message}`, 400);
  }
}

/**
 * PUT /api/v1/users/:id
 * Updates permitted user fields and role.
 * Automatically revokes active sessions if role changes.
 */
export async function handleUpdateUser(userId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  let body: {
    tenantId?: string;
    name?: string;
    phone?: string;
    role?: UserRole;
    linkedEntityId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body in request', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Verify target user exists and belongs to tenant
  let targetUserQuery = `SELECT * FROM users WHERE id = ?`;
  const queryParams: unknown[] = [userId];

  if (auth.user.role !== 'super_admin') {
    targetUserQuery += ` AND tenant_id = ?`;
    queryParams.push(scopedTenantId);
  }

  const existing = await env.DB.prepare(targetUserQuery).bind(...queryParams).first<UserDbRow>();

  if (!existing) {
    return errorResponse('User not found in your tenant', 404);
  }

  // 2. Privilege Escalation Prevention:
  // School admin cannot modify super_admin user or assign super_admin role
  if (existing.role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Access denied: You cannot modify a platform super_admin account', 403);
  }

  if (body.role && body.role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Access denied: School administrators cannot grant super_admin privileges', 403);
  }

  const updatedName = body.name !== undefined ? body.name.trim() : existing.name;
  const updatedPhone = body.phone !== undefined ? body.phone.trim() : existing.phone;
  const updatedRole = body.role !== undefined ? body.role : existing.role;
  const updatedLinkedEntityId = body.linkedEntityId !== undefined ? body.linkedEntityId.trim() : existing.linked_entity_id;

  if (updatedRole !== existing.role && !ALLOWED_SCHOOL_ROLES.includes(updatedRole) && updatedRole !== 'super_admin') {
    return errorResponse(`Invalid role '${updatedRole}'`, 400);
  }

  const roleChanged = updatedRole !== existing.role;

  try {
    await env.DB.prepare(`
      UPDATE users
      SET name = ?, phone = ?, role = ?, linked_entity_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(updatedName, updatedPhone, updatedRole, updatedLinkedEntityId, userId).run();

    // 3. Security Policy: If role changed, immediately revoke all existing sessions
    if (roleChanged) {
      await revokeAllUserSessions(userId, env);
    }

    const updated = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ? LIMIT 1
    `).bind(userId).first<UserDbRow>();

    return jsonResponse(formatUser(updated!), 200, {}, scopedTenantId);
  } catch (err) {
    return errorResponse(`Failed to update user: ${(err as Error).message}`, 400);
  }
}

/**
 * PATCH or PUT /api/v1/users/:id/status
 * Activates or deactivates an account.
 * Immediately revokes active sessions upon deactivation.
 */
export async function handleUpdateUserStatus(userId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  let body: { tenantId?: string; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (body.isActive === undefined) {
    return errorResponse('isActive boolean field is required', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Verify existence in tenant
  let targetQuery = `SELECT * FROM users WHERE id = ?`;
  const params: unknown[] = [userId];

  if (auth.user.role !== 'super_admin') {
    targetQuery += ` AND tenant_id = ?`;
    params.push(scopedTenantId);
  }

  const target = await env.DB.prepare(targetQuery).bind(...params).first<UserDbRow>();

  if (!target) {
    return errorResponse('User account not found', 404);
  }

  // 2. Prevent self-deactivation
  if (target.id === auth.user.id && !body.isActive) {
    return errorResponse('Cannot deactivate your own active administrator account', 400);
  }

  // 3. Privilege protection
  if (target.role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Access denied: Cannot deactivate a platform super_admin account', 403);
  }

  const newActiveValue = body.isActive ? 1 : 0;

  await env.DB.prepare(`
    UPDATE users
    SET is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(newActiveValue, userId).run();

  // 4. Session Revocation: If deactivated, terminate all active sessions immediately
  if (!body.isActive) {
    await revokeAllUserSessions(userId, env);
  }

  return jsonResponse({
    id: userId,
    isActive: body.isActive,
    message: body.isActive ? 'User account activated' : 'User account deactivated and active sessions revoked'
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/users/:id/reset-password
 * Administrator-initiated secure password change.
 * Immediately invalidates all existing sessions for the target user.
 */
export async function handleResetPassword(userId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  let body: { tenantId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const newPassword = body.password;
  if (!newPassword || newPassword.length < 8) {
    return errorResponse('Password must be at least 8 characters long', 400);
  }

  const scopedTenantId = enforceTenantScoping(auth, body.tenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Verify existence in tenant
  let targetQuery = `SELECT * FROM users WHERE id = ?`;
  const params: unknown[] = [userId];

  if (auth.user.role !== 'super_admin') {
    targetQuery += ` AND tenant_id = ?`;
    params.push(scopedTenantId);
  }

  const target = await env.DB.prepare(targetQuery).bind(...params).first<UserDbRow>();

  if (!target) {
    return errorResponse('User account not found', 404);
  }

  // 2. Privilege protection
  if (target.role === 'super_admin' && auth.user.role !== 'super_admin') {
    return errorResponse('Access denied: Cannot reset password for a super_admin account', 403);
  }

  // 3. Generate salt & hash password
  const saltHex = generateRandomToken(32);
  const hashHex = await hashPassword(newPassword, saltHex);

  await env.DB.prepare(`
    UPDATE user_credentials
    SET password_hash = ?, password_salt = ?, failed_attempts = 0, locked_until = NULL,
        password_changed_at = datetime('now'), updated_at = datetime('now')
    WHERE user_id = ?
  `).bind(hashHex, saltHex, userId).run();

  // 4. Session Revocation: Invalidate all active sessions for the target user
  const revokedCount = await revokeAllUserSessions(userId, env);

  return jsonResponse({
    id: userId,
    message: 'Password reset successfully. All active sessions have been terminated.',
    revokedSessions: revokedCount
  }, 200, {}, scopedTenantId);
}

/**
 * POST /api/v1/users/:id/revoke-sessions
 * Manually revokes all active sessions for an account.
 */
export async function handleRevokeSessions(userId: string, request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'super_admin']);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // Verify target user in tenant
  let targetQuery = `SELECT id FROM users WHERE id = ?`;
  const params: unknown[] = [userId];

  if (auth.user.role !== 'super_admin') {
    targetQuery += ` AND tenant_id = ?`;
    params.push(scopedTenantId);
  }

  const target = await env.DB.prepare(targetQuery).bind(...params).first();
  if (!target) {
    return errorResponse('User not found', 404);
  }

  const revokedCount = await revokeAllUserSessions(userId, env);

  return jsonResponse({
    id: userId,
    message: 'All active sessions have been revoked.',
    revokedSessions: revokedCount
  }, 200, {}, scopedTenantId);
}
