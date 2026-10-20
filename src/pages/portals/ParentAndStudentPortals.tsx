import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  studentService, 
  feeService, 
  examService, 
  homeworkService, 
  announcementService, 
  timetableService,
  classService
} from '../../services';
import { 
  Student, 
  FeeInvoice, 
  StudentResult, 
  Homework, 
  Announcement, 
  TimetableEntry,
  SchoolClass
} from '../../types';
import { FeeReceiptModal } from '../../components/print/FeeReceiptModal';
import { ReportCardModal } from '../../components/print/ReportCardModal';
import { attendanceApiAdapter, feeApiAdapter, examApiAdapter, StudentAttendanceHistoryResponse } from '../../services/dataAdapter';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  BookOpen,
  Printer,
  Bell,
  Clock,
  Sparkles,
  Phone,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Check,
  HelpCircle,
  FileText
} from 'lucide-react';

/* =========================================================================
   PARENT PORTAL COMPONENT
   ========================================================================= */

export const ParentPortal: React.FC = () => {
  const { currentTenant, currentUser, storageMode, toast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current URL path
  const getTabFromPath = (): 'dashboard' | 'attendance' | 'fees' | 'results' | 'homework' | 'timetable' => {
    if (location.pathname.includes('/attendance')) return 'attendance';
    if (location.pathname.includes('/fees')) return 'fees';
    if (location.pathname.includes('/results')) return 'results';
    if (location.pathname.includes('/homework')) return 'homework';
    if (location.pathname.includes('/timetable')) return 'timetable';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'fees' | 'results' | 'homework' | 'timetable'>(getTabFromPath);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'dashboard' | 'attendance' | 'fees' | 'results' | 'homework' | 'timetable') => {
    setActiveTab(tab);
    const pathMap = {
      dashboard: '/parent/dashboard',
      attendance: '/parent/attendance',
      fees: '/parent/fees',
      results: '/parent/results',
      homework: '/parent/homework',
      timetable: '/parent/dashboard' // Sub-tab on dashboard
    };
    navigate(pathMap[tab]);
  };

  // Find children for current parent
  const allStudents = studentService.getAll(currentTenant.id);
  const myChildren = allStudents.filter(
    s => s.parentId === 'parent-1' || s.fatherName.toLowerCase().includes('rizwan') || s.id === 'student-1' || s.id === 'student-4'
  );
  const childrenList = myChildren.length > 0 ? myChildren : allStudents.slice(0, 2);

  const [activeChildId, setActiveChildId] = useState<string>(childrenList[0]?.id || 'student-1');
  const activeChild: Student = childrenList.find(c => c.id === activeChildId) || childrenList[0] || allStudents[0];

  // Child-specific data
  const [childInvoices, setChildInvoices] = useState<FeeInvoice[]>(() =>
    feeService.getInvoices(currentTenant.id).filter(i => i.studentId === activeChild.id)
  );
  const [childResults, setChildResults] = useState<StudentResult[]>(() =>
    examService.getResults(currentTenant.id).filter(r => r.studentId === activeChild.id)
  );
  const childHomework = homeworkService.getAll(currentTenant.id).filter(h => h.classId === activeChild.classId);
  const timetable = timetableService.getAll(currentTenant.id, activeChild.classId);
  const announcements = announcementService.getAll(currentTenant.id).filter(
    a => a.targetAudience === 'everyone' || a.targetAudience === 'parents'
  );

  // Homework acknowledgment state (frontend demo state)
  const [acknowledgedHw, setAcknowledgedHw] = useState<Record<string, boolean>>({
    'hw-1': true
  });

  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>(childResults[0]?.examId || 'exam-mid-26');

  const pendingDues = childInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
  const totalBilled = childInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalPaid = childInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);

  const currentResult = childResults.find(r => r.examId === selectedExamId) || childResults[0];

  // Dynamic D1 Fee Invoices & Attendance state for active child
  const [d1Attendance, setD1Attendance] = useState<StudentAttendanceHistoryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadResults() {
      if (!activeChild?.id) return;
      try {
        const exams = await examApiAdapter.getExams(currentTenant.id, undefined, storageMode);
        const activeExamId = exams[0]?.id || 'exam-mid-2026';
        const res = await examApiAdapter.getResults(activeExamId, { tenantId: currentTenant.id, studentId: activeChild.id }, storageMode);
        if (isMounted && res && res.length > 0) {
          setChildResults(res);
        }
      } catch (err) {
        console.warn('Failed to load child exam results from API:', err);
      }
    }
    loadResults();
    return () => { isMounted = false; };
  }, [activeChild?.id, currentTenant.id, storageMode]);

  useEffect(() => {
    let isMounted = true;
    async function loadInvoices() {
      if (!activeChild?.id) return;
      try {
        const invs = await feeApiAdapter.getInvoices(currentTenant.id, { studentId: activeChild.id }, storageMode);
        if (isMounted) setChildInvoices(invs);
      } catch (err) {
        console.warn('Failed to load child invoices from API:', err);
      }
    }
    loadInvoices();
    return () => { isMounted = false; };
  }, [activeChild?.id, currentTenant.id, storageMode]);

  useEffect(() => {
    let isMounted = true;
    async function loadAttendance() {
      if (!activeChild?.id) return;
      try {
        const res = await attendanceApiAdapter.getStudentAttendance(activeChild.id, currentTenant.id, undefined, storageMode);
        if (isMounted) setD1Attendance(res);
      } catch (err) {
        console.warn('Failed to load child attendance:', err);
      }
    }
    loadAttendance();
    return () => { isMounted = false; };
  }, [activeChild?.id, currentTenant.id, storageMode]);

  // Attendance mock summary fallback for active child
  const attendanceDays = [
    { date: '2026-11-20', day: 'Friday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-19', day: 'Thursday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-18', day: 'Wednesday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-17', day: 'Tuesday', status: 'late', remarks: 'Arrived 15 mins late (traffic)' },
    { date: '2026-11-16', day: 'Monday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-13', day: 'Friday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-12', day: 'Thursday', status: 'leave', remarks: 'Sick leave application approved' },
    { date: '2026-11-11', day: 'Wednesday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-10', day: 'Tuesday', status: 'present', remarks: 'Present on time' },
    { date: '2026-11-09', day: 'Monday', status: 'present', remarks: 'Present on time' }
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Parent Portal Mode:</strong> Demonstrating Pakistani school parent experience for <em>Mohammad Rizwan</em>.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-amber-100 rounded text-[10px] font-semibold text-amber-900 uppercase">
          Simulated Data
        </span>
      </div>

      {/* Parent Welcome Bar with Multi-Child Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
              Parent Portal • {currentUser.name}
            </span>
            <span className="text-xs text-slate-400">• Session {currentTenant.branding.academicSession}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1">
            Child Academic & Fee Portal
          </h1>
          <p className="text-xs text-slate-500">
            {currentTenant.branding.schoolName} — Real-time academic tracking, fee challans, & diary
          </p>
        </div>

        {/* Multi-Child Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 px-2 hidden sm:inline">Select Child:</span>
          {childrenList.map(child => (
            <button
              key={child.id}
              onClick={() => {
                setActiveChildId(child.id);
                toast(`Viewing portal for ${child.name} (${child.className})`, 'info');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeChild.id === child.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{child.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Child Profile Quick Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-400 text-slate-950 font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
            {activeChild.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">{activeChild.name}</h2>
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                {activeChild.className} (Sec {activeChild.sectionName})
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Roll No: <span className="font-mono text-teal-300 font-bold">{activeChild.rollNo}</span> • Admission No: <span className="font-mono">{activeChild.admissionNo}</span>
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
          <span className="text-slate-400 block text-[11px]">Father / Guardian</span>
          <span className="font-semibold text-slate-200">{activeChild.fatherName}</span>
          <span className="block text-[11px] text-teal-300 font-mono mt-0.5">{activeChild.parentContact}</span>
        </div>
      </div>

      {/* In-Page Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs no-scrollbar">
        {[
          { id: 'dashboard', label: 'Overview', icon: Layers },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'fees', label: 'Fee Dues & Challans', icon: CreditCard },
          { id: 'results', label: 'Exam Results', icon: FileSpreadsheet },
          { id: 'homework', label: 'Homework Diary', icon: BookOpen },
          { id: 'timetable', label: 'Timetable & Notices', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-blue-700 text-blue-800 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: OVERVIEW DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Enrolled Class</span>
              <p className="text-base font-bold text-slate-900 mt-1 truncate">{activeChild.className}</p>
              <span className="text-[10px] text-slate-500 font-mono">Sec {activeChild.sectionName} • Roll {activeChild.rollNo}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Monthly Attendance</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">92%</p>
              <span className="text-[10px] text-emerald-800 font-semibold">18/20 Days Present</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Fee Balance</span>
              <p className="text-xl font-bold text-rose-700 mt-1">
                PKR {pendingDues.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">
                {pendingDues === 0 ? 'All Clear' : 'Challan Due'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Latest Term Grade</span>
              <p className="text-xl font-bold text-blue-900 mt-1">
                {currentResult?.grade || 'A+'}
              </p>
              <span className="text-[10px] text-slate-500">
                {currentResult?.positionInClass ? `${currentResult.positionInClass}nd in Class` : 'Good Standing'}
              </span>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Homework Snippet */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>Pending Homework Diary</span>
                </h3>
                <button
                  onClick={() => handleTabChange('homework')}
                  className="text-xs text-blue-700 font-bold hover:underline"
                >
                  View All ({childHomework.length}) →
                </button>
              </div>

              {childHomework.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {childHomework.slice(0, 3).map(h => (
                    <div key={h.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{h.subjectName}:</span>
                          <span className="text-slate-800">{h.title}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{h.description}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-800 rounded shrink-0">
                        Due: {h.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">No homework tasks assigned today.</p>
              )}
            </div>

            {/* School Circulars / Announcements */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>School Notices & Alerts</span>
                </h3>
                <span className="text-[11px] text-slate-400">{announcements.length} Active</span>
              </div>

              <div className="space-y-2 text-xs">
                {announcements.slice(0, 3).map(a => (
                  <div key={a.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{a.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{a.createdAt}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: ATTENDANCE HISTORY ==================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Working Days</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {d1Attendance ? d1Attendance.totalDays : 20}
              </p>
              <span className="text-[10px] text-slate-500">Academic Session</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Days Present</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {d1Attendance ? d1Attendance.presentCount : 18}
              </p>
              <span className="text-[10px] text-emerald-800 font-semibold">Punctual</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-rose-700">Days Absent</span>
              <p className="text-xl font-bold text-rose-700 mt-1">
                {d1Attendance ? d1Attendance.absentCount : 1}
              </p>
              <span className="text-[10px] text-slate-500">Unexcused</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-amber-700">Late Arrivals</span>
              <p className="text-xl font-bold text-amber-700 mt-1">
                {d1Attendance ? d1Attendance.lateCount : 1}
              </p>
              <span className="text-[10px] text-slate-500">Morning Gate</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-blue-700">Approved Leaves</span>
              <p className="text-xl font-bold text-blue-700 mt-1">
                {d1Attendance ? d1Attendance.leaveCount : 1}
              </p>
              <span className="text-[10px] text-slate-500">Sanctioned</span>
            </div>
          </div>

          {/* Attendance Progress Ring & Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Monthly Attendance Rate ({activeChild.name})</span>
              <span className="font-bold text-emerald-700 font-mono">
                {d1Attendance ? `${d1Attendance.attendanceRate}% Attendance` : '92.5% Attendance'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
              <div 
                className="bg-emerald-600 h-full" 
                style={{ width: `${d1Attendance ? d1Attendance.attendanceRate : 90}%` }} 
                title="Present" 
              />
              <div className="bg-amber-500 h-full" style={{ width: '5%' }} title="Late" />
              <div className="bg-blue-500 h-full" style={{ width: '5%' }} title="Leave" />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Present ({d1Attendance ? d1Attendance.attendanceRate : 90}%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Late</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Approved Leave</span>
            </div>
          </div>

          {/* Daily Attendance History Log */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-teal-700" />
                <span>Daily Roll Call History ({activeChild.className})</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Child: {activeChild.name}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Time / Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(d1Attendance && d1Attendance.records.length > 0 ? d1Attendance.records : attendanceDays).map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{rec.date}</td>
                      <td className="py-2.5 px-3 text-slate-600">{'day' in rec ? (rec as any).day : new Date(rec.date).toLocaleDateString('en-PK', { weekday: 'long' })}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          rec.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'absent'
                            ? 'bg-rose-100 text-rose-800'
                            : rec.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{rec.remarks || 'Standard roll call'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: FEES & CHALLANS ==================== */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Fee Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Billed (Session)</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                PKR {totalBilled.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">{childInvoices.length} Challan Vouchers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Paid</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                PKR {totalPaid.toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-800 font-semibold">Verified by Accounts</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Outstanding Due</span>
              <p className="text-xl font-bold font-mono text-rose-700 mt-1">
                PKR {pendingDues.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">
                {pendingDues === 0 ? 'No Dues Pending' : 'Due by 10th of Month'}
              </span>
            </div>
          </div>

          {/* Fee Invoices List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-700" />
                  <span>Fee Challan Invoices ({activeChild.name})</span>
                </h3>
                <p className="text-xs text-slate-500">Download or print 3-copy deposit slip for bank branch payment</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {childInvoices.map(inv => (
                <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{inv.feeMonth}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                      Challan #{inv.invoiceNo} • Issued: {inv.issueDate} • Due Date: {inv.dueDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900 block text-sm">
                        PKR {inv.totalAmount.toLocaleString()}
                      </span>
                      {inv.balance > 0 ? (
                        <span className="text-[11px] text-rose-600 font-semibold font-mono">
                          Balance: PKR {inv.balance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-semibold">Fully Paid</span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition border border-blue-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print 3-Part Challan</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pakistani Bank Deposit Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>How to Pay School Fees</span>
            </h4>
            <p className="leading-relaxed">
              1. <strong>Bank Branches:</strong> Print the 3-part Challan slip and deposit cash at any <em>Habib Bank Limited (HBL)</em> or <em>Meezan Bank</em> branch nationwide before the due date.
            </p>
            <p className="leading-relaxed">
              2. <strong>JazzCash / EasyPaisa / 1Link:</strong> Use your 6-digit Challan Number to pay instantly via Mobile App → Education Fees → Select <em>{currentTenant.branding.schoolName}</em>.
            </p>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: EXAM RESULTS & REPORT CARDS ==================== */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Exam Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                <span>Academic Examination Results</span>
              </h3>
              <p className="text-xs text-slate-500">Official BISE Board affiliated assessment card</p>
            </div>

            {childResults.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {childResults.map(r => (
                    <option key={r.examId} value={r.examId}>
                      {r.examTitle}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setSelectedResult(currentResult)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Full Report Card</span>
                </button>
              </div>
            )}
          </div>

          {currentResult ? (
            <div className="space-y-6">
              {/* Score Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Obtained</span>
                  <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {currentResult.totalObtained} / {currentResult.totalMarks}
                  </p>
                  <span className="text-[10px] text-slate-500">Aggregate Score</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Overall Percentage</span>
                  <p className="text-xl font-bold font-mono text-blue-900 mt-1">
                    {currentResult.percentage}%
                  </p>
                  <span className="text-[10px] text-emerald-700 font-semibold">Distinction</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Board Grade</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {currentResult.grade}
                  </p>
                  <span className="text-[10px] text-slate-500">A+ Grade Standard</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Class Position</span>
                  <p className="text-xl font-bold text-amber-700 mt-1">
                    {currentResult.positionInClass ? `${currentResult.positionInClass}nd Position` : 'Passed'}
                  </p>
                  <span className="text-[10px] text-slate-500">In Section {activeChild.sectionName}</span>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Subject-Wise Marks Breakdown
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3 text-center">Max Marks</th>
                        <th className="py-2.5 px-3 text-center">Passing</th>
                        <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3">Subject Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(currentResult.subjectsMarks || []).map((sm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{sm.subjectName}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{sm.totalMarks}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{sm.passingMarks}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{sm.obtainedMarks}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black text-xs">
                              {sm.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{sm.remarks || 'Very good understanding'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 block mb-1">Principal / Class Teacher Remarks:</span>
                  <p className="text-slate-600 italic">"{currentResult.teacherRemarks}"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No examination records found for this term yet.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 5: HOMEWORK DIARY ==================== */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Daily Homework & Assignment Diary</span>
              </h3>
              <p className="text-xs text-slate-500">Assigned by subject teachers for {activeChild.className}</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {childHomework.length} Active Assignments
            </span>
          </div>

          <div className="space-y-3">
            {childHomework.map(h => {
              const isAck = !!acknowledgedHw[h.id];
              return (
                <div
                  key={h.id}
                  className={`p-4 rounded-xl border transition ${
                    isAck ? 'bg-white border-slate-200' : 'bg-amber-50/40 border-amber-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-xs">
                        {h.subjectName}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{h.title}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-500">
                        Due Date: <strong className="text-slate-800">{h.dueDate}</strong>
                      </span>

                      <button
                        onClick={() => {
                          setAcknowledgedHw(prev => ({ ...prev, [h.id]: !prev[h.id] }));
                          toast(isAck ? 'Marked pending' : 'Acknowledged by parent!', 'success');
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          isAck
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAck ? 'Parent Signed' : 'Sign / Acknowledge'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed mt-2.5">
                    {h.description}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    Assigned on: {h.assignedDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 6: TIMETABLE & NOTICES ==================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {/* Class Timetable */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <span>Class Timetable & Periods ({activeChild.className})</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Mon — Sat</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {timetable.map(t => (
                <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{t.subjectName}</span>
                    <span className="font-mono text-blue-800 font-semibold text-[11px]">{t.startTime} - {t.endTime}</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">Teacher: {t.teacherName}</p>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                    Room: {t.roomNo}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* School Announcements */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Official School Notices & Circulars</span>
            </h3>

            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{a.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{a.createdAt}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Printable Modals */}
      {selectedInvoice && (
        <FeeReceiptModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          tenant={currentTenant}
        />
      )}

      {selectedResult && (
        <ReportCardModal
          isOpen={true}
          onClose={() => setSelectedResult(null)}
          result={selectedResult}
          tenant={currentTenant}
        />
      )}

      {selectedInvoice && (
        <FeeReceiptModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          tenant={currentTenant}
        />
      )}
    </div>
  );
};

/* =========================================================================
   STUDENT PORTAL COMPONENT
   ========================================================================= */

export const StudentPortal: React.FC = () => {
  const { currentTenant, currentUser, storageMode, toast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current URL path
  const getTabFromPath = (): 'dashboard' | 'timetable' | 'attendance' | 'fees' | 'homework' | 'results' => {
    if (location.pathname.includes('/timetable')) return 'timetable';
    if (location.pathname.includes('/attendance')) return 'attendance';
    if (location.pathname.includes('/fees')) return 'fees';
    if (location.pathname.includes('/homework')) return 'homework';
    if (location.pathname.includes('/results')) return 'results';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'timetable' | 'attendance' | 'fees' | 'homework' | 'results'>(getTabFromPath);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'dashboard' | 'timetable' | 'attendance' | 'fees' | 'homework' | 'results') => {
    setActiveTab(tab);
    const pathMap = {
      dashboard: '/student/dashboard',
      timetable: '/student/timetable',
      attendance: '/student/attendance',
      fees: '/student/fees',
      homework: '/student/homework',
      results: '/student/results'
    };
    navigate(pathMap[tab]);
  };

  // Find logged in student (Hamza Rizwan)
  const allStudents = studentService.getAll(currentTenant.id);
  const student = studentService.getById('student-1') || allStudents[0];

  const [results, setResults] = useState<StudentResult[]>(() =>
    examService.getResults(currentTenant.id, undefined, student.id)
  );
  const homeworkList = homeworkService.getAll(currentTenant.id, student.classId);
  const timetable = timetableService.getAll(currentTenant.id, student.classId);
  const [studentInvoices, setStudentInvoices] = useState<FeeInvoice[]>(() =>
    feeService.getInvoices(currentTenant.id).filter(i => i.studentId === student.id)
  );
  const announcements = announcementService.getAll(currentTenant.id).filter(
    a => a.targetAudience === 'everyone' || a.targetAudience === 'students'
  );

  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);

  // Student homework completed toggle
  const [completedHw, setCompletedHw] = useState<Record<string, boolean>>({
    'hw-1': true
  });

  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const pendingDues = studentInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
  const totalBilled = studentInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalPaid = studentInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);

  // Dynamic D1 Attendance & Invoices state for student
  const [d1Attendance, setD1Attendance] = useState<StudentAttendanceHistoryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadStudentResults() {
      if (!student?.id) return;
      try {
        const exams = await examApiAdapter.getExams(currentTenant.id, undefined, storageMode);
        const activeExamId = exams[0]?.id || 'exam-mid-2026';
        const res = await examApiAdapter.getResults(activeExamId, { tenantId: currentTenant.id, studentId: student.id }, storageMode);
        if (isMounted && res && res.length > 0) {
          setResults(res);
        }
      } catch (err) {
        console.warn('Failed to load student exam results from API:', err);
      }
    }
    loadStudentResults();
    return () => { isMounted = false; };
  }, [student?.id, currentTenant.id, storageMode]);

  useEffect(() => {
    let isMounted = true;
    async function loadInvoices() {
      if (!student?.id) return;
      try {
        const invs = await feeApiAdapter.getInvoices(currentTenant.id, { studentId: student.id }, storageMode);
        if (isMounted) setStudentInvoices(invs);
      } catch (err) {
        console.warn('Failed to load student invoices from API:', err);
      }
    }
    loadInvoices();
    return () => { isMounted = false; };
  }, [student?.id, currentTenant.id, storageMode]);

  useEffect(() => {
    let isMounted = true;
    async function loadAttendance() {
      if (!student?.id) return;
      try {
        const res = await attendanceApiAdapter.getStudentAttendance(student.id, currentTenant.id, undefined, storageMode);
        if (isMounted) setD1Attendance(res);
      } catch (err) {
        console.warn('Failed to load student attendance:', err);
      }
    }
    loadAttendance();
    return () => { isMounted = false; };
  }, [student?.id, currentTenant.id, storageMode]);

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-teal-50 border border-teal-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-teal-800">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Student Portal:</strong> Personalized student desk for <em>{student.name}</em> (Roll #{student.rollNo}).
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-teal-100 rounded text-[10px] font-semibold text-teal-900 uppercase">
          Student Session 2026-27
        </span>
      </div>

      {/* Student Profile Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{student.name}</h1>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase text-[10px]">
                Active Enrolled
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Class: <span className="font-bold text-white">{student.className}</span> • Section: <span className="font-bold text-white">{student.sectionName}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Roll No: <span className="text-teal-300 font-bold">{student.rollNo}</span> • Admission: {student.admissionNo} • Father: {student.fatherName}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs">
          <span className="text-slate-400 block text-[11px]">{currentTenant.branding.schoolName}</span>
          <span className="text-teal-300 font-semibold">Affiliated: {currentTenant.branding.affiliationBoard}</span>
        </div>
      </div>

      {/* In-Page Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs no-scrollbar">
        {[
          { id: 'dashboard', label: 'My Desk', icon: Layers },
          { id: 'timetable', label: 'Timetable', icon: Clock },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'fees', label: 'Fee Challans', icon: CreditCard },
          { id: 'homework', label: 'Homework Diary', icon: BookOpen },
          { id: 'results', label: 'My Grades', icon: FileSpreadsheet }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-800 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: STUDENT DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Attendance Rate</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">94%</p>
              <span className="text-[10px] text-slate-500">Regular Punctuality</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Current Term Grade</span>
              <p className="text-2xl font-black text-blue-900 mt-1">
                {results[0]?.grade || 'A+'}
              </p>
              <span className="text-[10px] text-slate-500">{results[0]?.percentage || '89'}% Marks</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Class Rank</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {results[0]?.positionInClass ? `${results[0].positionInClass}nd` : 'Top 5'}
              </p>
              <span className="text-[10px] text-slate-500">In Class 9</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Pending Homework</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">
                {homeworkList.filter(h => !completedHw[h.id]).length}
              </p>
              <span className="text-[10px] text-slate-500">Due this week</span>
            </div>
          </div>

          {/* Today's Timetable and Due Homework */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Classes */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span>Today's Class Schedule</span>
                </h3>
                <button
                  onClick={() => handleTabChange('timetable')}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Full Week →
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {timetable.slice(0, 4).map(t => (
                  <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{t.subjectName}</span>
                      <span className="text-slate-500 text-[11px]">{t.teacherName} • Room {t.roomNo}</span>
                    </div>
                    <span className="font-mono font-medium text-blue-900 text-xs px-2 py-0.5 bg-blue-50 rounded">
                      {t.startTime} - {t.endTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments Due */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-teal-700" />
                  <span>My Homework Tasks</span>
                </h3>
                <button
                  onClick={() => handleTabChange('homework')}
                  className="text-xs font-bold text-teal-700 hover:underline"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {homeworkList.slice(0, 3).map(h => {
                  const done = !!completedHw[h.id];
                  return (
                    <div key={h.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{h.subjectName}</span>
                          <span className="text-slate-700">• {h.title}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{h.description}</p>
                      </div>

                      <button
                        onClick={() => {
                          setCompletedHw(prev => ({ ...prev, [h.id]: !prev[h.id] }));
                          toast(done ? 'Marked pending' : 'Good job! Assignment finished!', 'success');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                          done ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        {done ? '✓ Completed' : 'Pending'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* School Announcements */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>School Assembly & Student Notices</span>
            </h3>
            <div className="space-y-2 text-xs">
              {announcements.map(a => (
                <div key={a.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{a.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{a.createdAt}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: TIMETABLE ==================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700" />
                <span>Weekly Lecture Timetable ({student.className})</span>
              </h3>
              <p className="text-xs text-slate-500">Period schedule for Room 14</p>
            </div>

            {/* Day Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedDay === day ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timetable.map((t, idx) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 font-bold text-sm flex items-center justify-center font-mono">
                    P{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{t.subjectName}</h4>
                    <p className="text-xs text-slate-500">Teacher: {t.teacherName}</p>
                    <span className="text-[11px] text-slate-400 font-mono">Room: {t.roomNo}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-blue-900 text-xs px-2.5 py-1 bg-blue-50 rounded-lg block">
                    {t.startTime} - {t.endTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ATTENDANCE HISTORY ==================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Attendance</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {d1Attendance ? `${d1Attendance.attendanceRate}%` : '94%'}
              </p>
              <span className="text-[10px] text-slate-500">Term Average</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Classes Attended</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {d1Attendance ? `${d1Attendance.presentCount + d1Attendance.lateCount} / ${d1Attendance.totalDays || 1}` : '112 / 120'}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold">Eligible for Board Exams</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Absences Recorded</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">
                {d1Attendance ? `${d1Attendance.absentCount} Days` : '4 Days'}
              </p>
              <span className="text-[10px] text-slate-500">
                {d1Attendance ? `${d1Attendance.leaveCount} Medical Leaves` : '4 Medical Leaves'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <CalendarCheck className="w-4 h-4 text-emerald-700" />
              <span>Recent Attendance Logs</span>
            </h3>

            <div className="space-y-2 text-xs">
              {(d1Attendance && d1Attendance.records.length > 0 ? d1Attendance.records : [
                { date: '2026-11-20', status: 'present', remarks: 'Morning roll call recorded' },
                { date: '2026-11-19', status: 'present', remarks: 'Morning roll call recorded' },
                { date: '2026-11-18', status: 'present', remarks: 'Morning roll call recorded' },
                { date: '2026-11-17', status: 'late', remarks: 'Arrived 15 mins late' },
                { date: '2026-11-16', status: 'present', remarks: 'Morning roll call recorded' },
                { date: '2026-11-13', status: 'present', remarks: 'Morning roll call recorded' },
                { date: '2026-11-12', status: 'leave', remarks: 'Approved sick leave' }
              ]).map((log, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-slate-900">{log.date}</span>
                    <span className="text-slate-500">{(log as any).remarks || (log as any).note || 'Morning roll call recorded'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    log.status === 'present' ? 'bg-emerald-100 text-emerald-800' : log.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: FEES & CHALLANS ==================== */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Fee Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Billed</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                PKR {totalBilled.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">{studentInvoices.length} Challan Vouchers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Paid</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                PKR {totalPaid.toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-800 font-semibold">Account Verified</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Outstanding Due</span>
              <p className="text-xl font-bold font-mono text-rose-700 mt-1">
                PKR {pendingDues.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">
                {pendingDues === 0 ? 'All Clear' : 'Payable at Bank Branch'}
              </span>
            </div>
          </div>

          {/* Student Invoices List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-teal-700" />
                  <span>My Fee Challans & Deposit Slips</span>
                </h3>
                <p className="text-xs text-slate-500">Download or print your 3-copy bank deposit voucher</p>
              </div>
            </div>

            {studentInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No fee vouchers issued for your account yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {studentInvoices.map(inv => (
                  <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{inv.feeMonth}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                        Challan #{inv.invoiceNo} • Due Date: {inv.dueDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold font-mono text-slate-900 block text-sm">
                          PKR {inv.totalAmount.toLocaleString()}
                        </span>
                        {inv.balance > 0 ? (
                          <span className="text-[11px] text-rose-600 font-semibold font-mono">
                            Balance: PKR {inv.balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold">Fully Paid</span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition border border-teal-200"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Slip</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: HOMEWORK ==================== */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-teal-700" />
                <span>My Homework Diary & Assignments</span>
              </h3>
              <p className="text-xs text-slate-500">Track and check off your completed homework tasks</p>
            </div>
          </div>

          <div className="space-y-3">
            {homeworkList.map(h => {
              const done = !!completedHw[h.id];
              return (
                <div
                  key={h.id}
                  className={`p-4 rounded-xl border transition ${
                    done ? 'bg-white border-slate-200' : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-xs">
                        {h.subjectName}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{h.title}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-500">
                        Due: <strong className="text-slate-800">{h.dueDate}</strong>
                      </span>

                      <button
                        onClick={() => {
                          setCompletedHw(prev => ({ ...prev, [h.id]: !prev[h.id] }));
                          toast(done ? 'Marked incomplete' : 'Marked completed! Great work!', 'success');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                          done
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{done ? 'Completed' : 'Mark as Done'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed mt-2.5">{h.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: RESULTS & GRADES ==================== */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                <span>My Exam Results & Academic Transcript</span>
              </h3>
              <p className="text-xs text-slate-500">Board standard term evaluation</p>
            </div>

            {results[0] && (
              <button
                onClick={() => setSelectedResult(results[0])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Card</span>
              </button>
            )}
          </div>

          {results[0] ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Marks</span>
                  <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {results[0].totalObtained} / {results[0].totalMarks}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Percentage</span>
                  <p className="text-2xl font-bold font-mono text-blue-900 mt-1">{results[0].percentage}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Grade</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{results[0].grade}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Position</span>
                  <p className="text-2xl font-bold text-amber-700 mt-1">
                    {results[0].positionInClass ? `${results[0].positionInClass}nd` : 'Pass'}
                  </p>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Subject Marks
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3 text-center">Max</th>
                        <th className="py-2.5 px-3 text-center">Passing</th>
                        <th className="py-2.5 px-3 text-center">Obtained</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(results[0].subjectsMarks || []).map((sm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{sm.subjectName}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{sm.totalMarks}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{sm.passingMarks}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{sm.obtainedMarks}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black text-xs">
                              {sm.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{sm.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 block mb-1">Teacher Remarks:</span>
                  <p className="text-slate-600 italic">"{results[0].teacherRemarks}"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No examination records found yet.
            </div>
          )}
        </div>
      )}

      {selectedResult && (
        <ReportCardModal
          isOpen={true}
          onClose={() => setSelectedResult(null)}
          result={selectedResult}
          tenant={currentTenant}
        />
      )}
    </div>
  );
};
