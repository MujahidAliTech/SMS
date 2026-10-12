import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { 
  Building2, 
  UserCheck, 
  RotateCcw, 
  ExternalLink, 
  Sparkles,
  Home,
  ShieldAlert
} from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { currentTenant, tenants, switchTenant, currentUser, switchRole, resetDemoData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    switchRole(role);

    // Route to appropriate section
    switch (role) {
      case 'super_admin':
        navigate('/super-admin/dashboard');
        break;
      case 'school_admin':
      case 'principal':
        navigate('/school/dashboard');
        break;
      case 'teacher':
        navigate('/teacher/dashboard');
        break;
      case 'parent':
        navigate('/parent/dashboard');
        break;
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'accountant':
        navigate('/school/fees');
        break;
    }
  };

  const isPublicOrMarketing = location.pathname.startsWith('/s/') || 
    ['/', '/features', '/solutions', '/pricing', '/about', '/contact', '/login', '/demo'].includes(location.pathname);

  return (
    <aside aria-label="Demo environment control panel" className="no-print bg-slate-900 text-white text-xs border-b border-slate-800 z-50 sticky top-0 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Demo badge & notice */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase tracking-wider text-[10px] border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            DEMO MODE
          </span>
          <span className="hidden sm:inline text-slate-300">
            Frontend Prototype • Realistic Pakistan Data (PKR)
          </span>
        </div>

        {/* Center / Right Controls: Tenant Switcher & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tenant Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 rounded px-2 py-1 border border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400 font-medium hidden md:inline">School:</span>
            <select
              aria-label="Select demo school tenant"
              value={currentTenant.id}
              onChange={(e) => switchTenant(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-xs"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name} ({t.type === 'school' ? 'School' : t.type === 'academy' ? 'Academy' : 'Tuition'})
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 rounded px-2 py-1 border border-slate-700">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 font-medium hidden md:inline">Role:</span>
            <select
              aria-label="Select user demo role"
              value={currentUser.role}
              onChange={handleRoleChange}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="super_admin" className="bg-slate-900 text-white">Super Admin (Platform)</option>
              <option value="school_admin" className="bg-slate-900 text-white">School Admin</option>
              <option value="principal" className="bg-slate-900 text-white">Principal</option>
              <option value="teacher" className="bg-slate-900 text-white">Teacher (Sir Zeeshan)</option>
              <option value="accountant" className="bg-slate-900 text-white">Accountant (Farooq)</option>
              <option value="parent" className="bg-slate-900 text-white">Parent (M. Rizwan)</option>
              <option value="student" className="bg-slate-900 text-white">Student (Hamza)</option>
            </select>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-1.5 pl-1">
            <button
              onClick={() => navigate(`/s/${currentTenant.slug}`)}
              title="View Public School Website for this tenant"
              className="flex items-center gap-1 px-2 py-1 bg-teal-600/30 text-teal-300 hover:bg-teal-600/50 rounded transition border border-teal-500/30"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">School Web</span>
            </button>

            <button
              onClick={() => navigate('/')}
              title="SaaS Marketing Website"
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition border border-slate-700"
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">SaaS Home</span>
            </button>

            <button
              onClick={resetDemoData}
              title="Reset all mock data"
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden lg:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
