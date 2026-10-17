// ============================================================================
// Data Adapter Pattern for Gradual Cloudflare D1 & R2 Migration
// Multi-Tenant School Management SaaS
// ============================================================================

import { SchoolClass, Student, TeacherStaff, AttendanceRecord, AttendanceStatus, FeeInvoice, User, UserRole } from '../types';
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

export interface AttendanceRosterItem {
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  recordId?: string;
  isRecorded: boolean;
  updatedAt?: string;
}

export interface AttendanceRosterResponse {
  classId: string;
  sectionId: string;
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  attendanceRate: number;
  isMarked: boolean;
  roster: AttendanceRosterItem[];
}

export interface StudentAttendanceHistoryResponse {
  student: {
    id: string;
    name: string;
    admissionNo: string;
    rollNo: string;
    className: string;
    sectionName: string;
  };
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  attendanceRate: number;
  records: Array<{
    id: string;
    tenantId: string;
    date: string;
    studentId: string;
    studentName: string;
    classId: string;
    sectionId: string;
    status: AttendanceStatus;
    remarks?: string;
    recordedByUserId?: string;
    createdAt: string;
    updatedAt?: string;
  }>;
}

export interface AttendanceCorrectionEntry {
  id: string;
  attendance_record_id: string;
  student_id: string;
  student_name: string | null;
  date: string;
  old_status: string;
  new_status: string;
  old_remarks: string | null;
  new_remarks: string | null;
  reason: string | null;
  changed_by_user_id: string;
  changed_by_user_name: string | null;
  created_at: string;
}

