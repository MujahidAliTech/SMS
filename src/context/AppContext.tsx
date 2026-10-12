import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User, UserRole, TenantBranding } from '../types';
import { tenantService } from '../services';
import { MockStorageAdapter } from '../services/storage';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Tenant
  currentTenant: Tenant;
  tenants: Tenant[];
  switchTenant: (tenantId: string) => void;
  updateBranding: (branding: Partial<TenantBranding>) => void;
  refreshTenants: () => void;

  // Auth / Role
  currentUser: User;
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  allUsers: User[];

  // Toast notification
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;

  // Reset demo
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>(tenantService.getAll());
  const [currentTenantId, setCurrentTenantId] = useState<string>(() => MockStorageAdapter.getCurrentTenantId());
  const [currentUser, setCurrentUserState] = useState<User>(() => MockStorageAdapter.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(MockStorageAdapter.getUsers());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0];

  const toast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const switchTenant = (tenantId: string) => {
    const target = tenants.find(t => t.id === tenantId);
    if (target) {
      setCurrentTenantId(tenantId);
      MockStorageAdapter.setCurrentTenantId(tenantId);
      toast(`Switched active school to: ${target.name}`, 'info');

      // Also ensure user belongs to this tenant or is super admin
      if (currentUser.role !== 'super_admin') {
        const matchingUser = allUsers.find(u => u.tenantId === tenantId && u.role === currentUser.role);
        if (matchingUser) {
          setCurrentUserState(matchingUser);
          MockStorageAdapter.setCurrentUser(matchingUser);
        } else {
          // Fallback to school admin for that tenant
          const schoolAdmin = allUsers.find(u => u.tenantId === tenantId && u.role === 'school_admin');
          if (schoolAdmin) {
            setCurrentUserState(schoolAdmin);
            MockStorageAdapter.setCurrentUser(schoolAdmin);
          }
        }
      }
    }
  };

  const switchUser = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUserState(user);
      MockStorageAdapter.setCurrentUser(user);
      if (user.tenantId && user.tenantId !== currentTenantId) {
        setCurrentTenantId(user.tenantId);
        MockStorageAdapter.setCurrentTenantId(user.tenantId);
      }
      toast(`Switched profile to: ${user.name} (${user.role.replace('_', ' ').toUpperCase()})`, 'info');
    }
  };

  const switchRole = (role: UserRole) => {
    if (role === 'super_admin') {
      const superUser = allUsers.find(u => u.role === 'super_admin');
      if (superUser) {
        setCurrentUserState(superUser);
        MockStorageAdapter.setCurrentUser(superUser);
        toast(`Switched role to Platform Super Admin`, 'info');
      }
      return;
    }

    // Find user for current tenant with that role
    let target = allUsers.find(u => u.tenantId === currentTenantId && u.role === role);
    if (!target) {
      // Find any user with that role
      target = allUsers.find(u => u.role === role);
    }
    if (target) {
      setCurrentUserState(target);
      MockStorageAdapter.setCurrentUser(target);
      if (target.tenantId && target.tenantId !== currentTenantId) {
        setCurrentTenantId(target.tenantId);
        MockStorageAdapter.setCurrentTenantId(target.tenantId);
      }
      toast(`Logged in as: ${target.name} (${role.replace('_', ' ')})`, 'info');
    }
  };

  const updateBranding = (brandingUpdates: Partial<TenantBranding>) => {
    const updated = tenantService.update(currentTenant.id, {
      branding: {
        ...currentTenant.branding,
        ...brandingUpdates
      }
    });
    setTenants(tenantService.getAll());
    toast(`Branding updated for ${updated.name}`, 'success');
  };

  const refreshTenants = () => {
    setTenants(tenantService.getAll());
  };

  const resetDemoData = () => {
    MockStorageAdapter.resetAll();
    setTenants(tenantService.getAll());
    setCurrentTenantId('tenant-bfs');
    const defaultUser = MockStorageAdapter.getCurrentUser();
    setCurrentUserState(defaultUser);
    setAllUsers(MockStorageAdapter.getUsers());
    toast('All demo data has been reset to defaults', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentTenant,
        tenants,
        switchTenant,
        updateBranding,
        refreshTenants,
        currentUser,
        switchUser,
        switchRole,
        allUsers,
        toast,
        toasts,
        removeToast,
        resetDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
