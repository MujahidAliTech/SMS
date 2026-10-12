import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { studentService, feeService, examService, homeworkService, announcementService, timetableService } from '../../services';
import { Student, FeeInvoice, StudentResult, Homework, Announcement, TimetableEntry } from '../../types';
import { FeeReceiptModal } from '../../components/print/FeeReceiptModal';
import { ReportCardModal } from '../../components/print/ReportCardModal';
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
  AlertCircle
} from 'lucide-react';

export const ParentPortal: React.FC = () => {
  const { currentTenant, currentUser, toast } = useApp();

  // Find children for current parent (Mohammad Rizwan has Hamza Rizwan & Fatima Rizwan)
  const allStudents = studentService.getAll(currentTenant.id);
  const myChildren = allStudents.filter(s => s.parentId === 'parent-1' || s.fatherName.includes('Rizwan'));

  const [activeChildId, setActiveChildId] = useState<string>(myChildren[0]?.id || 'student-1');
  const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0] || allStudents[0];

  const childInvoices = feeService.getInvoices(currentTenant.id).filter(i => i.studentId === activeChild.id);
  const childResults = examService.getResults(currentTenant.id).filter(r => r.studentId === activeChild.id);
  const childHomework = homeworkService.getAll(currentTenant.id).filter(h => h.classId === activeChild.classId);
  const announcements = announcementService.getAll(currentTenant.id).filter(a => a.targetAudience === 'everyone' || a.targetAudience === 'parents');

  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);

  const pendingDues = childInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div className="space-y-6">
      {/* Parent Welcome Bar with Multi-Child Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
            Parent Portal • Mohammad Rizwan
          </span>
          <h1 className="text-lg font-bold text-slate-900 mt-1">
            Student Academic & Fee Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            {currentTenant.branding.schoolName} (Session {currentTenant.branding.academicSession})
          </p>
        </div>

        {/* Child Switcher Pills (Essential Multi-Child Feature) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 px-2 hidden sm:inline">Active Child:</span>
          {myChildren.map(child => (
            <button
              key={child.id}
              onClick={() => {
                setActiveChildId(child.id);
                toast(`Switched child dashboard to ${child.name}`, 'info');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeChild.id === child.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{child.name} ({child.className.split(' ')[0]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Child Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Enrolled Class</span>
          <p className="text-base font-bold text-slate-900 mt-1 truncate">{activeChild.className}</p>
          <span className="text-[10px] text-slate-500 font-mono">Roll: {activeChild.rollNo}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Monthly Attendance</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">94%</p>
          <span className="text-[10px] text-slate-500">Regular & Punctual</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Fee Balance</span>
          <p className="text-xl font-bold text-rose-700 mt-1">PKR {pendingDues.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">{pendingDues === 0 ? 'All Clear' : 'Challan Due'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Latest Term Grade</span>
          <p className="text-xl font-bold text-blue-900 mt-1">
            {childResults[0]?.grade || 'A+'}
          </p>
          <span className="text-[10px] text-slate-500">{childResults[0]?.positionInClass ? `${childResults[0].positionInClass}nd in Class` : 'Good Standing'}</span>
        </div>
      </div>

      {/* Fee Invoices & Receipts for This Child */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-700" />
              <span>School Fee Challans & Receipts ({activeChild.name})</span>
            </h2>
            <p className="text-xs text-slate-500">View payment history or download 3-copy deposit slip</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {childInvoices.map(inv => (
            <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{inv.feeMonth}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Challan #{inv.invoiceNo} • Due: {inv.dueDate}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-bold font-mono text-slate-900 block">
                    PKR {inv.totalAmount.toLocaleString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.status}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedInvoice(inv)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Challan</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Results Card for This Child */}
      {childResults.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                <span>Academic Progress Card ({childResults[0].examTitle})</span>
              </h2>
              <p className="text-xs text-slate-500">Official Board assessment grade statement</p>
            </div>
            <button
              onClick={() => setSelectedResult(childResults[0])}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Full Report Card</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Marks Obtained:</span>
              <span className="font-bold font-mono text-slate-900 text-sm">
                {childResults[0].totalObtained} / {childResults[0].totalMarks} ({childResults[0].percentage}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Board Grade:</span>
              <span className="font-black text-emerald-700 text-lg">
                {childResults[0].grade}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Class Rank:</span>
              <span className="font-bold text-amber-700 text-sm">
                {childResults[0].positionInClass ? `${childResults[0].positionInClass}nd Position` : 'Pass'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Homework Tasks Diary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-emerald-700" />
          <span>Daily Homework Diary ({activeChild.className})</span>
        </h2>
        <div className="space-y-2 text-xs">
          {childHomework.map(h => (
            <div key={h.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-900">{h.subjectName}: {h.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">Due: {h.dueDate}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">{h.description}</p>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
};

export const StudentPortal: React.FC = () => {
  const { currentTenant, currentUser } = useApp();
  const student = studentService.getById('student-1') || studentService.getAll(currentTenant.id)[0];
  const results = examService.getResults(currentTenant.id, undefined, student.id);
  const homework = homeworkService.getAll(currentTenant.id, student.classId);
  const timetable = timetableService.getAll(currentTenant.id, student.classId);

  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);

  return (
    <div className="space-y-6">
      {/* Student Profile Header */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-400 text-slate-950 font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{student.name}</h1>
            <p className="text-xs text-slate-300">
              {student.className} • Roll Number: <span className="font-mono font-bold text-teal-300">{student.rollNo}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Admission: {student.admissionNo} • {currentTenant.branding.schoolName}
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase text-[10px]">
            Status: Active Student
          </span>
        </div>
      </div>

      {/* Grid: Results & Timetable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Results Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-purple-700" />
              <span>My Academic Performance</span>
            </h2>
            {results[0] && (
              <button
                onClick={() => setSelectedResult(results[0])}
                className="text-xs font-bold text-blue-700 hover:text-blue-900"
              >
                Print Card →
              </button>
            )}
          </div>

          {results[0] ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Percentage</span>
                  <span className="font-bold text-base text-blue-900">{results[0].percentage}%</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Grade</span>
                  <span className="font-black text-lg text-emerald-700">{results[0].grade}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Position</span>
                  <span className="font-bold text-base text-amber-700">
                    {results[0].positionInClass ? `${results[0].positionInClass}nd` : 'Pass'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 italic">"{results[0].teacherRemarks}"</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No exams announced yet.</p>
          )}
        </div>

        {/* Timetable */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-700" />
            <span>My Class Timetable (Today)</span>
          </h2>
          <div className="space-y-2 text-xs">
            {timetable.slice(0, 3).map((t: TimetableEntry) => (
              <div key={t.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">{t.subjectName}</span>
                  <span className="text-slate-500 text-[10px]">{t.teacherName} • {t.roomNo}</span>
                </div>
                <span className="font-mono font-medium text-blue-900 text-xs">{t.startTime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Homework Tasks */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-teal-700" />
          <span>My Homework Assignments</span>
        </h2>
        <div className="space-y-2.5 text-xs">
          {homework.map(h => (
            <div key={h.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-900">{h.subjectName}: {h.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">Due: {h.dueDate}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">{h.description}</p>
            </div>
          ))}
        </div>
      </div>

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
