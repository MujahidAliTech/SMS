// ============================================================================
// Response & Security Headers Utilities
// ============================================================================

import { ApiResponse } from '../types';

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
  tenantId?: string | null
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      apiVersion: 'v1',
      tenantId: tenantId ?? null
    }
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...SECURITY_HEADERS,
      ...headers
    }
  });
}

export function errorResponse(
  message: string,
  status = 400,
  details: unknown = null,
  headers: Record<string, string> = {}
): Response {
  const body: ApiResponse = {
    success: false,
    error: message,
    meta: {
      timestamp: new Date().toISOString(),
      apiVersion: 'v1',
      ...(details ? { details } : {})
    }
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...SECURITY_HEADERS,
      ...headers
    }
  });
}
