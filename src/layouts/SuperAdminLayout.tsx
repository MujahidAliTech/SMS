import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DemoBanner } from '../components/common/DemoBanner';
import { ToastContainer } from '../components/common/ToastContainer';
import {
  ShieldCheck,
  Building2,
  Award,
  CreditCard,
  History,
  Settings,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

export const SuperAdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, switchRole, logout } = useApp();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const superAdminLinks = [
    { label: 'Platform Overview', path: '/super-admin/dashboard', icon: TrendingUp },
    { label: 'Schools & Academies', path: '/super-admin/schools', icon: Building2 },
    { label: 'Subscription Plans', path: '/super-admin/plans', icon: Award },
    { label: 'Subscriptions & MRR', path: '/super-admin/subscriptions', icon: CreditCard },
    { label: 'System Audit Logs', path: '/super-admin/audit-logs', icon: History },
    { label: 'Platform Settings', path: '/super-admin/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 font-sans text-slate-100">
      <DemoBanner />
      <ToastContainer />

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Super Admin Brand */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-600/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">
                  TaleemCloud PK
                </h1>
                <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block">
                  Platform Super Admin
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-2">
              SaaS Infrastructure
            </div>
            {superAdminLinks.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/super-admin/dashboard' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-200 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick SaaS Website link */}
          <div className="p-3 border-t border-slate-800 text-xs">
            <Link
              to="/"
              className="flex items-center justify-between p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium transition"
            >
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                <span>Marketing Landing</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
          <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider bg-purple-950/60 border border-purple-800/60 px-2.5 py-1 rounded">
                Super Admin Console
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Operator: <strong className="text-slate-200">{currentUser.name}</strong>
              </span>
              <button
                onClick={() => { switchRole('school_admin'); navigate('/school/dashboard'); }}
                className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                Switch to School ERP
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                title="Sign out of Super Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
