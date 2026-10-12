import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  attendanceService, 
  homeworkService, 
  studentService, 
  classService, 
  timetableService, 
  examService,
  announcementService,
  subjectService
} from '../../services';
import { 
  Homework, 
  Student, 
  AttendanceStatus, 
  AttendanceRecord,
  SchoolClass, 
  TimetableEntry,
  StudentResult,
  Exam
} from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ReportCardModal } from '../../components/print/ReportCardModal';
import {
  CalendarCheck,
  BookOpen,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Sparkles,
  Save,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Search,
  Award,
  Printer,
  Bell,
  Layers,
  Info,
  Check,
  AlertCircle,
  Calendar,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export const TeacherPortal: React.FC = () => {
  const { currentTenant, currentUser, toast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Tab mapping with route support
  const getTabFromPath = (): 'overview' | 'students' | 'attendance' | 'homework' | 'marks' | 'timetable' => {
    if (location.pathname.includes('/attendance')) return 'attendance';
    if (location.pathname.includes('/homework')) return 'homework';
    if (location.pathname.includes('/marks')) return 'marks';
    if (location.pathname.includes('/timetable')) return 'timetable';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'homework' | 'marks' | 'timetable'>(getTabFromPath);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'overview' | 'students' | 'attendance' | 'homework' | 'marks' | 'timetable') => {
    setActiveTab(tab);
    const pathMap = {
      overview: '/teacher/dashboard',
      students: '/teacher/dashboard',
      attendance: '/teacher/attendance',
      homework: '/teacher/homework',
      marks: '/teacher/marks',
      timetable: '/teacher/timetable'
    };
    navigate(pathMap[tab]);
  };

  // Classes & Students data
  const classes = classService.getAll(currentTenant.id);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'class-9');
  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];

  const allStudents = studentService.getAll(currentTenant.id);
  const classStudents = allStudents.filter(s => s.classId === selectedClassId);

  // Homework list
  const [homeworkList, setHomeworkList] = useState<Homework[]>(() => homeworkService.getAll(currentTenant.id));
  const myTimetable = timetableService.getAll(currentTenant.id).filter(
    t => t.teacherName.toLowerCase().includes('zeeshan') || t.classId === selectedClassId
  );
  const announcements = announcementService.getAll(currentTenant.id).filter(
    a => a.targetAudience === 'everyone' || a.targetAudience === 'teachers'
  );

  // ==================== ATTENDANCE STATE ====================
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSection, setAttendanceSection] = useState<string>('All');
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({
    'student-1': 'present',
    'student-4': 'present',
    'student-5': 'late'
  });
  const [attendanceHistoryLogs, setAttendanceHistoryLogs] = useState<Array<{
    date: string;
    className: string;
    total: number;
    present: number;
    absent: number;
    savedAt: string;
  }>>([
    {
      date: '2026-11-20',
      className: 'Class 9 (Science)',
      total: 36,
      present: 34,
      absent: 2,
      savedAt: '08:45 AM'
    },
    {
      date: '2026-11-19',
      className: 'Class 9 (Science)',
      total: 36,
      present: 35,
      absent: 1,
      savedAt: '08:42 AM'
    },
    {
      date: '2026-11-18',
      className: 'Class 10 (Science)',
      total: 32,
      present: 30,
      absent: 2,
      savedAt: '08:50 AM'
    }
  ]);

  const handleMark = (id: string, st: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [id]: st }));
  };

  const handleMarkAll = (st: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach(s => {
      updated[s.id] = st;
    });
    setStatusMap(updated);
    toast(`All ${classStudents.length} students marked as ${st.toUpperCase()}`, 'info');
  };

  const handleSaveAttendance = () => {
    const records: AttendanceRecord[] = classStudents.map(s => ({
      id: `att-${selectedClassId}-${s.id}-${attendanceDate}`,
      tenantId: currentTenant.id,
      studentId: s.id,
      studentName: s.name,
      classId: selectedClassId,
      sectionId: s.sectionId,
      date: attendanceDate,
      status: statusMap[s.id] || 'present',
      markedBy: currentUser.name
    }));

    attendanceService.saveRecords(currentTenant.id, records);

    const presentCount = classStudents.filter(s => (statusMap[s.id] || 'present') === 'present').length;
    const absentCount = classStudents.length - presentCount;

    setAttendanceHistoryLogs(prev => [
      {
        date: attendanceDate,
        className: selectedClass?.name || 'Class 9',
        total: classStudents.length,
        present: presentCount,
        absent: absentCount,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);

    toast(`Attendance for ${selectedClass?.name} saved! (${presentCount} Present, ${absentCount} Absent)`, 'success');
  };

  // ==================== HOMEWORK MODALS & CRUD ====================
  const [isHwModalOpen, setIsHwModalOpen] = useState(false);
  const [editingHw, setEditingHw] = useState<Homework | null>(null);
  const [deletingHwId, setDeletingHwId] = useState<string | null>(null);

  const [hwFormData, setHwFormData] = useState({
    classId: selectedClassId,
    subjectName: 'Physics',
    title: '',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    description: ''
  });

  const handleOpenAddHw = () => {
    setEditingHw(null);
    setHwFormData({
      classId: selectedClassId,
      subjectName: 'Physics',
      title: '',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      description: ''
    });
    setIsHwModalOpen(true);
  };

  const handleOpenEditHw = (hw: Homework) => {
    setEditingHw(hw);
    setHwFormData({
      classId: hw.classId,
      subjectName: hw.subjectName,
      title: hw.title,
      dueDate: hw.dueDate,
      description: hw.description
    });
    setIsHwModalOpen(true);
  };

  const handleSaveHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwFormData.title.trim() || !hwFormData.description.trim()) {
      toast('Please enter title and description', 'error');
      return;
    }

    const cls = classes.find(c => c.id === hwFormData.classId) || classes[0];

    if (editingHw) {
      homeworkService.update(editingHw.id, {
        classId: hwFormData.classId,
        className: cls.name,
        subjectName: hwFormData.subjectName,
        title: hwFormData.title,
        dueDate: hwFormData.dueDate,
        description: hwFormData.description
      });
      toast(`Homework "${hwFormData.title}" updated`, 'success');
    } else {
      homeworkService.create({
        tenantId: currentTenant.id,
        classId: hwFormData.classId,
        className: cls.name,
        section: 'A',
        subjectName: hwFormData.subjectName,
        teacherName: currentUser.name,
        title: hwFormData.title,
        description: hwFormData.description,
        assignedDate: new Date().toISOString().split('T')[0],
        dueDate: hwFormData.dueDate,
        status: 'active'
      });
      toast(`New homework "${hwFormData.title}" assigned to ${cls.name}`, 'success');
    }

    setHomeworkList(homeworkService.getAll(currentTenant.id));
    setIsHwModalOpen(false);
  };

  const handleConfirmDeleteHw = () => {
    if (!deletingHwId) return;
    homeworkService.delete(deletingHwId);
    setHomeworkList(homeworkService.getAll(currentTenant.id));
    setDeletingHwId(null);
    toast('Homework assignment deleted', 'success');
  };

  // ==================== MARKS ENTRY STATE ====================
  const exams = examService.getExams(currentTenant.id);
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || 'exam-mid-26');
  const [selectedMarksSubject, setSelectedMarksSubject] = useState<string>('Physics');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [passMarks, setPassMarks] = useState<number>(33);

  // Student marks map { studentId: obtainedMarks }
  const [marksMap, setMarksMap] = useState<Record<string, number>>({
    'student-1': 92,
    'student-4': 86,
    'student-5': 74
  });

  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({
    'student-1': 'Outstanding grasp of Newton laws',
    'student-4': 'Solid performance in practicals',
    'student-5': 'Needs to review numerical problems'
  });

  const [selectedReportResult, setSelectedReportResult] = useState<StudentResult | null>(null);

  const calculateGrade = (pct: number) => {
    if (pct >= 80) return 'A+';
    if (pct >= 70) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  };

  const handleSaveMarks = () => {
    const exam = exams.find(e => e.id === selectedExamId);
    classStudents.forEach(s => {
      const marks = marksMap[s.id] !== undefined ? marksMap[s.id] : 75;
      examService.saveMarksForStudent({
        tenantId: currentTenant.id,
        examId: selectedExamId,
        examTitle: exam?.title || 'Mid-Term Examination 2026',
        studentId: s.id,
        studentName: s.name,
        rollNo: s.rollNo,
        classId: s.classId,
        className: s.className,
        subjectsMarks: [
          {
            subjectId: 'sub-physics',
            subjectName: selectedMarksSubject,
            totalMarks: maxMarks,
            obtainedMarks: marks,
            passingMarks: passMarks
          }
        ],
        teacherRemarks: remarksMap[s.id] || 'Satisfactory'
      });
    });

    toast(`Marks for ${selectedMarksSubject} (${selectedClass?.name}) saved to academic records!`, 'success');
  };

  // ==================== STUDENT DETAILS MODAL ====================
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = classStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.rollNo.includes(studentSearch) ||
    s.fatherName.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-teal-50 border border-teal-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-teal-800">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Teacher Portal Mode:</strong> Demonstrating Pakistani faculty desk for <em>{currentUser.name}</em> (Senior Faculty).
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-teal-100 rounded text-[10px] font-semibold text-teal-900 uppercase">
          Faculty Active Session
        </span>
      </div>

      {/* Teacher Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-xs">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{currentUser.name}</h1>
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/60 text-[10px] font-bold">
                Senior Faculty (TCH-01)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Qualification: M.Sc Physics, B.Ed • Teaching: Class 9 & Class 10 (Science Section)
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Email: {currentUser.email} • Mobile: +92 321 4455667
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <span className="font-semibold block text-slate-900">{currentTenant.branding.schoolName}</span>
          <span className="text-[11px] font-mono text-teal-700 font-semibold">
            Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* In-Page Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs no-scrollbar">
        {[
          { id: 'overview', label: 'Faculty Overview', icon: Layers },
          { id: 'students', label: 'Class Students', icon: Users },
          { id: 'attendance', label: 'Daily Roll Call', icon: CalendarCheck },
          { id: 'homework', label: 'Homework Manager', icon: BookOpen },
          { id: 'marks', label: 'Marks & Results', icon: FileSpreadsheet },
          { id: 'timetable', label: 'Teaching Schedule', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-teal-700 text-teal-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: FACULTY OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Assigned Classes</span>
              <p className="text-xl font-bold text-slate-900 mt-1">2 Classes</p>
              <span className="text-[10px] text-slate-500">Class 9 & 10 (Science)</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Enrolled Students</span>
              <p className="text-xl font-bold text-blue-900 mt-1">68 Students</p>
              <span className="text-[10px] text-slate-500">Under Instruction</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Today's Lectures</span>
              <p className="text-xl font-bold text-teal-700 mt-1">4 Periods</p>
              <span className="text-[10px] text-teal-800 font-semibold">Physics & Mathematics</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Homework Due Today</span>
              <p className="text-xl font-bold text-amber-700 mt-1">
                {homeworkList.filter(h => h.dueDate === new Date().toISOString().split('T')[0]).length || '2'}
              </p>
              <span className="text-[10px] text-slate-500">Pending Review</span>
            </div>
          </div>

          {/* Quick Roll Call Shortcut Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <span>Morning Roll Call: {selectedClass?.name}</span>
                </h2>
                <p className="text-xs text-slate-500">Tap status to mark attendance before 9:00 AM</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkAll('present')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  All Present
                </button>
                <button
                  onClick={handleSaveAttendance}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Submit Roll Call</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {classStudents.slice(0, 4).map(s => {
                const current = statusMap[s.id] || 'present';
                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="text-slate-500 text-[11px]">Roll: {s.rollNo} • Father: {s.fatherName}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {(['present', 'absent', 'late', 'leave'] as AttendanceStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleMark(s.id, st)}
                          className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition ${
                            current === st
                              ? st === 'present'
                                ? 'bg-emerald-600 text-white'
                                : st === 'absent'
                                ? 'bg-rose-600 text-white'
                                : st === 'late'
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => handleTabChange('attendance')}
                className="text-xs text-teal-700 font-bold hover:underline"
              >
                Open Full Attendance Desk ({classStudents.length} Students) →
              </button>
            </div>
          </div>

          {/* Today's Teaching Schedule & Announcements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Today's Lecture Schedule</span>
              </h3>

              <div className="space-y-2 text-xs">
                {myTimetable.slice(0, 4).map(t => (
                  <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{t.subjectName}</span>
                      <span className="text-slate-500 text-[11px]">{t.className} • Room {t.roomNo}</span>
                    </div>
                    <span className="font-mono font-medium text-blue-900 text-xs px-2 py-0.5 bg-blue-50 rounded">
                      {t.startTime} - {t.endTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Faculty Notices & Staff Meetings</span>
              </h3>

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

      {/* ==================== TAB 2: CLASS STUDENTS LIST ==================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-700" />
                <span>Assigned Class Roster</span>
              </h3>
              <p className="text-xs text-slate-500">View enrolled students and contact guardians</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Class Selector */}
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-44"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold text-[11px]">
                    <th className="py-3 px-4">Roll #</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Father / Guardian</th>
                    <th className="py-3 px-4">Class & Sec</th>
                    <th className="py-3 px-4">Parent Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.rollNo}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{s.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Adm: {s.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{s.fatherName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {s.className} ({s.sectionName})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.parentContact}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setViewingStudent(s)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                          title="View Student Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ATTENDANCE DESK ==================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-teal-700" />
                <span>Attendance Roll Call Desk</span>
              </h3>
              <p className="text-xs text-slate-500">Record daily attendance for official registers</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={attendanceSection}
                onChange={e => setAttendanceSection(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="All">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>

              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800"
              />

              <button
                onClick={() => handleMarkAll('present')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                All Present
              </button>

              <button
                onClick={handleSaveAttendance}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          {/* Student Roll Call List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                {selectedClass?.name} • Total Students: {classStudents.length}
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="text-emerald-700">Present: {classStudents.filter(s => (statusMap[s.id] || 'present') === 'present').length}</span>
                <span className="text-rose-700">Absent: {classStudents.filter(s => statusMap[s.id] === 'absent').length}</span>
                <span className="text-amber-700">Late: {classStudents.filter(s => statusMap[s.id] === 'late').length}</span>
                <span className="text-blue-700">Leave: {classStudents.filter(s => statusMap[s.id] === 'leave').length}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {classStudents.map(s => {
                const current = statusMap[s.id] || 'present';
                return (
                  <div key={s.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                        {s.rollNo}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{s.name}</span>
                        <span className="text-[11px] text-slate-500">Father: {s.fatherName} • Adm #{s.admissionNo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(['present', 'absent', 'late', 'leave'] as AttendanceStatus[]).map(st => (
                        <button
                          key={st}
                          onClick={() => handleMark(s.id, st)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${
                            current === st
                              ? st === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : st === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : st === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past Attendance Logs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recorded Attendance History Logs
            </h4>

            <div className="divide-y divide-slate-100 text-xs">
              {attendanceHistoryLogs.map((log, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-slate-900">{log.date}</span>
                    <span className="font-semibold text-slate-700">{log.className}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                    <span className="text-emerald-700 font-semibold">{log.present} Present</span>
                    <span className="text-rose-600">{log.absent} Absent</span>
                    <span className="text-slate-400">Saved: {log.savedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: HOMEWORK MANAGER ==================== */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-teal-700" />
                <span>Homework & Diary Assignments</span>
              </h3>
              <p className="text-xs text-slate-500">Assign chapter readings, math exercises, and science projects</p>
            </div>

            <button
              onClick={handleOpenAddHw}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Homework</span>
            </button>
          </div>

          <div className="space-y-3">
            {homeworkList.map(h => (
              <div key={h.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-xs">
                      {h.subjectName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs">
                      {h.className}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{h.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 mr-2">
                      Due: <strong>{h.dueDate}</strong>
                    </span>

                    <button
                      onClick={() => handleOpenEditHw(h)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                      title="Edit Homework"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingHwId(h.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition"
                      title="Delete Homework"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-700 text-xs leading-relaxed">{h.description}</p>
                <div className="text-[10px] text-slate-400 font-mono">
                  Assigned by {h.teacherName || currentUser.name} on {h.assignedDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: MARKS & RESULTS ENTRY ==================== */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                <span>Exam Marks Entry & Grading</span>
              </h3>
              <p className="text-xs text-slate-500">Enter marks for Board and internal exams with auto-grading</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedMarksSubject}
                onChange={e => setSelectedMarksSubject(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="Physics">Physics</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="English">English</option>
                <option value="Urdu">Urdu</option>
                <option value="Islamiat">Islamiat</option>
              </select>

              <button
                onClick={handleSaveMarks}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Marks</span>
              </button>
            </div>
          </div>

          {/* Marks Entry Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50/70">
              <span className="font-bold text-slate-900">
                Subject: {selectedMarksSubject} • Max Marks: {maxMarks} • Passing: {passMarks}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {classStudents.length} Students Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-4">Roll #</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4 text-center">Marks (Max {maxMarks})</th>
                    <th className="py-2.5 px-4 text-center">Percentage</th>
                    <th className="py-2.5 px-4 text-center">Grade</th>
                    <th className="py-2.5 px-4">Teacher Evaluation Remarks</th>
                    <th className="py-2.5 px-4 text-right">Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map(s => {
                    const currentMarks = marksMap[s.id] !== undefined ? marksMap[s.id] : 75;
                    const pct = Math.round((currentMarks / maxMarks) * 100);
                    const grade = calculateGrade(pct);
                    const remarks = remarksMap[s.id] || 'Good effort';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.rollNo}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-400">Father: {s.fatherName}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={currentMarks}
                            onChange={e => {
                              const val = Math.min(maxMarks, Math.max(0, parseInt(e.target.value) || 0));
                              setMarksMap(prev => ({ ...prev, [s.id]: val }));
                            }}
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-semibold text-blue-900">
                          {pct}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded font-black text-xs ${
                            grade === 'A+' ? 'bg-emerald-100 text-emerald-800' : grade === 'A' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={remarks}
                            onChange={e => {
                              const val = e.target.value;
                              setRemarksMap(prev => ({ ...prev, [s.id]: val }));
                            }}
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              const dummyResult: StudentResult = {
                                id: `res-${s.id}`,
                                tenantId: currentTenant.id,
                                examId: selectedExamId,
                                examTitle: exams.find(e => e.id === selectedExamId)?.title || 'Mid-Term 2026',
                                studentId: s.id,
                                studentName: s.name,
                                rollNo: s.rollNo,
                                classId: s.classId,
                                className: s.className,
                                totalMarks: maxMarks,
                                totalObtained: currentMarks,
                                percentage: pct,
                                grade: grade,
                                positionInClass: 2,
                                teacherRemarks: remarks,
                                status: 'pass',
                                subjectsMarks: [
                                  {
                                    subjectId: 'sub-physics',
                                    subjectName: selectedMarksSubject,
                                    totalMarks: maxMarks,
                                    passingMarks: passMarks,
                                    obtainedMarks: currentMarks,
                                    grade: grade,
                                    remarks: remarks
                                  }
                                ]
                              };
                              setSelectedReportResult(dummyResult);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-700 transition"
                            title="Preview Student Report Card"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 6: TEACHING SCHEDULE ==================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Faculty Weekly Timetable Schedule ({currentUser.name})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {myTimetable.map(t => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{t.subjectName}</h4>
                    <p className="text-slate-600 mt-0.5">{t.className} • Room {t.roomNo}</p>
                    <span className="text-[10px] text-slate-400 font-mono">Day: {t.day}</span>
                  </div>

                  <span className="font-mono font-bold text-blue-900 text-xs px-2.5 py-1 bg-blue-50 rounded-lg">
                    {t.startTime} - {t.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Add / Edit Homework Modal */}
      <Modal
        isOpen={isHwModalOpen}
        onClose={() => setIsHwModalOpen(false)}
        title={editingHw ? 'Edit Homework Assignment' : 'Assign New Homework'}
        subtitle="Post homework tasks to student and parent diary portals"
        maxWidth="md"
      >
        <form onSubmit={handleSaveHw} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Class *</label>
            <select
              value={hwFormData.classId}
              onChange={e => setHwFormData(prev => ({ ...prev, classId: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Subject Name *</label>
              <input
                type="text"
                required
                value={hwFormData.subjectName}
                onChange={e => setHwFormData(prev => ({ ...prev, subjectName: e.target.value }))}
                placeholder="Physics / Math / Chemistry"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Submission Due Date *</label>
              <input
                type="date"
                required
                value={hwFormData.dueDate}
                onChange={e => setHwFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Homework Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 3: Gravitation Numerical Questions 1 to 5"
              value={hwFormData.title}
              onChange={e => setHwFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Detailed Instructions *</label>
            <textarea
              rows={3}
              required
              placeholder="Solve on fair homework notebooks. Draw diagrams where necessary..."
              value={hwFormData.description}
              onChange={e => setHwFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsHwModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-xs"
            >
              {editingHw ? 'Update Homework' : 'Publish Homework'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Homework */}
      <ConfirmModal
        isOpen={!!deletingHwId}
        onClose={() => setDeletingHwId(null)}
        onConfirm={handleConfirmDeleteHw}
        title="Delete Homework Assignment"
        message="Are you sure you want to remove this homework assignment? It will be removed from all student diaries."
        confirmLabel="Delete Assignment"
      />

      {/* Viewing Student Modal */}
      {viewingStudent && (
        <Modal
          isOpen={true}
          onClose={() => setViewingStudent(null)}
          title="Student Academic Profile"
          subtitle={`Class ${viewingStudent.className} • Roll No ${viewingStudent.rollNo}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-bold text-xl flex items-center justify-center shrink-0">
                {viewingStudent.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{viewingStudent.name}</h4>
                <p className="text-slate-500">Father: {viewingStudent.fatherName}</p>
                <span className="text-[10px] font-mono text-slate-400">Adm: {viewingStudent.admissionNo}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Parent Contact</span>
                <span className="font-mono font-bold text-slate-900">{viewingStudent.parentContact}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                <span className="font-bold text-emerald-700 uppercase">{viewingStudent.status}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">B-Form / CNIC</span>
                <span className="font-mono text-slate-800">{viewingStudent.bFormOrCnic}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Monthly Fee</span>
                <span className="font-mono font-bold text-slate-900">PKR {viewingStudent.monthlyFee?.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Residential Address</span>
              <span className="text-slate-800">{viewingStudent.address}</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Report Card Modal */}
      {selectedReportResult && (
        <ReportCardModal
          isOpen={true}
          onClose={() => setSelectedReportResult(null)}
          result={selectedReportResult}
          tenant={currentTenant}
        />
      )}
    </div>
  );
};
