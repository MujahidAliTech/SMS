// ============================================================================
// Data Adapter Pattern for Gradual Cloudflare D1 & R2 Migration
// Multi-Tenant School Management SaaS
// ============================================================================

import { SchoolClass, Student, TeacherStaff, AttendanceRecord, FeeInvoice, User, UserRole } from '../types';
import { classService, studentService, teacherStaffService, attendanceService, feeService } from './index';
import { apiClient } from './apiClient';
import { MockStorageAdapter } from './storage';

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
        if (error.status === 401) {
          console.warn('[classApiAdapter] Authentication required for Cloudflare D1. Returning local demo records.');
          return classService.getAll(tenantId);
        }
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
        if (error.status === 401) {
          console.warn('[classApiAdapter] Authentication required for Cloudflare D1. Returning local demo record.');
          return classService.getById(id);
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to save records to Cloudflare D1.');
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to update records on Cloudflare D1.');
        }
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
        if (error.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to delete records from Cloudflare D1.');
        }
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
        if (error.status === 401) {
          console.warn('[studentApiAdapter] Authentication required for Cloudflare D1 query. Returning local demo records.');
          return studentService.getAll(tenantId);
        }
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
        if (error.status === 401) {
          console.warn('[studentApiAdapter] Authentication required for Cloudflare D1. Returning local demo record.');
          return studentService.getById(id);
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to admit students to Cloudflare D1.');
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to update student records on Cloudflare D1.');
        }
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
        if (error.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to delete student records from Cloudflare D1.');
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to upload photos to Cloudflare R2.');
        }
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
        if (error.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to delete photos from Cloudflare R2.');
        }
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
        if (error.status === 401) {
          console.warn('[teacherStaffApiAdapter] Authentication required for Cloudflare D1. Returning local demo records.');
          return teacherStaffService.getAll(tenantId);
        }
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
        if (error.status === 401) {
          console.warn('[teacherStaffApiAdapter] Authentication required for Cloudflare D1. Returning local demo record.');
          return teacherStaffService.getById(id);
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to register faculty on Cloudflare D1.');
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to update faculty on Cloudflare D1.');
        }
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
        if (error.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to delete faculty records from Cloudflare D1.');
        }
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
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to upload faculty photos to Cloudflare R2.');
        }
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
        if (error.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account to delete faculty photos from Cloudflare R2.');
        }
        throw new Error(error.message);
      }
      return;
    }

    teacherStaffService.update(id, { photoUrl: undefined });
  }
};

export interface ManagedUser {
  id: string;
  tenantId?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  linkedEntityId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const userApiAdapter = {
  async getUsers(
    tenantId: string,
    filters?: { search?: string; role?: string; status?: string },
    mode: StorageMode = 'local_storage'
  ): Promise<ManagedUser[]> {
    if (mode === 'cloudflare_d1') {
      const params = new URLSearchParams();
      params.set('tenantId', tenantId);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.role) params.set('role', filters.role);
      if (filters?.status) params.set('status', filters.status);

      const { data, error } = await apiClient.get<ManagedUser[]>(`/users?${params.toString()}`);
      if (error) {
        if (error.status === 401) {
          throw new Error('Authentication required: Please log in with a school administrator account.');
        }
        if (error.status === 403) {
          throw new Error('Access denied: Only school administrators can view system user accounts.');
        }
        throw new Error(error.message || 'Failed to load user accounts from Cloudflare D1');
      }
      return data || [];
    }

    // Local Storage fallback
    const all = MockStorageAdapter.getUsers();
    let filtered = all.filter(u => !u.tenantId || u.tenantId === tenantId);
    if (filters?.role && filters.role !== 'all') {
      filtered = filtered.filter(u => u.role === filters.role);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    return filtered.map(u => ({
      ...u,
      isActive: true,
      createdAt: new Date().toISOString()
    }));
  },

  async getUserById(
    userId: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<ManagedUser> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.get<ManagedUser>(`/users/${encodeURIComponent(userId)}?tenantId=${encodeURIComponent(tenantId)}`);
      if (error || !data) {
        throw new Error(error?.message || 'Failed to load user profile');
      }
      return data;
    }

    const user = MockStorageAdapter.getUsers().find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    return { ...user, isActive: true };
  },

  async createUser(
    userData: {
      tenantId: string;
      name: string;
      email: string;
      phone?: string;
      role: UserRole;
      password: string;
      linkedEntityId?: string;
    },
    mode: StorageMode = 'local_storage'
  ): Promise<ManagedUser> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.post<ManagedUser>('/users', userData);
      if (error || !data) {
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in with an administrator account.');
        }
        if (error?.status === 403) {
          throw new Error(error.message || 'Access denied: You are not authorized to create user accounts.');
        }
        if (error?.status === 409) {
          throw new Error(error.message || 'An account with this email address already exists.');
        }
        throw new Error(error?.message || 'Failed to create user account on Cloudflare D1');
      }
      return data;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      tenantId: userData.tenantId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role,
      linkedEntityId: userData.linkedEntityId
    };
    const current = MockStorageAdapter.getUsers();
    MockStorageAdapter.setUsers([newUser, ...current]);
    return { ...newUser, isActive: true, createdAt: new Date().toISOString() };
  },

  async updateUser(
    userId: string,
    updates: {
      tenantId: string;
      name?: string;
      phone?: string;
      role?: UserRole;
      linkedEntityId?: string;
    },
    mode: StorageMode = 'local_storage'
  ): Promise<ManagedUser> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.put<ManagedUser>(`/users/${encodeURIComponent(userId)}`, updates);
      if (error || !data) {
        throw new Error(error?.message || 'Failed to update user account');
      }
      return data;
    }

    const current = MockStorageAdapter.getUsers();
    const idx = current.findIndex(u => u.id === userId);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...updates };
      MockStorageAdapter.setUsers(current);
      return { ...current[idx], isActive: true };
    }
    throw new Error('User not found');
  },

  async updateUserStatus(
    userId: string,
    isActive: boolean,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<{ id: string; isActive: boolean }> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.patch<{ id: string; isActive: boolean }>(
        `/users/${encodeURIComponent(userId)}/status`,
        { tenantId, isActive }
      );
      if (error || !data) {
        throw new Error(error?.message || 'Failed to update user account status');
      }
      return data;
    }

    return { id: userId, isActive };
  },

  async resetPassword(
    userId: string,
    password: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<{ message: string }> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.post<{ message: string; revokedSessions?: number }>(
        `/users/${encodeURIComponent(userId)}/reset-password`,
        { tenantId, password }
      );
      if (error || !data) {
        throw new Error(error?.message || 'Failed to reset password');
      }
      return data;
    }

    return { message: 'Password reset successfully in demo mode' };
  },

  async revokeSessions(
    userId: string,
    tenantId: string,
    mode: StorageMode = 'local_storage'
  ): Promise<{ message: string; revokedSessions: number }> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.post<{ message: string; revokedSessions: number }>(
        `/users/${encodeURIComponent(userId)}/revoke-sessions?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (error || !data) {
        throw new Error(error?.message || 'Failed to revoke user sessions');
      }
      return data;
    }

    return { message: 'Sessions revoked', revokedSessions: 1 };
  }
};
