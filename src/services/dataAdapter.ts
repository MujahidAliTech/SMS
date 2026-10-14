// ============================================================================
// Data Adapter Pattern for Gradual Cloudflare D1 Migration
// ============================================================================

import { SchoolClass, Student, AttendanceRecord, FeeInvoice } from '../types';
import { classService, studentService, attendanceService, feeService } from './index';
import { apiClient } from './apiClient';

/**
 * Backend Data Mode:
 * - 'local_storage': Uses browser localStorage via MockStorageAdapter (Demo / Offline mode)
 * - 'cloudflare_d1': Uses remote Cloudflare Worker & D1 API
 */
export type StorageMode = 'local_storage' | 'cloudflare_d1';

export interface DataAdapterConfig {
  mode: StorageMode;
  fallbackToLocalOnFailure?: boolean;
}

/**
 * Example Asynchronous Adapter for Classes:
 * Demonstrates the clean pattern for migrating an individual module from localStorage to Cloudflare D1.
 */
export const classApiAdapter = {
  /**
   * Fetches classes.
   * If mode is 'cloudflare_d1', queries the Worker API.
   * Falls back gracefully to localStorage mock data if backend is offline or in demo mode.
   */
  async getClasses(tenantId: string, mode: StorageMode = 'local_storage'): Promise<SchoolClass[]> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.get<SchoolClass[]>(`/classes?tenantId=${encodeURIComponent(tenantId)}`);
      if (!error && data) {
        return data;
      }
      console.warn('Cloudflare D1 request failed, falling back to local storage:', error?.message);
    }

    // Default / Fallback: synchronous MockStorageAdapter
    return classService.getAll(tenantId);
  },

  async createClass(
    data: Omit<SchoolClass, 'id'>,
    mode: StorageMode = 'local_storage'
  ): Promise<SchoolClass> {
    if (mode === 'cloudflare_d1') {
      const { data: created, error } = await apiClient.post<SchoolClass>('/classes', data);
      if (!error && created) {
        return created;
      }
      console.warn('Cloudflare D1 creation failed, saving locally:', error?.message);
    }

    // Default / Fallback: synchronous MockStorageAdapter
    return classService.create(data);
  }
};