export const attendanceApiAdapter = {
  async getClassAttendance(
    params: { tenantId: string; classId: string; sectionId?: string; date: string },
    mode: StorageMode = 'local_storage'
  ): Promise<AttendanceRosterResponse> {
    if (mode === 'cloudflare_d1') {
      const q = new URLSearchParams();
      q.set('tenantId', params.tenantId);
      q.set('classId', params.classId);
      if (params.sectionId && params.sectionId !== 'all') q.set('sectionId', params.sectionId);
      q.set('date', params.date);

      const { data, error } = await apiClient.get<AttendanceRosterResponse>(`/attendance?${q.toString()}`);
      if (error || !data) {
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in to view attendance records.');
        }
        if (error?.status === 403) {
          throw new Error(error.message || 'Access denied: You are not authorized to view attendance for this class.');
        }
        throw new Error(error?.message || 'Failed to fetch attendance roster from Cloudflare D1');
      }
      return data;
    }

    // Local Storage demo fallback
    const allStudents = studentService.getAll(params.tenantId);
    let classStudents = allStudents.filter(s => s.classId === params.classId && s.status === 'active');
    if (params.sectionId && params.sectionId !== 'all') {
      classStudents = classStudents.filter(s => 
        s.sectionName.toLowerCase().includes(params.sectionId!.toLowerCase()) || 
        s.sectionId.toLowerCase().includes(params.sectionId!.toLowerCase())
      );
    }
    const existing = attendanceService.getRecords(params.tenantId, params.date, params.classId);
    const existingMap = new Map(existing.map(e => [e.studentId, e]));

    let present = 0, absent = 0, late = 0, leave = 0;
    const roster: AttendanceRosterItem[] = classStudents.map(st => {
      const ex = existingMap.get(st.id);
      const status: AttendanceStatus = ex ? ex.status : 'present';
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'leave') leave++;

      return {
        studentId: st.id,
        studentName: st.name,
        rollNo: st.rollNo,
        classId: st.classId,
        className: st.className,
        sectionId: st.sectionId,
        sectionName: st.sectionName,
        date: params.date,
        status,
        remarks: ex?.remarks || undefined,
        recordId: ex?.id || undefined,
        isRecorded: !!ex
      };
    });

    const total = roster.length;
    return {
      classId: params.classId,
      sectionId: params.sectionId || 'all',
      date: params.date,
      totalStudents: total,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      leaveCount: leave,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      isMarked: existing.length > 0,
      roster
    };
  },

  async saveBatchAttendance(
    payload: {
      tenantId: string;
      classId: string;
      sectionId?: string;
      date: string;
      records: Array<{
        studentId: string;
        status: AttendanceStatus;
        remarks?: string;
      }>;
    },
    mode: StorageMode = 'local_storage'
  ): Promise<{ message: string; insertedCount: number; updatedCount: number; correctionCount: number }> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.post<{
        message: string;
        classId: string;
        date: string;
        totalProcessed: number;
        insertedCount: number;
        updatedCount: number;
        correctionCount: number;
      }>('/attendance/batch', payload);

      if (error || !data) {
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in to mark attendance.');
        }
        if (error?.status === 403) {
          throw new Error(error.message || 'Access denied: You are not authorized to mark attendance for this class.');
        }
        throw new Error(error?.message || 'Failed to save attendance on Cloudflare D1');
      }
      return data;
    }

    // Local Storage demo fallback
    const allStudents = studentService.getAll(payload.tenantId);
    const recordsToSave: AttendanceRecord[] = payload.records.map(entry => {
      const st = allStudents.find(s => s.id === entry.studentId);
      return {
        id: `att-${entry.studentId}-${payload.date}`,
        tenantId: payload.tenantId,
        date: payload.date,
        studentId: entry.studentId,
        studentName: st?.name || 'Student',
        classId: payload.classId,
        sectionId: payload.sectionId || st?.sectionId || 'sec-a',
        status: entry.status,
        remarks: entry.remarks || ''
      };
    });
    attendanceService.saveRecords(payload.tenantId, recordsToSave);
    return {
      message: 'Attendance saved successfully (demo mode)',
      insertedCount: recordsToSave.length,
      updatedCount: 0,
      correctionCount: 0
    };
  },

  async getStudentAttendance(
    studentId: string,
    tenantId: string,
    filters?: { month?: string; startDate?: string; endDate?: string },
    mode: StorageMode = 'local_storage'
  ): Promise<StudentAttendanceHistoryResponse> {
    if (mode === 'cloudflare_d1') {
      const q = new URLSearchParams();
      q.set('tenantId', tenantId);
      if (filters?.month) q.set('month', filters.month);
      if (filters?.startDate && filters?.endDate) {
        q.set('startDate', filters.startDate);
        q.set('endDate', filters.endDate);
      }

      const { data, error } = await apiClient.get<StudentAttendanceHistoryResponse>(
        `/attendance/student/${encodeURIComponent(studentId)}?${q.toString()}`
      );

      if (error || !data) {
        if (error?.status === 401) {
          throw new Error('Authentication required: Please log in to view attendance records.');
        }
        if (error?.status === 403) {
          throw new Error(error.message || 'Access denied: You are not authorized to view this student\'s attendance.');
        }
        throw new Error(error?.message || 'Failed to load student attendance history from Cloudflare D1');
      }
      return data;
    }

    // Local Storage demo fallback
    const st = studentService.getById(studentId) || studentService.getAll(tenantId)[0];
    const history = attendanceService.getHistory(tenantId, studentId);
    let present = 0, absent = 0, late = 0, leave = 0;
    const records = history.map(h => {
      if (h.status === 'present') present++;
      else if (h.status === 'absent') absent++;
      else if (h.status === 'late') late++;
      else if (h.status === 'leave') leave++;
      return {
        id: h.id,
        tenantId: h.tenantId,
        date: h.date,
        studentId: h.studentId,
        studentName: h.studentName,
        classId: h.classId,
        sectionId: h.sectionId,
        status: h.status,
        remarks: h.remarks,
        createdAt: new Date().toISOString()
      };
    });
    const total = records.length;
    return {
      student: {
        id: st ? st.id : studentId,
        name: st ? st.name : 'Student',
        admissionNo: st ? st.admissionNo : 'ADM-001',
        rollNo: st ? st.rollNo : '01',
        className: st ? st.className : 'Class 9',
        sectionName: st ? st.sectionName : 'A'
      },
      totalDays: total,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      leaveCount: leave,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      records
    };
  },

  async getAttendanceSummary(
    tenantId: string,
    date?: string,
    mode: StorageMode = 'local_storage'
  ): Promise<{
    date: string;
    overall: {
      totalMarked: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      rate: number;
    };
    classes: Array<{
      classId: string;
      className: string;
      isMarked: boolean;
      totalMarked: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      rate: number;
    }>;
  }> {
    if (mode === 'cloudflare_d1') {
      const q = new URLSearchParams();
      q.set('tenantId', tenantId);
      if (date) q.set('date', date);

      const { data, error } = await apiClient.get<any>(`/attendance/summary?${q.toString()}`);
      if (error || !data) {
        throw new Error(error?.message || 'Failed to fetch attendance summary from Cloudflare D1');
      }
      return data;
    }

    return {
      date: date || new Date().toISOString().split('T')[0],
      overall: { totalMarked: 100, present: 90, absent: 5, late: 3, leave: 2, rate: 93 },
      classes: []
    };
  },

  async correctAttendanceRecord(
    recordId: string,
    payload: {
      tenantId: string;
      newStatus: AttendanceStatus;
      newRemarks?: string;
      reason?: string;
    },
    mode: StorageMode = 'local_storage'
  ): Promise<{ message: string; correctionId: string; record: any }> {
    if (mode === 'cloudflare_d1') {
      const { data, error } = await apiClient.post<any>(`/attendance/${encodeURIComponent(recordId)}/correct`, payload);
      if (error || !data) {
        throw new Error(error?.message || 'Failed to correct attendance record on Cloudflare D1');
      }
      return data;
    }

    return {
      message: 'Attendance corrected in demo mode',
      correctionId: `corr-${Date.now()}`,
      record: { id: recordId, status: payload.newStatus }
    };
  },

  async getAttendanceCorrections(
    tenantId: string,
    filters?: { date?: string; studentId?: string },
    mode: StorageMode = 'local_storage'
  ): Promise<AttendanceCorrectionEntry[]> {
    if (mode === 'cloudflare_d1') {
      const q = new URLSearchParams();
      q.set('tenantId', tenantId);
      if (filters?.date) q.set('date', filters.date);
      if (filters?.studentId) q.set('studentId', filters.studentId);

      const { data, error } = await apiClient.get<AttendanceCorrectionEntry[]>(`/attendance/corrections?${q.toString()}`);
      if (error || !data) {
        throw new Error(error?.message || 'Failed to load attendance correction audit logs');
      }
      return data;
    }

    return [];
  }
};
