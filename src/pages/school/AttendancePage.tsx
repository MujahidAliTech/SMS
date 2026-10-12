import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { attendanceService, studentService, classService } from '../../services';
import { AttendanceRecord, AttendanceStatus, Student } from '../../types';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Save,
  Sparkles,
  Calendar,
  Filter,
  Users,
  History,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const classes = classService.getAll(currentTenant.id);

  // Active view tab: 'register' or 'history'
  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');

  // Selectors
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'class-9');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Attendance state
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Selected class object
  const currentClassObj = classes.find(c => c.id === selectedClassId) || classes[0];

  useEffect(() => {
    // Load students for chosen class & section
    const all = studentService.getAll(currentTenant.id);
    let filtered = all.filter(s => s.classId === selectedClassId && s.status === 'active');
    if (selectedSection !== 'all') {
      filtered = filtered.filter(s => 
        s.sectionName.toLowerCase().includes(selectedSection.toLowerCase()) || 
        s.sectionId.toLowerCase().includes(selectedSection.toLowerCase())
      );
    }
    setClassStudents(filtered);

    // Load existing attendance records for date & class
    const existing = attendanceService.getRecords(currentTenant.id, selectedDate, selectedClassId);
    const initialStatus: Record<string, AttendanceStatus> = {};
    const initialRemarks: Record<string, string> = {};

    filtered.forEach(student => {
      const match = existing.find(e => e.studentId === student.id);
      if (match) {
        initialStatus[student.id] = match.status;
        if (match.remarks) initialRemarks[student.id] = match.remarks;
      } else {
        // Default to present
        initialStatus[student.id] = 'present';
      }
    });

    setStatusMap(initialStatus);
    setRemarksMap(initialRemarks);
    setIsSaved(existing.length > 0);
  }, [selectedClassId, selectedSection, selectedDate, currentTenant.id]);

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }));
    setIsSaved(false);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach(s => {
      updated[s.id] = status;
    });
    setStatusMap(updated);
    setIsSaved(false);
    toast(`Marked all ${classStudents.length} students as ${status.toUpperCase()}`, 'info');
  };

  const handleSaveAttendance = () => {
    if (classStudents.length === 0) {
      toast('No students available to record attendance for', 'error');
      return;
    }

    const recordsToSave: AttendanceRecord[] = classStudents.map(student => ({
      id: `att-${student.id}-${selectedDate}`,
      tenantId: currentTenant.id,
      date: selectedDate,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      sectionId: student.sectionId,
      status: statusMap[student.id] || 'present',
      remarks: remarksMap[student.id] || ''
    }));

    attendanceService.saveRecords(currentTenant.id, recordsToSave);
    setIsSaved(true);
    toast(`Attendance saved for ${classStudents.length} students on ${selectedDate}`, 'success');
  };

  // KPI calculations
  const presentCount = Object.values(statusMap).filter(s => s === 'present').length;
  const absentCount = Object.values(statusMap).filter(s => s === 'absent').length;
  const lateCount = Object.values(statusMap).filter(s => s === 'late').length;
  const leaveCount = Object.values(statusMap).filter(s => s === 'leave').length;
  const attendancePercentage = classStudents.length > 0
    ? Math.round(((presentCount + lateCount) / classStudents.length) * 100)
    : 100;

  // History list
  const historyRecords = attendanceService.getHistory(currentTenant.id, undefined, selectedClassId);
  // Group history records by date
  const historyByDate: Record<string, AttendanceRecord[]> = {};
  historyRecords.forEach(r => {
    if (!historyByDate[r.date]) historyByDate[r.date] = [];
    historyByDate[r.date].push(r);
  });
  const historyDates = Object.keys(historyByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Attendance Management</h1>
          <p className="text-xs text-slate-500">
            Daily morning attendance registers, section filters, and historical attendance logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="bg-slate-200/80 p-0.5 rounded-lg flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'register' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mark Register
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'history' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance History ({historyDates.length})
            </button>
          </div>

          {activeTab === 'register' && (
            <button
              onClick={handleSaveAttendance}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Attendance Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Select Class</label>
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSelectedSection('all');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-semibold text-blue-900"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="all">All Sections</option>
              {currentClassObj?.sections.map((sec, idx) => (
                <option key={idx} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>
        </div>

        {activeTab === 'register' && (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Bulk Mark:</span>
            <button
              onClick={() => handleMarkAll('present')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
            >
              All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
            >
              All Absent
            </button>
          </div>
        )}
      </div>

      {activeTab === 'register' ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Students Roster</span>
              <span className="text-2xl font-bold text-slate-800">{classStudents.length}</span>
            </div>
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-xs text-center">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">Present (P)</span>
              <span className="text-2xl font-bold text-emerald-800">{presentCount}</span>
            </div>
            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-xs text-center">
              <span className="text-[10px] text-rose-700 uppercase font-bold block">Absent (A)</span>
              <span className="text-2xl font-bold text-rose-800">{absentCount}</span>
            </div>
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 shadow-xs text-center">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Late / Leave</span>
              <span className="text-2xl font-bold text-amber-800">{lateCount + leaveCount}</span>
            </div>
            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 shadow-xs text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-blue-700 uppercase font-bold block">Attendance %</span>
              <span className="text-2xl font-bold text-blue-900">{attendancePercentage}%</span>
            </div>
          </div>

          {/* Unsaved indicator */}
          {!isSaved && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have unsaved attendance marks for {selectedDate}. Click "Save Register" to commit.</span>
              </div>
              <button
                onClick={handleSaveAttendance}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
              >
                Save Now
              </button>
            </div>
          )}

          {/* Roster Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3">Section</th>
                    <th className="py-3 px-3">Father Name</th>
                    <th className="py-3 px-4 text-center">Status Marking</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No students found</p>
                        <p className="text-[11px] mt-0.5">There are no active students in {currentClassObj?.name} {selectedSection !== 'all' ? `(Section ${selectedSection})` : ''}.</p>
                      </td>
                    </tr>
                  ) : (
                    classStudents.map(student => {
                      const currentStatus = statusMap[student.id] || 'present';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-900">
                            {student.rollNo}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {student.name}
                            <span className="text-[10px] text-slate-400 block font-mono font-normal">
                              {student.admissionNo}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 font-medium">
                            {student.sectionName || 'A'}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {student.fatherName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'present')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'absent')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'late')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition ${
                                  currentStatus === 'late'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.id, 'leave')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition ${
                                  currentStatus === 'leave'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Leave
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="e.g. Sick leave, Late arrival..."
                              value={remarksMap[student.id] || ''}
                              onChange={e => {
                                setRemarksMap({ ...remarksMap, [student.id]: e.target.value });
                                setIsSaved(false);
                              }}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 bg-slate-50/50"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* History & Past Logs Tab */
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Attendance History for {currentClassObj?.name}</h3>
              <p className="text-xs text-slate-500">Recorded attendance logs across dates</p>
            </div>
          </div>

          {historyDates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No past attendance logs recorded for this class yet.</p>
              <button
                onClick={() => setActiveTab('register')}
                className="mt-3 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Mark Attendance for Today
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Total Marked</th>
                    <th className="py-2.5 px-3">Present</th>
                    <th className="py-2.5 px-3">Absent</th>
                    <th className="py-2.5 px-3">Late / Leave</th>
                    <th className="py-2.5 px-3">Turnout %</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyDates.map(dateKey => {
                    const recs = historyByDate[dateKey];
                    const pCount = recs.filter(r => r.status === 'present').length;
                    const aCount = recs.filter(r => r.status === 'absent').length;
                    const otherCount = recs.filter(r => r.status === 'late' || r.status === 'leave').length;
                    const pct = recs.length > 0 ? Math.round(((pCount + recs.filter(r => r.status === 'late').length) / recs.length) * 100) : 0;

                    return (
                      <tr key={dateKey} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{dateKey}</td>
                        <td className="py-2.5 px-3 font-medium text-blue-900">{currentClassObj?.name}</td>
                        <td className="py-2.5 px-3 font-mono">{recs.length}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{pCount}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{aCount}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-700">{otherCount}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                            pct >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedDate(dateKey);
                              setActiveTab('register');
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-semibold text-xs transition"
                          >
                            Load Register
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
