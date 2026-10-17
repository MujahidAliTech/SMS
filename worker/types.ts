// ============================================================================
// Cloudflare Workers & D1 API Foundation Typings
// Multi-Tenant School Management SaaS
// ============================================================================

export interface D1ResultMeta {
  changes?: number;
  last_row_id?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface D1Response<T = unknown> {
  results: T[];
  success: boolean;
  meta: D1ResultMeta;
  error?: string;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Response<T>>;
  run<T = unknown>(): Promise<D1Response<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Response<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface R2HttpMetadata {
  contentType?: string;
  cacheControl?: string;
}

export interface R2ObjectBody {
  key: string;
  size: number;
  httpMetadata?: R2HttpMetadata;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: unknown, options?: { httpMetadata?: R2HttpMetadata }): Promise<{ key: string; size: number }>;
  delete(key: string | string[]): Promise<void>;
}

export interface Env {
  DB: D1Database;
  STORAGE?: R2Bucket;
  ENVIRONMENT?: string;
  API_VERSION?: string;
  APP_NAME?: string;
  JWT_SECRET?: string;
}

export type UserRole = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'accountant' | 'parent' | 'student';

export interface AuthUser {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  linkedEntityId: string | null;
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
  type: 'school' | 'academy' | 'tuition_center';
  status: 'active' | 'suspended' | 'trial';
  planId: string;
}

export interface AuthContext {
  user: AuthUser;
  tenant: AuthTenant | null;
  sessionId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    apiVersion: string;
    tenantId?: string | null;
    [key: string]: unknown;
  };
}
