// ============================================================================
// Data Adapter Pattern for Gradual Cloudflare D1 & R2 Migration
// Multi-Tenant School Management SaaS
// ============================================================================

import { SchoolClass, Student, TeacherStaff, AttendanceRecord, FeeInvoice } from '../types';
import { classService, studentService, teacherStaffService, attendanceService, feeService } from './index';
import { apiClient } from './apiClient';

/**
 * Backend Data Mode:
 * - 'local_storage': Uses browser localStorage via MockStorageAdapter (Demo / Offline mode)
 * - 'cloudflare_d1': Uses remote Cloudflare Worker, D1 & R2 API with strict tenant isolation
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

    return classService.create(data);
  },

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

    return classService.update(id, updates);
  },

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

    classService.delete(id);
  }
};

/**
 * Production-ready Student API Adapter with Cloudflare D1 & R2 Profile Picture Storage.
 */
export const studentApiAdapter = {
  async getStudents(
    tenantId: string,
    filters?: { search?: string; classId?: string; status?: string; gender?: string },
    mode: StorageMode = 'local_storage'
  ): Promise<Student[]> {
    if (mode === 'cloudflare_d1') {
      const params = new URLSearchParams();
      params.set('tenantId', tenantId);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.classId) params.set('classId', filters.classId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.gender) params.set('gender', filters.gender);

      const { data, error } = await apiClient.get<Student[]>(`/students?${params.toString()}`);
      if (error) {
        throw new Error(`Cloudflare D1 query failed: ${error.message}`);
      }
      return data || [];
    }

    return studentService.getAll(tenantId);
  },

  async getStudentById(id: string, tenantId: string, mode: StorageMode = 'local_storage'): Promise<Student | undefined> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.get<Student>(`/students/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`);
      if (error) {
        if (error.status === 404) return undefined;
        throw new Error(`Failed to load student from D1: ${error.message}`);
      }
      return data || undefined;
    }

    return studentService.getById(id);
  },

  async createStudent(
    data: Omit<Student, 'id'>,
    mode: StorageMode = 'local_storage'
  ): Promise<Student> {
    if (mode === 'cloudflare_d1') {
      const { data: created, error } = await apiClient.post<Student>('/students', data);
      if (error || !created) {
        throw new Error(error?.message || 'Failed to create student on Cloudflare D1');
      }
      return created;
    }

    return studentService.create(data);
  },

  async updateStudent(
    id: string,
    updates: Partial<Student>,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<Student> {
    if (mode === 'cloudflare_d1') {
      const payload = { ...updates, tenantId };
      const { data: updated, error } = await apiClient.put<Student>(`/students/${encodeURIComponent(id)}`, payload);
      if (error || !updated) {
        throw new Error(error?.message || 'Failed to update student on Cloudflare D1');
      }
      return updated;
    }

    return studentService.update(id, updates);
  },

  async deleteStudent(
    id: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<void> {
    if (mode === 'cloudflare_d1') {
      const { error } = await apiClient.delete<{ message: string; id: string }>(
        `/students/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    studentService.delete(id);
  },

  async uploadPhoto(
    id: string,
    file: File,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<{ photoUrl: string; photoKey?: string }> {
    if (mode === 'cloudflare_d1') {
      const formData = new FormData();
      formData.append('photo', file);

      const { data, error } = await apiClient.upload<{ photoUrl: string; photoKey: string }>(
        `/students/${encodeURIComponent(id)}/photo?tenantId=${encodeURIComponent(tenantId)}`,
        formData
      );

      if (error || !data) {
        throw new Error(error?.message || 'Failed to upload photo to Cloudflare R2 storage');
      }
      return data;
    }

    // Local simulation: create object URL or base64
    const photoUrl = URL.createObjectURL(file);
    studentService.update(id, { photoUrl });
    return { photoUrl };
  },

  async deletePhoto(
    id: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<void> {
    if (mode === 'cloudflare_d1') {
      const { error } = await apiClient.delete(
        `/students/${encodeURIComponent(id)}/photo?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    studentService.update(id, { photoUrl: undefined });
  }
};

/**
 * Production-ready Teachers & Staff API Adapter with Cloudflare D1 & R2 Profile Picture Storage.
 */
export const teacherStaffApiAdapter = {
  async getTeachers(
    tenantId: string,
    filters?: { search?: string; role?: string; status?: string },
    mode: StorageMode = 'local_storage'
  ): Promise<TeacherStaff[]> {
    if (mode === 'cloudflare_d1') {
      const params = new URLSearchParams();
      params.set('tenantId', tenantId);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.role) params.set('role', filters.role);
      if (filters?.status) params.set('status', filters.status);

      const { data, error } = await apiClient.get<TeacherStaff[]>(`/teachers?${params.toString()}`);
      if (error) {
        throw new Error(`Cloudflare D1 query failed: ${error.message}`);
      }
      return data || [];
    }

    return teacherStaffService.getAll(tenantId);
  },

  async getTeacherById(id: string, tenantId: string, mode: StorageMode = 'local_storage'): Promise<TeacherStaff | undefined> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.get<TeacherStaff>(`/teachers/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`);
      if (error) {
        if (error.status === 404) return undefined;
        throw new Error(`Failed to load staff record from D1: ${error.message}`);
      }
      return data || undefined;
    }

    return teacherStaffService.getById(id);
  },

  async createTeacher(
    data: Omit<TeacherStaff, 'id'>,
    mode: StorageMode = 'local_storage'
  ): Promise<TeacherStaff> {
    if (mode === 'cloudflare_d1') {
      const { data: created, error } = await apiClient.post<TeacherStaff>('/teachers', data);
      if (error || !created) {
        throw new Error(error?.message || 'Failed to create faculty record on Cloudflare D1');
      }
      return created;
    }

    return teacherStaffService.create(data);
  },

  async updateTeacher(
    id: string,
    updates: Partial<TeacherStaff>,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<TeacherStaff> {
    if (mode === 'cloudflare_d1') {
      const payload = { ...updates, tenantId };
      const { data: updated, error } = await apiClient.put<TeacherStaff>(`/teachers/${encodeURIComponent(id)}`, payload);
      if (error || !updated) {
        throw new Error(error?.message || 'Failed to update staff record on Cloudflare D1');
      }
      return updated;
    }

    return teacherStaffService.update(id, updates);
  },

  async deleteTeacher(
    id: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<void> {
    if (mode === 'cloudflare_d1') {
      const { error } = await apiClient.delete<{ message: string; id: string }>(
        `/teachers/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    teacherStaffService.delete(id);
  },

  async uploadPhoto(
    id: string,
    file: File,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<{ photoUrl: string; photoKey?: string }> {
    if (mode === 'cloudflare_d1') {
      const formData = new FormData();
      formData.append('photo', file);

      const { data, error } = await apiClient.upload<{ photoUrl: string; photoKey: string }>(
        `/teachers/${encodeURIComponent(id)}/photo?tenantId=${encodeURIComponent(tenantId)}`,
        formData
      );

      if (error || !data) {
        throw new Error(error?.message || 'Failed to upload photo to Cloudflare R2 storage');
      }
      return data;
    }

    const photoUrl = URL.createObjectURL(file);
    teacherStaffService.update(id, { photoUrl });
    return { photoUrl };
  },

  async deletePhoto(
    id: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<void> {
    if (mode === 'cloudflare_d1') {
      const { error } = await apiClient.delete(
        `/teachers/${encodeURIComponent(id)}/photo?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    teacherStaffService.update(id, { photoUrl: undefined });
  }
};
