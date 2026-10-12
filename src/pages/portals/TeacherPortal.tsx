import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { attendanceService, homeworkService, studentService, classService, timetableService } from '../../services';
import { Homework, Student, AttendanceStatus } from '../../types';
import {
  CalendarCheck,
  BookOpen,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Sparkles,
  Save,
  Plus
} from 'lucide-react';

export const TeacherPortal: React.FC = () => {
  const { currentTenant, currentUser, toast } = useApp();
  const students = studentService.getAll(currentTenant.id).filter(s => s.classId === 'class-9');
  const myTimetable = timetableService.getAll(currentTenant.id).filter(t => t.teacherName.includes('Zeeshan') || t.classId === 'class-9');
  const homeworkList = homeworkService.getAll(currentTenant.id).filter(h => h.classId === 'class-9');

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({
    'student-1': 'present',
    'student-4': 'present',
    'student-5': 'late'
  });

  const handleMark = (id: string, st: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [id]: st }));
  };

  const handleSaveMorningRollCall = () => {
    toast(`Morning attendance for Class 9 Science saved by ${currentUser.name}!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Teacher Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-bold text-xl flex items-center justify-center shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{currentUser.name}</h1>
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold">
                Senior Faculty
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Subjects: Mathematics & Physics • Assigned: Class 9 & Class 10 (Science)
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-500">
          <span className="font-semibold block text-slate-800">{currentTenant.branding.schoolName}</span>
          <span className="text-[11px] font-mono">Today: {new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* Quick Attendance Marking Card (Mobile-First Teacher Workflow) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-teal-600" />
              <span>Quick Roll Call: Class 9 (Science)</span>
            </h2>
            <p className="text-xs text-slate-500">Tap status to mark attendance before 9:00 AM</p>
          </div>
          <button
            onClick={handleSaveMorningRollCall}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Submit Roll Call</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {students.map(s => {
            const current = statusMap[s.id] || 'present';

            return (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{s.name}</span>
                  <span className="text-slate-500 text-[11px]">Roll: {s.rollNo} • Father: {s.fatherName}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMark(s.id, 'present')}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      current === 'present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => handleMark(s.id, 'absent')}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      current === 'absent' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Absent
                  </button>
                  <button
                    onClick={() => handleMark(s.id, 'late')}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      current === 'late' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Late
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2 Cols: My Timetable Periods & Assigned Homework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timetable */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Today's Teaching Schedule</span>
          </h2>

          <div className="space-y-2 text-xs">
            {myTimetable.slice(0, 4).map(t => (
              <div key={t.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{t.subjectName}</span>
                  <span className="text-slate-500 text-[11px]">{t.className} • {t.roomNo}</span>
                </div>
                <div className="text-right font-mono font-medium text-blue-900 text-xs">
                  {t.startTime} - {t.endTime}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Homework */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Assigned Homework</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">{homeworkList.length} Tasks</span>
          </div>

          <div className="space-y-2 text-xs">
            {homeworkList.map(h => (
              <div key={h.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900 text-xs truncate">{h.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">Due: {h.dueDate}</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
