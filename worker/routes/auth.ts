// ============================================================================
// Authentication Route Handlers (Login, Logout, Session Verification)
// ============================================================================

import { Env, AuthContext } from '../types';
import { generateRandomToken, sha256Hash, verifyPassword } from '../utils/crypto';
import { jsonResponse, errorResponse } from '../utils/response';
import { SESSION_COOKIE_NAME, authenticateRequest } from '../middleware/auth';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 Days

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload in request body', 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return errorResponse('Email and password are required', 400);
  }

  // 1. Fetch user by email
  const user = await env.DB.prepare(`
    SELECT id, tenant_id, name, email, phone, role, avatar_url, linked_entity_id, is_active
    FROM users
    WHERE email = ?
    LIMIT 1
  `).bind(email.toLowerCase().trim()).first<{
    id: string;
    tenant_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    avatar_url: string | null;
    linked_entity_id: string | null;
    is_active: number;
  }>();

  if (!user) {
    // Avoid user enumeration
    return errorResponse('Invalid email or password credentials', 401);
  }

  if (user.is_active !== 1) {
    return errorResponse('Account has been disabled. Please contact your school administrator', 403);
  }

  // 2. Fetch credentials
  const creds = await env.DB.prepare(`
    SELECT password_hash, password_salt, failed_attempts, locked_until
    FROM user_credentials
    WHERE user_id = ?
    LIMIT 1
  `).bind(user.id).first<{
    password_hash: string;
    password_salt: string;
    failed_attempts: number;
    locked_until: string | null;
  }>();

  if (!creds) {
    return errorResponse('Credentials are not configured for this account', 401);
  }

  // Check lockout
  const now = new Date();
  if (creds.locked_until && new Date(creds.locked_until) > now) {
    return errorResponse('Account is temporarily locked due to excessive failed attempts. Please try again later', 429);
  }

  // 3. Verify password via PBKDF2
  const isValid = await verifyPassword(password, creds.password_salt, creds.password_hash);
  if (!isValid) {
    // Increment failed attempts
    const newAttempts = creds.failed_attempts + 1;
    const lockUntil = newAttempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
    await env.DB.prepare(`
      UPDATE user_credentials
      SET failed_attempts = ?, locked_until = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(newAttempts, lockUntil, user.id).run();

    return errorResponse('Invalid email or password credentials', 401);
  }

  // Reset failed attempts on success
  if (creds.failed_attempts > 0) {
    await env.DB.prepare(`
      UPDATE user_credentials
      SET failed_attempts = 0, locked_until = NULL, updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(user.id).run();
  }

  // 4. Create cryptographically secure session
  const rawToken = generateRandomToken(32);
  const tokenHash = await sha256Hash(rawToken);
  const sessionId = `sess-${Date.now()}-${generateRandomToken(6)}`;
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  await env.DB.prepare(`
    INSERT INTO user_sessions (id, token_hash, user_id, tenant_id, role, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(sessionId, tokenHash, user.id, user.tenant_id, user.role, expiresAt, clientIp, userAgent).run();

  // 5. Look up tenant info if not super_admin
  let tenantData = null;
  if (user.tenant_id) {
    tenantData = await env.DB.prepare(`
      SELECT id, slug, name, type, status, plan_id, branding_school_name, branding_primary_color
      FROM tenants
      WHERE id = ?
      LIMIT 1
    `).bind(user.tenant_id).first();
  }

  // 6. Return response with HttpOnly cookie
  // Note: Secure attribute is standard; in dev without HTTPS browsers allow SameSite=Lax over localhost
  const cookieFlags = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`
  ];
  if (request.url.startsWith('https://')) {
    cookieFlags.push('Secure');
  }

  const cookieHeader = cookieFlags.join('; ');

  return jsonResponse(
    {
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatar_url,
        linkedEntityId: user.linked_entity_id
      },
      tenant: tenantData,
      token: rawToken // Provided for Bearer mobile/API clients as well
    },
    200,
    { 'Set-Cookie': cookieHeader },
    user.tenant_id
  );
}

/**
 * POST /api/v1/auth/logout
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const { auth } = await authenticateRequest(request, env);
  if (auth) {
    // Revoke session in database
    await env.DB.prepare(`
      UPDATE user_sessions
      SET revoked_at = datetime('now')
      WHERE id = ?
    `).bind(auth.sessionId).run();
  }

  // Clear cookie
  const clearCookieHeader = `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

  return jsonResponse(
    { message: 'Successfully logged out' },
    200,
    { 'Set-Cookie': clearCookieHeader }
  );
}

/**
 * GET /api/v1/auth/me
 */
export async function handleGetMe(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  return jsonResponse({
    user: auth.user,
    tenant: auth.tenant,
    sessionId: auth.sessionId
  }, 200, {}, auth.tenant?.id);
}
