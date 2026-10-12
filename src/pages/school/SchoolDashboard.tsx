import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  studentService,
  teacherStaffService,
  classService,
  feeService,
  attendanceService,
  examService,
  admissionService,
  announcementService
} from '../../services';
import { StatCard } from '../../components/common/StatCard';
import { SimpleLineChart, SimpleBarChart } from '../../components/charts/SimpleCharts';
import {
  GraduationCap,
  Users,
  Briefcase,
  Layers,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Sparkles,
  Phone
} from 'lucide-react';

export const SchoolDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useApp();

  const students = studentService.getAll(currentTenant.id);
  const teachers = teacherStaffService.getAll(currentTenant.id);
  const classes = classService.getAll(currentTenant.id);
  const invoices = feeService.getInvoices(currentTenant.id);
  const payments = feeService.getPayments(currentTenant.id);
  const admissions = admissionService.getAll(currentTenant.id);
  const announcements = announcementService.getAll(currentTenant.id);
  const exams = examService.getExams(currentTenant.id);

  const activeStudentsCount = students.filter(s => s.status === 'active').length;
  const totalPendingFee = invoices.reduce((sum, inv) => sum + inv.balance, 0);
  const totalCollectedThisMonth = payments.reduce((sum, p) => sum + p.amount, 0);

  // Mock attendance percentage
  const todayAttendancePercent = 94;

  const attendanceTrend = [
    { label: 'Mon', value: 92 },
    { label: 'Tue', value: 95 },
    { label: 'Wed', value: 94 },
    { label: 'Thu', value: 91 },
    { label: 'Fri', value: 96 },
    { label: 'Sat', value: 89 }
  ];

  const feeTrend = [
    { label: 'Jun', value: 240000, formattedValue: '240k' },
    { label: 'Jul', value: 290000, formattedValue: '290k' },
    { label: 'Aug', value: 380000, formattedValue: '380k' },
    { label: 'Sep', value: 340000, formattedValue: '340k' },
    { label: 'Oct', value: 410000, formattedValue: '410k' }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner with Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {currentTenant.branding.schoolName}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
              Session {currentTenant.branding.academicSession}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentTenant.branding.address}, {currentTenant.branding.city} • Affiliation: {currentTenant.branding.affiliationBoard}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/school/students')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Student</span>
          </button>
          <button
            onClick={() => navigate('/school/attendance')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => navigate('/school/fees')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Fee Challans</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={activeStudentsCount}
          subtitle={`Limit: ${currentTenant.studentLimit} students`}
          icon={GraduationCap}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          onClick={() => navigate('/school/students')}
        />
        <StatCard
          title="Today's Attendance"
          value={`${todayAttendancePercent}%`}
          subtitle="Morning assembly roll call"
          icon={CalendarCheck}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
          onClick={() => navigate('/school/attendance')}
        />
        <StatCard
          title="Collected (Oct)"
          value={`PKR ${totalCollectedThisMonth.toLocaleString()}`}
          subtitle="Cash, Bank & Mobile wallets"
          icon={CreditCard}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          onClick={() => navigate('/school/fees')}
        />
        <StatCard
          title="Pending Dues"
          value={`PKR ${totalPendingFee.toLocaleString()}`}
          subtitle="Outstanding parent challans"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          onClick={() => navigate('/school/fees')}
        />
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Teaching Faculty</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{teachers.length}</p>
          </div>
          <Briefcase className="w-5 h-5 text-slate-400" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Classes</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{classes.length}</p>
          </div>
          <Layers className="w-5 h-5 text-slate-400" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase">New Admissions</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{admissions.length}</p>
          </div>
          <Sparkles className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Active Exams</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{exams.length}</p>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-purple-500" />
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Weekly Attendance Trend</h3>
              <p className="text-xs text-slate-400">Class 1 through Class 10 cumulative presence rate</p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              Avg: 93.6%
            </span>
          </div>
          <SimpleLineChart points={attendanceTrend} height={180} />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Monthly Fee Recovery (PKR)</h3>
              <p className="text-xs text-slate-400">Tuition fees collected per billing cycle</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              PKR 410,000 Oct
            </span>
          </div>
          <SimpleBarChart data={feeTrend} height={180} color="#1d4ed8" />
        </div>
      </div>

      {/* 2 Column Operations: Recent Admissions & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Admissions Applications */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Admission Applications</h3>
              <p className="text-xs text-slate-400">Submitted online through public school portal</p>
            </div>
            <button
              onClick={() => navigate('/school/admissions')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Manage ({admissions.length}) →
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {admissions.map(adm => (
              <div key={adm.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <span className="font-bold text-slate-900 block">{adm.applicantName}</span>
                  <span className="text-slate-500 text-[11px]">
                    Applied for: {adm.classApplied} • Father: {adm.fatherName}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    adm.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {adm.status}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">{adm.submissionDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Fee Payments Recorded */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Recent Fee Collections</h3>
              <p className="text-xs text-slate-400">Issued official receipts in PKR</p>
            </div>
            <button
              onClick={() => navigate('/school/fees')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Fee Desk →
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {payments.map(pay => (
              <div key={pay.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <span className="font-bold text-slate-900 block">{pay.studentName}</span>
                  <span className="text-slate-500 text-[11px] font-mono">
                    {pay.receiptNo} • Method: {pay.paymentMethod.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-emerald-700 block">
                    PKR {pay.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{pay.paymentDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* School Notice Board */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Active Notice Board</h3>
            <p className="text-xs text-slate-400">Announcements broadcasted to parents and teachers</p>
          </div>
          <button
            onClick={() => navigate('/school/announcements')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            Create Notice →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {announcements.map(ann => (
            <div
              key={ann.id}
              className={`p-4 rounded-xl border ${
                ann.isUrdu ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 text-xs">{ann.title}</span>
                <span className="text-[10px] text-slate-500 font-mono">{ann.createdAt}</span>
              </div>
              <p className={`text-slate-600 leading-relaxed ${ann.isUrdu ? 'urdu-text text-sm' : 'text-xs'}`}>
                {ann.content}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>By: {ann.authorName}</span>
                <span className="capitalize px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[10px]">
                  Audience: {ann.targetAudience.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
