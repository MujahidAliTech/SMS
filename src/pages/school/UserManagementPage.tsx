import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { userApiAdapter, ManagedUser } from '../../services/dataAdapter';
import { UserRole } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Key,
  ShieldAlert,
  Edit,
  Power,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Phone,
  Mail,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  super_admin: { label: 'Platform Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  school_admin: { label: 'School Administrator', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  principal: { label: 'School Principal', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  teacher: { label: 'Teaching Faculty', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  accountant: { label: 'Accountant / Bursar', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  parent: { label: 'Parent / Guardian', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  student: { label: 'Enrolled Student', color: 'bg-slate-100 text-slate-700 border-slate-200' }
};

export const UserManagementPage: React.FC = () => {
  const { currentTenant, currentUser, storageMode, toast } = useApp();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [confirmStatusModal, setConfirmStatusModal] = useState<{ open: boolean; user: ManagedUser | null; targetActive: boolean }>({
    open: false,
    user: null,
    targetActive: false
  });
  const [confirmRevokeModal, setConfirmRevokeModal] = useState<{ open: boolean; user: ManagedUser | null }>({
    open: false,
    user: null
  });

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'teacher' as UserRole,
    password: '',
    confirmPassword: '',
    linkedEntityId: ''
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: 'teacher' as UserRole,
    linkedEntityId: ''
  });

  // Reset Password State
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmNewPassword: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorBanner(null);
      const data = await userApiAdapter.getUsers(
        currentTenant.id,
        {
          search: search || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        },
        storageMode
      );
      setUsers(data);
    } catch (err) {
      console.error('Failed to load user records:', err);
      setErrorBanner((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentTenant.id, search, roleFilter, statusFilter, storageMode]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Create User Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.password.length < 8) {
      toast('Password must be at least 8 characters long', 'error');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await userApiAdapter.createUser(
        {
          tenantId: currentTenant.id,
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          phone: createForm.phone.trim() || undefined,
          role: createForm.role,
          password: createForm.password,
          linkedEntityId: createForm.linkedEntityId.trim() || undefined
        },
        storageMode
      );
      toast(`User account for ${createForm.name} created successfully`, 'success');
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        role: 'teacher',
        password: '',
        confirmPassword: '',
        linkedEntityId: ''
      });
      await loadUsers();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit User Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await userApiAdapter.updateUser(
        selectedUser.id,
        {
          tenantId: currentTenant.id,
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || undefined,
          role: editForm.role,
          linkedEntityId: editForm.linkedEntityId.trim() || undefined
        },
        storageMode
      );
      toast('User profile updated successfully', 'success');
      setIsEditOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Password Reset Handler
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (resetPasswordForm.newPassword.length < 8) {
      toast('New password must be at least 8 characters long', 'error');
      return;
    }
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmNewPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await userApiAdapter.resetPassword(
        selectedUser.id,
        resetPasswordForm.newPassword,
        currentTenant.id,
        storageMode
      );
      toast(res.message || 'Password reset successfully. Active sessions revoked.', 'success');
      setIsResetPasswordOpen(false);
      setSelectedUser(null);
      setResetPasswordForm({ newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change (Activate/Deactivate)
  const handleStatusToggle = async () => {
    const targetUser = confirmStatusModal.user;
    if (!targetUser) return;

    try {
      setSubmitting(true);
      await userApiAdapter.updateUserStatus(
        targetUser.id,
        confirmStatusModal.targetActive,
        currentTenant.id,
        storageMode
      );
      toast(
        confirmStatusModal.targetActive
          ? `Account for ${targetUser.name} activated.`
          : `Account for ${targetUser.name} deactivated. Active sessions revoked.`,
        'success'
      );
      setConfirmStatusModal({ open: false, user: null, targetActive: false });
      await loadUsers();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Session Revocation
  const handleRevokeSessionsSubmit = async () => {
    const targetUser = confirmRevokeModal.user;
    if (!targetUser) return;

    try {
      setSubmitting(true);
      const res = await userApiAdapter.revokeSessions(targetUser.id, currentTenant.id, storageMode);
      toast(res.message || 'All active sessions terminated for this account.', 'success');
      setConfirmRevokeModal({ open: false, user: null });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">User Accounts & Role Permissions</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="w-3 h-3" />
              Cloudflare D1 RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated portal accounts, assign tenant roles, and enforce session revocation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User Account</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Security / Query Error: </span>
            {errorBanner}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Roles</option>
              <option value="school_admin">School Admin</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher</option>
              <option value="accountant">Accountant</option>
              <option value="parent">Parent</option>
              <option value="student">Student</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>Loading user accounts from Cloudflare D1...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No user accounts found</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Try adjusting your filters or create a new user account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Linked Entity</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => {
                  const roleConfig = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {u.email}
                            </div>
                            {u.phone && (
                              <div className="text-[11px] text-slate-400">
                                {u.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-500">
                          {u.linkedEntityId || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit User */}
                          <button
                            title="Edit User Profile & Role"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditForm({
                                name: u.name,
                                phone: u.phone || '',
                                role: u.role,
                                linkedEntityId: u.linkedEntityId || ''
                              });
                              setIsEditOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            title="Admin Password Reset"
                            onClick={() => {
                              setSelectedUser(u);
                              setResetPasswordForm({ newPassword: '', confirmNewPassword: '' });
                              setIsResetPasswordOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke Sessions */}
                          <button
                            title="Terminate All Active Sessions"
                            onClick={() => setConfirmRevokeModal({ open: true, user: u })}
                            className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          {!isSelf && (
                            <button
                              title={u.isActive ? 'Deactivate User Account' : 'Activate User Account'}
                              onClick={() => setConfirmStatusModal({ open: true, user: u, targetActive: !u.isActive })}
                              className={`p-1.5 rounded-md transition ${
                                u.isActive
                                  ? 'text-slate-400 hover:text-rose-700 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New User Account"
        subtitle="Provision portal login with server-enforced role privileges"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sir Muhammad Irfan"
              value={createForm.name}
              onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Login Email *</label>
              <input
                type="email"
                required
                placeholder="user@school.edu.pk"
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Phone Number</label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                value={createForm.phone}
                onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Assigned Portal Role *</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium bg-white"
              >
                <option value="teacher">Teacher (Class Rosters & Academics)</option>
                <option value="principal">Principal (Academic Leadership)</option>
                <option value="accountant">Accountant (Fees & Financials)</option>
                <option value="school_admin">School Admin (Full Management)</option>
                <option value="parent">Parent (Linked Child Access)</option>
                <option value="student">Student (Self Profile Access)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Linked Entity ID</label>
              <input
                type="text"
                placeholder="e.g. teacher-1 or student-1"
                value={createForm.linkedEntityId}
                onChange={e => setCreateForm({ ...createForm, linkedEntityId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Links user to their student/faculty profile</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Initial Password * (Min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={createForm.password}
                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Confirm Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={createForm.confirmPassword}
                onChange={e => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        title={`Edit User: ${selectedUser?.name}`}
        subtitle="Update permitted profile details and access role"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1 text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Login Email (Read-only)</label>
              <input
                type="text"
                disabled
                value={selectedUser?.email || ''}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Phone Number</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Assigned Role *</label>
              <select
                value={editForm.role}
                onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium bg-white"
              >
                <option value="teacher">Teacher</option>
                <option value="principal">Principal</option>
                <option value="accountant">Accountant</option>
                <option value="school_admin">School Admin</option>
                <option value="parent">Parent</option>
                <option value="student">Student</option>
              </select>
              <span className="text-[10px] text-amber-700 mt-1 block">
                Changing role will automatically revoke active sessions for security.
              </span>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Linked Entity ID</label>
              <input
                type="text"
                value={editForm.linkedEntityId}
                onChange={e => setEditForm({ ...editForm, linkedEntityId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedUser(null);
              }}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          setSelectedUser(null);
        }}
        title={`Reset Password: ${selectedUser?.name}`}
        subtitle="Set a new secure password. All active sessions will be terminated immediately."
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs text-slate-800">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">Security Notice: </span>
              Resetting this password will immediately revoke all active cookies and sessions on all devices for this account.
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700">New Password * (Min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              value={resetPasswordForm.newPassword}
              onChange={e => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={resetPasswordForm.confirmNewPassword}
              onChange={e => setResetPasswordForm({ ...resetPasswordForm, confirmNewPassword: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsResetPasswordOpen(false);
                setSelectedUser(null);
              }}
              className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold shadow-xs transition"
            >
              {submitting ? 'Resetting...' : 'Reset Password & Revoke Sessions'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS (DEACTIVATE/ACTIVATE) MODAL */}
      <ConfirmModal
        isOpen={confirmStatusModal.open}
        onClose={() => setConfirmStatusModal({ open: false, user: null, targetActive: false })}
        onConfirm={handleStatusToggle}
        title={confirmStatusModal.targetActive ? 'Activate Account' : 'Deactivate Account'}
        message={
          confirmStatusModal.targetActive
            ? `Are you sure you want to re-activate the account for "${confirmStatusModal.user?.name}"? The user will be able to log in again.`
            : `Are you sure you want to deactivate "${confirmStatusModal.user?.name}"? The user will be prevented from logging in and all active sessions will be revoked immediately.`
        }
        confirmLabel={confirmStatusModal.targetActive ? 'Activate Account' : 'Deactivate & Revoke Sessions'}
        variant={confirmStatusModal.targetActive ? 'primary' : 'danger'}
      />

      {/* CONFIRM REVOKE SESSIONS MODAL */}
      <ConfirmModal
        isOpen={confirmRevokeModal.open}
        onClose={() => setConfirmRevokeModal({ open: false, user: null })}
        onConfirm={handleRevokeSessionsSubmit}
        title="Revoke All Active Sessions"
        message={`Are you sure you want to terminate all active sessions for "${confirmRevokeModal.user?.name}"? The user will be logged out on all devices.`}
        confirmLabel="Revoke Sessions"
        variant="danger"
      />
    </div>
  );
};
