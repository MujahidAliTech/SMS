import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { classApiAdapter, attendanceApiAdapter, AttendanceRosterItem, AttendanceCorrectionEntry } from '../../services/dataAdapter';
import { AttendanceStatus, SchoolClass } from '../../types';
import { Modal } from '../../components/common/Modal';
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
  AlertCircle,
  ShieldAlert,
  Loader2,
  Edit3,
  Search,
  Check
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { currentTenant, currentUser, storageMode, toast } = useApp();

  // Active view tab: 'register' | 'history' | 'audit'
  const [activeTab, setActiveTab] = useState<'register' | 'history' | 'audit'>('register');

  // Classes list
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState<boolean>(true);

  // Selectors
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Attendance state
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audit corrections state
  const [corrections, setCorrections] = useState<AttendanceCorrectionEntry[]>([]);
  const [loadingCorrections, setLoadingCorrections] = useState<boolean>(false);

  // Modal for individual record correction
  const [correctionModalOpen, setCorrectionModalOpen] = useState<boolean>(false);
  const [recordToCorrect, setRecordToCorrect] = useState<AttendanceRosterItem | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [newRemarks, setNewRemarks] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correcting, setCorrecting] = useState<boolean>(false);

  // Load classes on mount or when tenant / storageMode changes
  useEffect(() => {
    let isMounted = true;
    async function loadClasses() {
      setClassesLoading(true);
      try {
        const cls = await classApiAdapter.getClasses(currentTenant.id, storageMode);
        if (!isMounted) return;
        setClasses(cls);
        if (cls.length > 0 && !selectedClassId) {
          setSelectedClassId(cls[0].id);
        }
      } catch (err) {
        if (!isMounted) return;
        toast((err as Error).message || 'Failed to load classes', 'error');
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }
    loadClasses();
    return () => { isMounted = false; };
  }, [currentTenant.id, storageMode]);

  // Selected class object
  const currentClassObj = classes.find(c => c.id === selectedClassId) || classes[0];

  // Fetch attendance roster
  const fetchAttendanceRoster = useCallback(async () => {
    if (!selectedClassId || !selectedDate) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await attendanceApiAdapter.getClassAttendance({
        tenantId: currentTenant.id,
        classId: selectedClassId,
        sectionId: selectedSection,
        date: selectedDate
      }, storageMode);

      setRoster(data.roster);
      const initialStatus: Record<string, AttendanceStatus> = {};
      const initialRemarks: Record<string, string> = {};

      data.roster.forEach(item => {
        initialStatus[item.studentId] = item.status;
        if (item.remarks) initialRemarks[item.studentId] = item.remarks;
      });

      setStatusMap(initialStatus);
      setRemarksMap(initialRemarks);
      setIsSaved(data.isMarked);
    } catch (err) {
      const msg = (err as Error).message || 'Failed to load attendance roster';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTenant.id, selectedClassId, selectedSection, selectedDate, storageMode]);

  useEffect(() => {
    fetchAttendanceRoster();
  }, [fetchAttendanceRoster]);

  // Load audit corrections
  const loadAuditCorrections = useCallback(async () => {
    if (!['school_admin', 'principal', 'super_admin'].includes(currentUser.role)) return;
    setLoadingCorrections(true);
    try {
      const logs = await attendanceApiAdapter.getAttendanceCorrections(currentTenant.id, { date: selectedDate }, storageMode);
      setCorrections(logs);
    } catch (err) {
      console.warn('Failed to load attendance corrections:', err);
    } finally {
      setLoadingCorrections(false);
    }
  }, [currentTenant.id, selectedDate, currentUser.role, storageMode]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditCorrections();
    }
  }, [activeTab, loadAuditCorrections]);

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }));
    setIsSaved(false);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    roster.forEach(s => {
      updated[s.studentId] = status;
    });
    setStatusMap(updated);
    setIsSaved(false);
    toast(`Marked all ${roster.length} students as ${status.toUpperCase()}`, 'info');
  };

  const handleSaveAttendance = async () => {
    if (roster.length === 0) {
      toast('No students enrolled in this class to record attendance', 'error');
      return;
    }

    setSaving(true);
    try {
      const records = roster.map(student => ({
        studentId: student.studentId,
        status: statusMap[student.studentId] || 'present',
        remarks: remarksMap[student.studentId] || undefined
      }));

      const res = await attendanceApiAdapter.saveBatchAttendance({
        tenantId: currentTenant.id,
        classId: selectedClassId,
        sectionId: selectedSection !== 'all' ? selectedSection : undefined,
        date: selectedDate,
        records
      }, storageMode);

      setIsSaved(true);
      toast(res.message || `Attendance saved successfully for ${records.length} students on ${selectedDate}`, 'success');
      // Refresh to update IDs and server-side stamps
      await fetchAttendanceRoster();
    } catch (err) {
      const msg = (err as Error).message || 'Failed to save attendance';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open correction modal for a specific student record
  const handleOpenCorrection = (studentItem: AttendanceRosterItem) => {
    setRecordToCorrect(studentItem);
    setNewStatus(statusMap[studentItem.studentId] || studentItem.status);
    setNewRemarks(remarksMap[studentItem.studentId] || studentItem.remarks || '');
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  // Commit individual correction with audit reason
  const handleCommitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToCorrect) return;

    if (!correctionReason.trim()) {
      toast('Please provide a reason for correcting this attendance record', 'error');
      return;
    }

    setCorrecting(true);
    try {
      if (recordToCorrect.recordId) {
        await attendanceApiAdapter.correctAttendanceRecord(recordToCorrect.recordId, {
          tenantId: currentTenant.id,
          newStatus,
          newRemarks: newRemarks.trim() || undefined,
          reason: correctionReason.trim()
        }, storageMode);
      } else {
        // If not recorded yet, save as part of the daily roll call
        await attendanceApiAdapter.saveBatchAttendance({
          tenantId: currentTenant.id,
          classId: selectedClassId,
          sectionId: selectedSection !== 'all' ? selectedSection : undefined,
          date: selectedDate,
          records: [{
            studentId: recordToCorrect.studentId,
            status: newStatus,
            remarks: newRemarks.trim() || undefined
          }]
        }, storageMode);
      }

      toast(`Attendance corrected for ${recordToCorrect.studentName} with audit log entry`, 'success');
      setCorrectionModalOpen(false);
      setRecordToCorrect(null);
      await fetchAttendanceRoster();
      if (activeTab === 'audit') await loadAuditCorrections();
    } catch (err) {
      toast((err as Error).message || 'Failed to submit correction', 'error');
    } finally {
      setCorrecting(false);
    }
  };

  // KPI calculations
  const presentCount = Object.values(statusMap).filter(s => s === 'present').length;
  const absentCount = Object.values(statusMap).filter(s => s === 'absent').length;
  const lateCount = Object.values(statusMap).filter(s => s === 'late').length;
  const leaveCount = Object.values(statusMap).filter(s => s === 'leave').length;
  const totalStudents = roster.length;
  const attendancePercentage = totalStudents > 0
    ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
    : 100;

  const canViewAudit = ['school_admin', 'principal', 'super_admin'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Student Attendance Management</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
              {storageMode === 'cloudflare_d1' ? 'Cloudflare D1' : 'Local Demo'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily roll call, teacher class-scoped attendance marking, and auditable correction logs
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
              Class History
            </button>
            {canViewAudit && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'audit' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audit Trail
              </button>
            )}
          </div>

          {activeTab === 'register' && (
            <button
              onClick={handleSaveAttendance}
              disabled={saving || loading || roster.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Register'}</span>
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
              disabled={classesLoading}
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
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition cursor-pointer"
            >
              All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              All Absent
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Access or Request Error:</strong> {errorMsg}
          </div>
        </div>
      )}

      {activeTab === 'register' ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Students Roster</span>
              <span className="text-2xl font-bold text-slate-800">{totalStudents}</span>
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
                <span>You have unsaved attendance marks for {selectedDate}. Click "Save Register" to commit to D1.</span>
              </div>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
              >
                {saving ? 'Saving...' : 'Save Now'}
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
                    <th className="py-3 px-4 text-center">Status Marking</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Loading class attendance...</p>
                      </td>
                    </tr>
                  ) : roster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No active students found</p>
                        <p className="text-[11px] mt-0.5">There are no enrolled active students in {currentClassObj?.name} {selectedSection !== 'all' ? `(Section ${selectedSection})` : ''}.</p>
                      </td>
                    </tr>
                  ) : (
                    roster.map(student => {
                      const currentStatus = statusMap[student.studentId] || 'present';

                      return (
                        <tr key={student.studentId} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-900">
                            {student.rollNo}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {student.studentName}
                            {student.isRecorded && (
                              <span className="text-[10px] text-emerald-600 font-normal inline-flex items-center gap-0.5 ml-2">
                                <Check className="w-3 h-3 inline" /> Recorded
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 font-medium">
                            {student.sectionName || 'A'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.studentId, 'present')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.studentId, 'absent')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.studentId, 'late')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                                  currentStatus === 'late'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetStatus(student.studentId, 'leave')}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
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
                              maxLength={250}
                              placeholder="e.g. Sick leave, Late arrival..."
                              value={remarksMap[student.studentId] || ''}
                              onChange={e => {
                                setRemarksMap({ ...remarksMap, [student.studentId]: e.target.value });
                                setIsSaved(false);
                              }}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 bg-slate-50/50"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenCorrection(student)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Audit Correction"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Correct</span>
                            </button>
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
      ) : activeTab === 'history' ? (
        /* History & Summary Tab */
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Attendance Summary for {currentClassObj?.name}</h3>
              <p className="text-xs text-slate-500">Recorded attendance rates and status distribution</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Total Students</th>
                  <th className="py-2.5 px-3">Present</th>
                  <th className="py-2.5 px-3">Absent</th>
                  <th className="py-2.5 px-3">Late / Leave</th>
                  <th className="py-2.5 px-3">Turnout %</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{selectedDate}</td>
                  <td className="py-2.5 px-3 font-medium text-blue-900">{currentClassObj?.name}</td>
                  <td className="py-2.5 px-3 font-mono">{totalStudents}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{presentCount}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{absentCount}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700">{lateCount + leaveCount}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      attendancePercentage >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {attendancePercentage}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setActiveTab('register')}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-semibold text-xs transition cursor-pointer"
                    >
                      View Register
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Auditable Corrections History Tab */
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Attendance Correction Audit Log</h3>
              <p className="text-xs text-slate-500">Immutable trail of attendance alterations, authorized user stamps, and reasons</p>
            </div>
            <button
              onClick={loadAuditCorrections}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          {loadingCorrections ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Loading audit records...</p>
            </div>
          ) : corrections.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No attendance corrections logged for {selectedDate}.</p>
              <p className="text-[11px] text-slate-400 mt-1">Corrections made by staff will be permanently auditable here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Change (Old → New)</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-4">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {corrections.map(corr => (
                    <tr key={corr.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {corr.created_at}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {corr.student_name || corr.student_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {corr.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className="uppercase text-rose-600">{corr.old_status}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="uppercase text-emerald-600">{corr.new_status}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {corr.reason || 'Administrative correction'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">
                        {corr.changed_by_user_name || corr.changed_by_user_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audited Correction Modal */}
      {correctionModalOpen && recordToCorrect && (
        <Modal
          isOpen={true}
          onClose={() => setCorrectionModalOpen(false)}
          title="Attendance Record Correction"
          subtitle={`Audit log for ${recordToCorrect.studentName} (${recordToCorrect.rollNo}) on ${selectedDate}`}
          maxWidth="md"
        >
          <form onSubmit={handleCommitCorrection} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <p className="font-semibold">Mandatory Audit Trail:</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                All modifications to recorded attendance are logged with your user credentials, timestamp, and formal justification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Attendance Status</label>
              <div className="grid grid-cols-4 gap-2">
                {(['present', 'absent', 'late', 'leave'] as AttendanceStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewStatus(st)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg uppercase transition cursor-pointer ${
                      newStatus === st
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Updated Remarks (Optional)</label>
              <input
                type="text"
                maxLength={250}
                value={newRemarks}
                onChange={e => setNewRemarks(e.target.value)}
                placeholder="e.g. Medical certificate verified by principal"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correction Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                maxLength={250}
                rows={3}
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                placeholder="Provide justification: e.g. Student arrived with parent at 08:30 after doctor appointment..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Maximum 250 characters.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={correcting || !correctionReason.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {correcting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{correcting ? 'Saving Correction...' : 'Commit Correction'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
