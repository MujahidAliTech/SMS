import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DemoBanner } from '../components/common/DemoBanner';
import { ToastContainer } from '../components/common/ToastContainer';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  BookOpen,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  Clock,
  BookMarked,
  UserPlus,
  Bell,
  Calendar,
  FileBarChart,
  Globe,
  Award,
  Settings,
  Menu,
  X,
  Search,
  ExternalLink,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const SchoolAdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTenant, currentUser, switchRole, logout } = useApp();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canManageUsers = ['school_admin', 'super_admin'].includes(currentUser.role);
  const canManageBillingAndSettings = ['school_admin', 'super_admin'].includes(currentUser.role);

  const menuItems = [
    { label: 'Dashboard', path: '/school/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/school/students', icon: GraduationCap },
    { label: 'Parents', path: '/school/parents', icon: Users },
    { label: 'Teachers & Staff', path: '/school/teachers', icon: Briefcase },
    { label: 'Classes & Sections', path: '/school/classes', icon: Layers },
    { label: 'Subjects', path: '/school/subjects', icon: BookOpen },
    { label: 'Daily Attendance', path: '/school/attendance', icon: CalendarCheck },
    { label: 'Fees & Challans', path: '/school/fees', icon: CreditCard },
    { label: 'Exams & Results', path: '/school/exams', icon: FileSpreadsheet },
    { label: 'Timetable', path: '/school/timetable', icon: Clock },
    { label: 'Homework', path: '/school/homework', icon: BookMarked },
    { label: 'Admissions', path: '/school/admissions', icon: UserPlus },
    { label: 'Announcements', path: '/school/announcements', icon: Bell },
    { label: 'Events & Calendar', path: '/school/events', icon: Calendar },
    { label: 'Reports & Exports', path: '/school/reports', icon: FileBarChart },
    { label: 'Public Website', path: '/school/website-settings', icon: Globe },
    ...(canManageUsers ? [{ label: 'User Accounts', path: '/school/users', icon: ShieldCheck }] : []),
    ...(canManageBillingAndSettings ? [
      { label: 'Subscription Plan', path: '/school/subscription', icon: Award },
      { label: 'School Settings', path: '/school/settings', icon: Settings }
    ] : [])
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-800">
      <DemoBanner />
      <ToastContainer />

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* School Brand in Sidebar */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shrink-0 overflow-hidden"
                style={{ backgroundColor: currentTenant.branding.primaryColor || '#1e3a8a' }}
              >
                {currentTenant.branding.logoUrl ? (
                  <img src={currentTenant.branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span>{currentTenant.name.charAt(0)}</span>
                )}
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold text-white truncate leading-tight">
                  {currentTenant.branding.schoolName}
                </h1>
                <span className="text-[10px] text-teal-400 font-medium block truncate">
                  Session: {currentTenant.branding.academicSession}
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
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-1">
              Main Operations
            </div>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/school/dashboard' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom School Info & Website Quick Launch */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs">
            <a
              href={`/s/${currentTenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded bg-slate-800/70 hover:bg-slate-800 text-teal-300 text-[11px] font-medium transition"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Globe className="w-3.5 h-3.5" />
                <span>Visit School Website</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {currentTenant.type === 'school' ? 'High School' : currentTenant.type === 'academy' ? 'Academy' : 'Tuition'} ERP
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-600">
                  {currentTenant.branding.city}, Pakistan
                </span>
              </div>
            </div>

            {/* Right Top Header Controls */}
            <div className="flex items-center gap-3">
              <Link
                to="/school/admissions"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Admissions Open</span>
              </Link>

              {/* User badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log Out (Returns to Login)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
