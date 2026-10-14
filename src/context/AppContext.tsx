import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User, UserRole, TenantBranding } from '../types';
import { tenantService } from '../services';
import { MockStorageAdapter } from '../services/storage';
import { authApi } from '../services/authApi';
import { StorageMode } from '../services/dataAdapter';

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
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<User | null>;

  // Data Mode (Stage 4B)
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;

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

  // Stage 4B Auth and Backend Mode State
  const [storageMode, setStorageModeState] = useState<StorageMode>(() => {
    return (localStorage.getItem('taleemcloud_storage_mode') as StorageMode) || 'cloudflare_d1';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0];

  const setStorageMode = (mode: StorageMode) => {
    setStorageModeState(mode);
    localStorage.setItem('taleemcloud_storage_mode', mode);
    toast(`Data storage mode set to: ${mode === 'cloudflare_d1' ? 'Cloudflare D1' : 'Local Storage Demo'}`, 'info');
  };

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

  /**
   * Check active server session on application mount via GET /api/v1/auth/me
   */
  useEffect(() => {
    let isMounted = true;

    async function checkServerSession() {
      setIsAuthChecking(true);
      try {
        const { data, error } = await authApi.getMe();
        if (!isMounted) return;

        if (!error && data?.user) {
          const serverUser: User = {
            id: data.user.id,
            tenantId: data.user.tenantId || currentTenantId,
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone || '',
            role: data.user.role,
            avatarUrl: data.user.avatarUrl || undefined,
            linkedEntityId: data.user.linkedEntityId || undefined
          };

          setCurrentUserState(serverUser);
          setIsAuthenticated(true);
          setStorageModeState('cloudflare_d1');

          if (data.tenant) {
            setCurrentTenantId(data.tenant.id);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }

    checkServerSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Authenticate with Cloudflare Worker via POST /api/v1/auth/login
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const { data, error } = await authApi.login(email, password);
      if (error || !data) {
        return { success: false, error: error?.message || 'Authentication failed' };
      }

      const verifiedUser: User = {
        id: data.user.id,
        tenantId: data.user.tenantId || currentTenantId,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role,
        avatarUrl: data.user.avatarUrl || undefined,
        linkedEntityId: data.user.linkedEntityId || undefined
      };

      setCurrentUserState(verifiedUser);
      setIsAuthenticated(true);
      setStorageModeState('cloudflare_d1');

      if (data.tenant) {
        setCurrentTenantId(data.tenant.id);
      }

      toast(`Successfully authenticated as ${verifiedUser.name} (${verifiedUser.role.replace('_', ' ')})`, 'success');
      return { success: true, user: verifiedUser };
    } catch (err) {
      const msg = (err as Error).message || 'Network error occurred while connecting to auth server';
      return { success: false, error: msg };
    }
  };

  /**
   * Log out via POST /api/v1/auth/logout
   */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API notification failed:', err);
    } finally {
      setIsAuthenticated(false);
      toast('You have been logged out securely', 'info');
    }
  };

  const refreshAuth = async (): Promise<User | null> => {
    try {
      const { data, error } = await authApi.getMe();
      if (!error && data?.user) {
        const user: User = {
          id: data.user.id,
          tenantId: data.user.tenantId || currentTenantId,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          role: data.user.role,
          avatarUrl: data.user.avatarUrl || undefined,
          linkedEntityId: data.user.linkedEntityId || undefined
        };
        setCurrentUserState(user);
        setIsAuthenticated(true);
        return user;
      }
      setIsAuthenticated(false);
      return null;
    } catch {
      setIsAuthenticated(false);
      return null;
    }
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

  /**
   * Explicit Demo/Development Role Switcher (cannot bypass server authentication)
   */
  const switchRole = (role: UserRole) => {
    if (role === 'super_admin') {
      const superUser = allUsers.find(u => u.role === 'super_admin');
      if (superUser) {
        setCurrentUserState(superUser);
        MockStorageAdapter.setCurrentUser(superUser);
        toast(`[Demo Mode] Switched role to Platform Super Admin`, 'info');
      }
      return;
    }

    // Find user for current tenant with that role
    let target = allUsers.find(u => u.tenantId === currentTenantId && u.role === role);
    if (!target) {
      target = allUsers.find(u => u.role === role);
    }
    if (target) {
      setCurrentUserState(target);
      MockStorageAdapter.setCurrentUser(target);
      if (target.tenantId && target.tenantId !== currentTenantId) {
        setCurrentTenantId(target.tenantId);
        MockStorageAdapter.setCurrentTenantId(target.tenantId);
      }
      toast(`[Demo Mode] Switched to persona: ${target.name} (${role.replace('_', ' ')})`, 'info');
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
        isAuthenticated,
        isAuthChecking,
        login,
        logout,
        refreshAuth,
        storageMode,
        setStorageMode,
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
