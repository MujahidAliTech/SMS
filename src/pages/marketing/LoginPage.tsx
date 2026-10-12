import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Building2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, tenants, switchTenant, switchRole, allUsers } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>('school_admin');

  const demoRoles = [
    {
      role: 'school_admin' as UserRole,
      title: 'School Administrator',
      desc: 'Full control over school settings, students, staff, classes, fees, timetable, and website',
      badge: 'Main ERP',
      color: 'border-blue-500 bg-blue-50/50 text-blue-900'
    },
    {
      role: 'super_admin' as UserRole,
      title: 'Platform Super Admin',
      desc: 'SaaS owner dashboard: all registered schools, subscription plans, MRR, system audit logs',
      badge: 'SaaS Owner',
      color: 'border-purple-500 bg-purple-50/50 text-purple-900'
    },
    {
      role: 'teacher' as UserRole,
      title: 'Class Teacher (Sir Zeeshan)',
      desc: 'Mobile-first portal to mark daily attendance, enter exam marks, and assign homework',
      badge: 'Teacher App',
      color: 'border-teal-500 bg-teal-50/50 text-teal-900'
    },
    {
      role: 'accountant' as UserRole,
      title: 'Accountant (Farooq Ahmed)',
      desc: 'Fee challan issuance, receipt recording, discount concessions, and daily collection desk',
      badge: 'Accounts Desk',
      color: 'border-amber-500 bg-amber-50/50 text-amber-900'
    },
    {
      role: 'parent' as UserRole,
      title: 'Parent (M. Rizwan)',
      desc: 'Multi-child parent app: view fees, report cards, attendance, and school notices',
      badge: 'Parent Portal',
      color: 'border-emerald-500 bg-emerald-50/50 text-emerald-900'
    },
    {
      role: 'student' as UserRole,
      title: 'Student (Hamza Rizwan)',
      desc: 'Student personal dashboard: attendance stats, progress card, homework, and timetable',
      badge: 'Student Portal',
      color: 'border-slate-500 bg-slate-50 text-slate-900'
    }
  ];

  const handle1ClickLogin = (role: UserRole) => {
    switchRole(role);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Security Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>SIMULATED DEMO AUTHENTICATION NOTICE</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          For this frontend prototype, authentication is simulated using mock session state and role switching. No real passwords are required. In the production phase, this interface connects to Cloudflare Workers with secure HttpOnly JWT sessions.
        </p>
      </div>

      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-900/20">
          <GraduationCap className="w-7 h-7 text-teal-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          TaleemCloud PK Interactive Demo Access
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Select an authorized demo role and school tenant below to immediately enter the designated dashboard.
        </p>
      </div>

      {/* Tenant Selector for the session */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Demonstration School
            </span>
            <span className="text-sm font-bold text-slate-900">
              {currentTenant.branding.schoolName} ({currentTenant.branding.city})
            </span>
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={currentTenant.id}
            onChange={e => switchTenant(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.branding.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1-Click Role Switcher Grid */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Choose a Persona to Test:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoRoles.map(item => (
            <div
              key={item.role}
              onClick={() => handle1ClickLogin(item.role)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                    {item.title}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.color}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-900">
                <span>Enter as {item.title.split(' ')[0]} →</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
