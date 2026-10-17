// ============================================================================
// TaleemCloud HTTP API Client (Cloudflare Worker & D1 Interface)
// ============================================================================

export interface ApiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
}

const DEFAULT_TIMEOUT_MS = 10000;
const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || BASE_URL;
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: ApiError | null }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    try {
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string> || {})
      };

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Automatically sends and receives HttpOnly session cookies
        headers
      });

      clearTimeout(timeoutId);

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: json?.error || `HTTP Error ${response.status}: ${response.statusText}`,
            status: response.status,
            details: json?.meta?.details
          }
        };
      }

      return {
        data: (json?.data !== undefined ? json.data : json) as T,
        error: null
      };

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as Error).name === 'AbortError';
      return {
        data: null,
        error: {
          message: isAbort ? 'Request timed out' : ((err as Error).message || 'Network request failed'),
          status: isAbort ? 408 : 0
        }
      };
    }
  }

  // HTTP Method Helpers
  public get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers
    });
  }

  public put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers
    });
  }

  public patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers
    });
  }

  public delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  public upload<T>(endpoint: string, formData: FormData, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'POST', body: formData, headers });
  }

  /**
   * Pings the Cloudflare Worker health-check endpoint.
   */
  public async checkHealth(): Promise<{ healthy: boolean; latencyMs: number; details?: unknown }> {
    const start = Date.now();
    const { data, error } = await this.get<{ status: string; database?: { status: string } }>('/health');
    const latencyMs = Date.now() - start;

    if (error || !data) {
      return { healthy: false, latencyMs, details: error };
    }

    return {
      healthy: data.status === 'healthy',
      latencyMs,
      details: data
    };
  }
}

export const apiClient = new ApiClient();
