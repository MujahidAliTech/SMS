// ============================================================================
// TaleemCloud Cloudflare Worker Entry Point
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env } from './types';
import { jsonResponse, errorResponse } from './utils/response';
import { handleHealthCheck, handleVersion } from './routes/health';
import { handleLogin, handleLogout, handleGetMe } from './routes/auth';
import { handleGetPublicTenant, handleGetCurrentTenant, handleListTenants } from './routes/tenants';
import { handleGetClasses, handleCreateClass } from './routes/classes';

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
      // Return 404 for worker if assets binding not attached, or pass to static assets
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
