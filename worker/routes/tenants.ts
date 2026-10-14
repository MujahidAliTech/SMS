// ============================================================================
// Tenants & Schools Route Handlers
// ============================================================================

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles } from '../middleware/auth';

/**
 * GET /api/v1/tenants/public/:slug
 * Public website endpoint (unauthenticated). Only exposes safe branding details.
 */
export async function handleGetPublicTenant(slug: string, env: Env): Promise<Response> {
  if (!slug) {
    return errorResponse('Slug parameter is required', 400);
  }

  const tenant = await env.DB.prepare(`
    SELECT 
      id, slug, name, type, status,
      branding_school_name, branding_tagline, branding_logo_url, branding_favicon_url,
      branding_primary_color, branding_secondary_color, branding_phone, branding_whatsapp,
      branding_email, branding_address, branding_city, branding_province,
      branding_principal_name, branding_academic_session, branding_affiliation_board,
      branding_about_text, branding_hero_headline, branding_hero_subheadline,
      branding_facebook_url, branding_instagram_url, branding_youtube_url
    FROM tenants
    WHERE slug = ? AND status != 'suspended'
    LIMIT 1
  `).bind(slug.toLowerCase().trim()).first();

  if (!tenant) {
    return errorResponse('School not found or website unavailable', 404);
  }

  return jsonResponse(tenant);
}

/**
 * GET /api/v1/tenants/current
 * Returns active tenant for authenticated ERP user.
 */
export async function handleGetCurrentTenant(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const tenantId = auth.tenant?.id || auth.user.tenantId;
  if (!tenantId) {
    return errorResponse('User has no assigned tenant', 404);
  }

  const tenant = await env.DB.prepare(`
    SELECT * FROM tenants WHERE id = ? LIMIT 1
  `).bind(tenantId).first();

  if (!tenant) {
    return errorResponse('Tenant not found', 404);
  }

  return jsonResponse(tenant, 200, {}, tenantId);
}

/**
 * GET /api/v1/tenants (Super Admin Only)
 */
export async function handleListTenants(request: Request, env: Env): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['super_admin']);
  if (roleError) return roleError;

  const result = await env.DB.prepare(`
    SELECT 
      id, slug, name, type, status, plan_id, student_limit, teacher_limit,
      active_student_count, active_teacher_count, subscription_end_date, created_at
    FROM tenants
    ORDER BY created_at DESC
  `).all();

  return jsonResponse(result.results);
}
