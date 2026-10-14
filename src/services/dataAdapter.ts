// ============================================================================
// Data Adapter Pattern for Gradual Cloudflare D1 Migration
// Multi-Tenant School Management SaaS
// ============================================================================

import { SchoolClass, Student, AttendanceRecord, FeeInvoice } from '../types';
import { classService, studentService, attendanceService, feeService } from './index';
import { apiClient } from './apiClient';

/**
 * Backend Data Mode:
 * - 'local_storage': Uses browser localStorage via MockStorageAdapter (Demo / Offline mode)
 * - 'cloudflare_d1': Uses remote Cloudflare Worker & D1 API with strict tenant isolation
 */
export type StorageMode = 'local_storage' | 'cloudflare_d1';

export interface DataAdapterConfig {
  mode: StorageMode;
  fallbackToLocalOnFailure?: boolean;
}

/**
 * Production-ready Class API Adapter with relational integrity & strict mode separation.
 */
export const classApiAdapter = {
  /**
   * Fetches classes for the given school.
   * In 'cloudflare_d1' mode, queries the Worker API with server-side tenant scoping.
   * In 'local_storage' mode, queries MockStorageAdapter.
   */
  async getClasses(tenantId: string, mode: StorageMode = 'local_storage'): Promise<SchoolClass[]> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.get<SchoolClass[]>(`/classes?tenantId=${encodeURIComponent(tenantId)}`);
      if (error) {
        throw new Error(`Cloudflare D1 query failed: ${error.message}`);
      }
      return data || [];
    }

    // Explicit Demo / Local Storage Mode
    return classService.getAll(tenantId);
  },

  /**
   * Fetches a single class by ID.
   */
  async getClassById(id: string, tenantId: string, mode: StorageMode = 'local_storage'): Promise<SchoolClass | undefined> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.get<SchoolClass>(`/classes/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`);
      if (error) {
        if (error.status === 404) return undefined;
        throw new Error(`Failed to load class from D1: ${error.message}`);
      }
      return data || undefined;
    }

    return classService.getById(id);
  },

  /**
   * Creates a new class with sections.
   * Rule: In 'cloudflare_d1' mode, does NOT silently fall back to localStorage if remote write fails.
   */
  async createClass(
    data: Omit<SchoolClass, 'id'>,
    mode: StorageMode = 'local_storage'
  ): Promise<SchoolClass> {
    if (mode === 'cloudflare_d1') {
      const { data: created, error } = await apiClient.post<SchoolClass>('/classes', data);
      if (error || !created) {
        throw new Error(error?.message || 'Failed to create class on Cloudflare D1');
      }
      return created;
    }

    // Explicit Demo / Local Storage Mode
    return classService.create(data);
  },

  /**
   * Updates an existing class and syncs its sections.
   * Rule: In 'cloudflare_d1' mode, rejects mutations that violate relational constraints.
   */
  async updateClass(
    id: string,
    updates: Partial<SchoolClass>,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<SchoolClass> {
    if (mode === 'cloudflare_d1') {
      const payload = { ...updates, tenantId };
      const { data: updated, error } = await apiClient.put<SchoolClass>(`/classes/${encodeURIComponent(id)}`, payload);
      if (error || !updated) {
        throw new Error(error?.message || 'Failed to update class on Cloudflare D1');
      }
      return updated;
    }

    // Explicit Demo / Local Storage Mode
    return classService.update(id, updates);
  },

  /**
   * Deletes a class by ID.
   * Rule: Server verifies no enrolled students exist before allowing deletion (Part C requirement).
   */
  async deleteClass(
    id: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<void> {
    if (mode === 'cloudflare_d1') {
      const { error } = await apiClient.delete<{ message: string; id: string }>(
        `/classes/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    // Explicit Demo / Local Storage Mode
    classService.delete(id);
  }
};
