import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DemoBanner } from '../components/common/DemoBanner';
import { ToastContainer } from '../components/common/ToastContainer';
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  Clock,
  BookOpen,
  User,
  LogOut,
  Bell,
  ArrowLeft
} from 'lucide-react';

export const PortalLayout: React.FC<{
  portalType: 'teacher' | 'parent' | 'student';
}> = ({ portalType }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTenant, currentUser, switchRole, logout } = useApp();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPortalNavItems = () => {
    if (portalType === 'teacher') {
      return [
        { label: 'Overview', path: '/teacher/dashboard', icon: LayoutDashboard },
        { label: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck },
        { label: 'Homework', path: '/teacher/homework', icon: BookOpen },
        { label: 'Marks', path: '/teacher/marks', icon: FileSpreadsheet },
        { label: 'Timetable', path: '/teacher/timetable', icon: Clock }
      ];
    }
    if (portalType === 'parent') {
      return [
        { label: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard },
        { label: 'Attendance', path: '/parent/attendance', icon: CalendarCheck },
        { label: 'Fee Dues', path: '/parent/fees', icon: CreditCard },
        { label: 'Report Card', path: '/parent/results', icon: FileSpreadsheet },
        { label: 'Homework', path: '/parent/homework', icon: BookOpen }
      ];
    }
    // Student
    return [
      { label: 'Home', path: '/student/dashboard', icon: LayoutDashboard },
      { label: 'Attendance', path: '/student/attendance', icon: CalendarCheck },
      { label: 'My Grades', path: '/student/results', icon: FileSpreadsheet },
      { label: 'Homework', path: '/student/homework', icon: BookOpen },
      { label: 'Timetable', path: '/student/timetable', icon: Clock }
    ];
  };

  const navItems = getPortalNavItems();

  const portalTitle = {
    teacher: 'Teacher Portal',
    parent: 'Parent Portal',
    student: 'Student Portal'
  }[portalType];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-800 pb-16 md:pb-0">
      <DemoBanner />
      <ToastContainer />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0"
            style={{ backgroundColor: currentTenant.branding.primaryColor || '#1e3a8a' }}
          >
            {currentTenant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {currentTenant.branding.schoolName}
            </h1>
            <span className="text-[11px] font-semibold text-teal-700 block">
              {portalTitle}
            </span>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 pr-3 border-r border-slate-200">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <span className="font-semibold block text-slate-800">{currentUser.name}</span>
            </div>
            <button
              onClick={() => { switchRole('school_admin'); navigate('/school/dashboard'); }}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              title="Return to School Admin ERP"
            >
              Exit Portal
            </button>
            <button
              onClick={handleLogout}
              className="text-xs px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium transition flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Essential for Pakistan smartphone users) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 md:hidden flex justify-around items-center h-16 px-1 no-print">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
