import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { tenantService, subscriptionService, auditLogService } from '../../services';
import { StatCard, Badge } from '../../components/common/StatCard';
import { SimpleBarChart, SimpleDonutChart } from '../../components/charts/SimpleCharts';
import {
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tenants, switchTenant, switchRole, toast } = useApp();

  const totalSchools = tenants.length;
  const activeSchools = tenants.filter(t => t.status === 'active').length;
  const trialSchools = tenants.filter(t => t.status === 'trial').length;
  const suspendedSchools = tenants.filter(t => t.status === 'suspended').length;
  const totalStudents = tenants.reduce((sum, t) => sum + t.activeStudentCount, 0);

  const subscriptions = subscriptionService.getSubscriptions();
  const mrrPkr = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === 'monthly' ? s.amountPkr : Math.round(s.amountPkr / 12));
  }, 0);

  const auditLogs = auditLogService.getAll().slice(0, 5);

  const growthData = [
    { label: 'May', value: 8, formattedValue: '8 Schools' },
    { label: 'Jun', value: 12, formattedValue: '12 Schools' },
    { label: 'Jul', value: 18, formattedValue: '18 Schools' },
    { label: 'Aug', value: 24, formattedValue: '24 Schools' },
    { label: 'Sep', value: 31, formattedValue: '31 Schools' },
    { label: 'Oct', value: 38, formattedValue: '38 Schools' }
  ];

  const planDistribution = [
    { label: 'Standard (High Schools)', value: 24, color: '#2563eb' },
    { label: 'Starter (Tuition/Academies)', value: 10, color: '#0d9488' },
    { label: 'Enterprise (Networks)', value: 4, color: '#9333ea' }
  ];

  const handleJumpToSchool = (tenantId: string) => {
    switchTenant(tenantId);
    switchRole('school_admin');
    navigate('/school/dashboard');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Platform Master Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-tenant telemetry across registered Pakistani educational institutes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin Mode
          </span>
          <button
            onClick={() => navigate('/super-admin/schools')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Manage All Schools
          </button>
        </div>
      </div>

      {/* Mock Data Disclaimer Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center gap-2 text-xs text-slate-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Notice: Financial values, student counts, and renewal metrics on this console are mock demonstration records.</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl">
          <span className="text-[11px] uppercase font-bold text-slate-400">Total Schools</span>
          <p className="text-2xl font-black text-white mt-1">{totalSchools}</p>
          <div className="text-[10px] text-teal-400 mt-1 flex items-center gap-1">
            <span>{activeSchools} Active</span> • <span>{trialSchools} Trial</span>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl">
          <span className="text-[11px] uppercase font-bold text-slate-400">Total Students</span>
          <p className="text-2xl font-black text-white mt-1">{totalStudents.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Across all active school databases</span>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl">
          <span className="text-[11px] uppercase font-bold text-slate-400">Monthly Recurring (MRR)</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">PKR {mrrPkr.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Mock platform subscription run-rate</span>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl">
          <span className="text-[11px] uppercase font-bold text-slate-400">Cloudflare Health</span>
          <p className="text-2xl font-black text-teal-300 mt-1">100% Edge</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Workers & D1 DB Ready</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-white">School Growth Trajectory</h2>
              <p className="text-xs text-slate-400">Newly onboarded Pakistani schools (Past 6 Months)</p>
            </div>
            <span className="text-xs font-semibold text-teal-400">+34% Growth</span>
          </div>
          <SimpleBarChart data={growthData} height={190} color="#38bdf8" />
        </div>

        <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">Subscription Tier Split</h2>
            <p className="text-xs text-slate-400 mb-4">Distribution by customer segment</p>
            <SimpleDonutChart segments={planDistribution} totalLabel="Schools" />
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3 pt-3 border-t border-slate-700">
            Standard Plan is favored by Pakistani matric schools.
          </p>
        </div>
      </div>

      {/* Registered Schools Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Registered School Tenants</h2>
            <p className="text-xs text-slate-400">Switch into any tenant ERP space with 1-click</p>
          </div>
          <button
            onClick={() => navigate('/super-admin/schools')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            View All ({tenants.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">School Name</th>
                <th className="py-3 px-3">City / Type</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Students</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-700/40 transition">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                      style={{ backgroundColor: t.branding.primaryColor || '#1e3a8a' }}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.branding.schoolName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">/{t.slug}</div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-slate-300 font-medium">{t.branding.city}</span>
                    <span className="text-[10px] text-slate-400 block capitalize">{t.type.replace('_', ' ')}</span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-purple-300">
                    {t.planId.replace('plan-', '').toUpperCase()}
                  </td>
                  <td className="py-3 px-3 font-mono font-medium">
                    {t.activeStudentCount} / {t.studentLimit}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.status === 'active'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : t.status === 'trial'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleJumpToSchool(t.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold transition"
                    >
                      <span>Jump to ERP</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">System Audit & Security Logs</h2>
          <button
            onClick={() => navigate('/super-admin/audit-logs')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            Full Trail →
          </button>
        </div>
        <div className="space-y-2 text-xs">
          {auditLogs.map(log => (
            <div key={log.id} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-200">{log.action}</span>
                <span className="text-slate-400 block text-[11px]">{log.details}</span>
              </div>
              <div className="text-right text-[10px] text-slate-400 shrink-0 font-mono">
                <div>{log.actorName}</div>
                <div>{log.timestamp} • {log.ipAddress}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
