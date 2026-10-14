// ============================================================================
// Health Check & Version Endpoints
// ============================================================================

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleHealthCheck(env: Env): Promise<Response> {
  const start = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs = 0;

  try {
    const dbTest = await env.DB.prepare('SELECT 1 as alive, datetime("now") as db_time').first<{
      alive: number;
      db_time: string;
    }>();
    if (dbTest && dbTest.alive === 1) {
      dbStatus = 'connected';
      dbLatencyMs = Date.now() - start;
    }
  } catch (err) {
    dbStatus = `error: ${(err as Error).message}`;
  }

  return jsonResponse({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    service: 'TaleemCloud Backend Worker API',
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
    database: {
      type: 'Cloudflare D1 (SQLite)',
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    storage: {
      type: 'Cloudflare R2',
      configured: Boolean(env.STORAGE)
    }
  });
}

export function handleVersion(): Response {
  return jsonResponse({
    version: '1.0.0',
    apiVersion: 'v1',
    stage: 'Stage 4A (Backend Foundation & D1 Schema)',
    appName: 'TaleemCloud Multi-Tenant School SaaS',
    author: 'TaleemCloud Core Platform Team'
  });
}
