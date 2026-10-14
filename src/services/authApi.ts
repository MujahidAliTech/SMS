// ============================================================================
// TaleemCloud Authentication API Service
// Communicates with Cloudflare Worker & D1 auth endpoints
// ============================================================================

import { apiClient, ApiError } from './apiClient';
import { User, Tenant } from '../types';

export interface AuthSessionResponse {
  user: {
    id: string;
    tenantId: string | null;
    name: string;
    email: string;
    phone: string | null;
    role: User['role'];
    avatarUrl: string | null;
    linkedEntityId: string | null;
  };
  tenant: Tenant | null;
  token?: string;
}

export const authApi = {
  /**
   * Logs in with email and password via POST /api/v1/auth/login.
   * Server validates credentials using PBKDF2-SHA256 and sets HttpOnly session cookie.
   */
  async login(
    email: string,
    password: string
  ): Promise<{ data: AuthSessionResponse | null; error: ApiError | null }> {
    return apiClient.post<AuthSessionResponse>('/auth/login', {
      email: email.trim(),
      password
    });
  },

  /**
   * Logs out via POST /api/v1/auth/logout.
   * Server revokes session in D1 and clears session cookie.
   */
  async logout(): Promise<{ error: ApiError | null }> {
    const { error } = await apiClient.post<{ message: string }>('/auth/logout');
    return { error };
  },

  /**
   * Gets current authenticated user and tenant via GET /api/v1/auth/me.
   */
  async getMe(): Promise<{ data: AuthSessionResponse | null; error: ApiError | null }> {
    return apiClient.get<AuthSessionResponse>('/auth/me');
  }
};
