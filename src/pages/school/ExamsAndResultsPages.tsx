import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { examService, studentService, classService, subjectService } from '../../services';
import { Exam, StudentResult, Student, Subject } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ReportCardModal } from '../../components/print/ReportCardModal';
import {
  FileSpreadsheet,
  Plus,
  Printer,
  Award,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  BookOpen,
  AlertCircle,
  Sparkles,
  Percent,
  Check,
  X
} from 'lucide-react';

export const ExamsListPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [exams, setExams] = useState<Exam[]>(() => examService.getExams(currentTenant.id));
  const [results, setResults] = useState<StudentResult[]>(() => examService.getResults(currentTenant.id));
  const classes = classService.getAll(currentTenant.id);
  const subjects = subjectService.getAll(currentTenant.id);
  const students = studentService.getAll(currentTenant.id);

  const [activeTab, setActiveTab] = useState<'exams' | 'results'>('exams');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');

  // Modals state
  const [isAddEditExamModalOpen, setIsAddEditExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  const [isMarksEntryModalOpen, setIsMarksEntryModalOpen] = useState(false);
  const [selectedResultForPrint, setSelectedResultForPrint] = useState<StudentResult | null>(null);
  const [resultToDelete, setResultToDelete] = useState<StudentResult | null>(null);

  // New/Edit Exam Form
  const [examForm, setExamForm] = useState({
    title: 'Mid-Term Assessment 2026',
    term: 'Mid Term' as Exam['term'],
    session: currentTenant.branding.academicSession,
    startDate: '2026-11-15',
    endDate: '2026-11-28',
    status: 'upcoming' as Exam['status']
  });

  // Marks Entry Form state
  const [marksExamId, setMarksExamId] = useState<string>(exams[0]?.id || '');
  const [marksClassId, setMarksClassId] = useState<string>(classes[0]?.id || '');
  const [marksStudentId, setMarksStudentId] = useState<string>('');
  const [subjectMarksInputs, setSubjectMarksInputs] = useState<Record<string, number>>({});
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [positionInClass, setPositionInClass] = useState<number | undefined>(undefined);
  const [marksErrors, setMarksErrors] = useState<string[]>([]);

  const refreshList = () => {
    setExams(examService.getExams(currentTenant.id));
    setResults(examService.getResults(currentTenant.id));
  };

  // Filtered Results
  const filteredResults = results.filter(res => {
    const matchesSearch = res.studentName.toLowerCase().includes(search.toLowerCase()) ||
      res.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      res.className.toLowerCase().includes(search.toLowerCase());
    const matchesClass = classFilter === 'all' || res.classId === classFilter;
    const matchesExam = examFilter === 'all' || res.examId === examFilter;
    return matchesSearch && matchesClass && matchesExam;
  });

  // Open Add Exam
  const handleOpenAddExam = () => {
    setEditingExam(null);
    setExamForm({
      title: 'Final Term Examinations 2026-27',
      term: 'Final Term',
      session: currentTenant.branding.academicSession,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'upcoming'
    });
    setIsAddEditExamModalOpen(true);
  };

  // Open Edit Exam
  const handleOpenEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setExamForm({
      title: exam.title,
      term: exam.term,
      session: exam.session,
      startDate: exam.startDate,
      endDate: exam.endDate,
      status: exam.status
    });
    setIsAddEditExamModalOpen(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title.trim()) return;

    if (editingExam) {
      examService.updateExam(editingExam.id, {
        title: examForm.title.trim(),
        term: examForm.term,
        session: examForm.session.trim(),
        startDate: examForm.startDate,
        endDate: examForm.endDate,
        status: examForm.status
      });
      toast(`Exam "${examForm.title}" updated`, 'success');
    } else {
      examService.createExam({
        tenantId: currentTenant.id,
        title: examForm.title.trim(),
        term: examForm.term,
        session: examForm.session.trim(),
        startDate: examForm.startDate,
        endDate: examForm.endDate,
        status: examForm.status
      });
      toast(`Exam "${examForm.title}" scheduled`, 'success');
    }

    refreshList();
    setIsAddEditExamModalOpen(false);
  };

  const handleConfirmDeleteExam = () => {
    if (!examToDelete) return;
    examService.deleteExam(examToDelete.id);
    refreshList();
    toast(`Exam "${examToDelete.title}" deleted`, 'info');
    setExamToDelete(null);
  };

  // Open Marks Entry Modal
  const handleOpenMarksEntry = (presetExamId?: string, presetClassId?: string) => {
    const activeExamId = presetExamId || exams[0]?.id || '';
    const activeClassId = presetClassId || classes[0]?.id || '';
    setMarksExamId(activeExamId);
    setMarksClassId(activeClassId);

    const eligibleStudents = students.filter(s => s.classId === activeClassId);
    const firstStudent = eligibleStudents[0];
    setMarksStudentId(firstStudent?.id || '');

    // Initialize marks map with subjects for this class
    const classSubs = subjects.filter(s => s.classId === activeClassId);
    const initialMarks: Record<string, number> = {};
    classSubs.forEach(s => {
      initialMarks[s.id] = Math.round(s.totalMarks * 0.75); // realistic default
    });
    setSubjectMarksInputs(initialMarks);
    setTeacherRemarks('Consistent academic effort. Good conceptual clarity.');
    setPositionInClass(undefined);
    setMarksErrors([]);
    setIsMarksEntryModalOpen(true);
  };

  // When class changes in marks entry modal, update student and subjects
  const handleMarksClassChange = (newClassId: string) => {
    setMarksClassId(newClassId);
    const eligibleStudents = students.filter(s => s.classId === newClassId);
    setMarksStudentId(eligibleStudents[0]?.id || '');

    const classSubs = subjects.filter(s => s.classId === newClassId);
    const initialMarks: Record<string, number> = {};
    classSubs.forEach(s => {
      initialMarks[s.id] = Math.round(s.totalMarks * 0.75);
    });
    setSubjectMarksInputs(initialMarks);
    setMarksErrors([]);
  };

  // Compute live calculations for marks modal
  const targetSubjects = subjects.filter(s => s.classId === marksClassId);
  const totalMaxMarks = targetSubjects.reduce((sum, s) => sum + s.totalMarks, 0);
  const totalObtainedMarks = targetSubjects.reduce((sum, s) => {
    const val = Number(subjectMarksInputs[s.id]) || 0;
    return sum + val;
  }, 0);
  const livePercentage = totalMaxMarks > 0 ? Math.round((totalObtainedMarks / totalMaxMarks) * 1000) / 10 : 0;
  const liveGrade = examService.calculateGrade(livePercentage);
  const anySubjectFailed = targetSubjects.some(s => {
    const val = Number(subjectMarksInputs[s.id]) || 0;
    return val < s.passingMarks;
  });

  const handleSaveMarks = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === marksStudentId);
    const ex = exams.find(e => e.id === marksExamId);
    const cls = classes.find(c => c.id === marksClassId);

    if (!st || !ex || !cls) {
      toast('Please select valid student, exam, and class', 'error');
      return;
    }

    if (targetSubjects.length === 0) {
      toast('No curriculum subjects configured for this class', 'error');
      return;
    }

    // Validation
    const errors: string[] = [];
    targetSubjects.forEach(s => {
      const val = subjectMarksInputs[s.id];
      if (val === undefined || isNaN(val)) {
        errors.push(`Marks for ${s.name} cannot be empty`);
      } else if (val < 0) {
        errors.push(`Marks for ${s.name} cannot be negative`);
      } else if (val > s.totalMarks) {
        errors.push(`Marks for ${s.name} (${val}) exceed max allowed marks (${s.totalMarks})`);
      }
    });

    if (errors.length > 0) {
      setMarksErrors(errors);
      return;
    }

    const payload = {
      tenantId: currentTenant.id,
      examId: ex.id,
      examTitle: ex.title,
      studentId: st.id,
      studentName: st.name,
      rollNo: st.rollNo,
      classId: cls.id,
      className: cls.name,
      subjectsMarks: targetSubjects.map(s => ({
        subjectId: s.id,
        subjectName: s.name,
        totalMarks: s.totalMarks,
        obtainedMarks: Number(subjectMarksInputs[s.id]) || 0,
        passingMarks: s.passingMarks
      })),
      teacherRemarks: teacherRemarks.trim() || undefined
    };

    const saved = examService.saveMarksForStudent(payload);
    refreshList();
    setIsMarksEntryModalOpen(false);
    toast(`Marks entered for ${st.name} (Grade: ${saved.grade}, ${saved.percentage}%)`, 'success');
    setActiveTab('results');
  };

  const handleConfirmDeleteResult = () => {
    if (!resultToDelete) return;
    examService.deleteResult(resultToDelete.id);
    refreshList();
    toast(`Result record for ${resultToDelete.studentName} deleted`, 'info');
    setResultToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Exams & Academic Results</h1>
          <p className="text-xs text-slate-500">
            Term assessments, marks entry engine, and printable BISE/Cambridge student report cards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="bg-slate-200/80 p-0.5 rounded-lg flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === 'exams' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'}`}
            >
              Exam Terms ({exams.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1.5 rounded-md transition ${activeTab === 'results' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'}`}
            >
              Announced Results ({results.length})
            </button>
          </div>

          <button
            onClick={() => handleOpenMarksEntry()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Enter Student Marks</span>
          </button>

          <button
            onClick={handleOpenAddExam}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Exam</span>
          </button>
        </div>
      </div>

      {activeTab === 'exams' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {exam.term}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      exam.status === 'announced' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {exam.status}
                    </span>
                    <button
                      onClick={() => handleOpenEditExam(exam)}
                      title="Edit Exam"
                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExamToDelete(exam)}
                      title="Delete Exam"
                      className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{exam.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Academic Session: {exam.session}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dates: {exam.startDate} to {exam.endDate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => handleOpenMarksEntry(exam.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Enter Marks for this Exam</span>
                </button>
                <button
                  onClick={() => {
                    setExamFilter(exam.id);
                    setActiveTab('results');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  <span>View Results ({results.filter(r => r.examId === exam.id).length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Results Table View */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col lg:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full lg:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by student, roll no, class..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={examFilter}
                onChange={e => setExamFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Exam Cycles</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>

              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {(search || examFilter !== 'all' || classFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setExamFilter('all');
                    setClassFilter('all');
                  }}
                  className="px-2 py-1 text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Assessment Term</th>
                    <th className="py-3 px-3">Marks Obtained</th>
                    <th className="py-3 px-3">Percentage</th>
                    <th className="py-3 px-3">Grade</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No results recorded yet</p>
                        <p className="text-[11px] mt-0.5">Click "Enter Student Marks" to record marks for any student.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map(res => (
                      <tr key={res.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {res.studentName}
                          <span className="text-[10px] text-slate-400 block font-mono font-normal">
                            Roll No: {res.rollNo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{res.className}</td>
                        <td className="py-3 px-3 text-slate-600">{res.examTitle}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {res.totalObtained} / {res.totalMarks}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-900">
                          {res.percentage}%
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            res.grade === 'A+' || res.grade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.grade === 'B' || res.grade === 'C'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {res.grade}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            res.status === 'pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedResultForPrint(res)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded text-xs transition"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-700" />
                              <span>Report Card</span>
                            </button>
                            <button
                              onClick={() => setResultToDelete(res)}
                              title="Delete Result"
                              className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedule / Edit Exam Modal */}
      <Modal
        isOpen={isAddEditExamModalOpen}
        onClose={() => setIsAddEditExamModalOpen(false)}
        title={editingExam ? `Edit Exam: ${editingExam.title}` : 'Schedule Academic Examination'}
        subtitle="Creates exam cycle for datesheet assignment and marks entry"
      >
        <form onSubmit={handleSaveExam} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Exam Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mid-Term Examination 2026"
              value={examForm.title}
              onChange={e => setExamForm({ ...examForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Term</label>
              <select
                value={examForm.term}
                onChange={e => setExamForm({ ...examForm, term: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="First Term">First Term</option>
                <option value="Mid Term">Mid Term</option>
                <option value="Pre-Board">Pre-Board (Matric/FSc)</option>
                <option value="Final Term">Final Term</option>
                <option value="Monthly Test">Monthly Test</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Session</label>
              <input
                type="text"
                value={examForm.session}
                onChange={e => setExamForm({ ...examForm, session: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Start Date</label>
              <input
                type="date"
                required
                value={examForm.startDate}
                onChange={e => setExamForm({ ...examForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">End Date</label>
              <input
                type="date"
                required
                value={examForm.endDate}
                onChange={e => setExamForm({ ...examForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              value={examForm.status}
              onChange={e => setExamForm({ ...examForm, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="upcoming">Upcoming (Datesheet announced)</option>
              <option value="announced">Results Announced</option>
              <option value="ongoing">In Progress / Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddEditExamModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs"
            >
              {editingExam ? 'Update Exam' : 'Announce Exam Datesheet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Enter Marks Workflow Modal */}
      <Modal
        isOpen={isMarksEntryModalOpen}
        onClose={() => setIsMarksEntryModalOpen(false)}
        title="Enter Subject Marks & Academic Grading"
        subtitle="Evaluates subject scores, validates maximum bounds, and calculates percentage & grade"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveMarks} className="space-y-4 text-xs text-slate-800">
          {marksErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Validation errors found:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {marksErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Target Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold mb-1">Target Exam *</label>
              <select
                value={marksExamId}
                onChange={e => setMarksExamId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Class *</label>
              <select
                value={marksClassId}
                onChange={e => handleMarksClassChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Student *</label>
              <select
                value={marksStudentId}
                onChange={e => setMarksStudentId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                {students.filter(s => s.classId === marksClassId).map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNo})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Marks Entry Grid */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2">Subject Marks Entry</h4>
            {targetSubjects.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No subjects configured for this class yet. Please add subjects to the curriculum first.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Max Marks</th>
                      <th className="py-2.5 px-3">Passing Marks</th>
                      <th className="py-2.5 px-3">Marks Obtained *</th>
                      <th className="py-2.5 px-3">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {targetSubjects.map(sub => {
                      const obtained = subjectMarksInputs[sub.id] || 0;
                      const isPassing = obtained >= sub.passingMarks;
                      const isOverLimit = obtained > sub.totalMarks || obtained < 0;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {sub.name}
                            <span className="text-[10px] text-slate-400 font-mono block">{sub.code}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{sub.totalMarks}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{sub.passingMarks}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              max={sub.totalMarks}
                              value={subjectMarksInputs[sub.id] !== undefined ? subjectMarksInputs[sub.id] : ''}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setSubjectMarksInputs({
                                  ...subjectMarksInputs,
                                  [sub.id]: val
                                });
                              }}
                              className={`w-24 px-2 py-1 text-xs font-mono font-bold border rounded-lg focus:outline-none ${
                                isOverLimit ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-600'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            {isOverLimit ? (
                              <span className="text-[10px] font-bold text-rose-600">Max {sub.totalMarks}!</span>
                            ) : isPassing ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="w-3.5 h-3.5" /> Pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                                <X className="w-3.5 h-3.5" /> Fail (&lt; {sub.passingMarks})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live Auto-Calculated Assessment Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Total Obtained</span>
              <span className="text-xl font-bold font-mono">
                {totalObtainedMarks} / {totalMaxMarks}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Percentage</span>
              <span className="text-xl font-bold font-mono text-cyan-400">
                {livePercentage}%
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Assigned Grade</span>
              <span className={`text-xl font-bold font-mono ${
                liveGrade === 'A+' || liveGrade === 'A' ? 'text-emerald-400' : liveGrade === 'F' ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {liveGrade}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Overall Verdict</span>
              <span className={`text-sm font-bold uppercase block mt-1 ${
                anySubjectFailed || livePercentage < 40 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {anySubjectFailed || livePercentage < 40 ? 'Needs Improvement' : 'Promoted / Passed'}
              </span>
            </div>
          </div>

          {/* Grading Scale Legend */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-700">Pakistan Demo Grading Standard:</span>
            <div className="flex gap-2 font-mono">
              <span className="text-emerald-800">A+ (&ge;80%)</span>
              <span className="text-emerald-700">A (70-79%)</span>
              <span className="text-blue-700">B (60-69%)</span>
              <span className="text-amber-700">C (50-59%)</span>
              <span className="text-orange-700">D (40-49%)</span>
              <span className="text-rose-700">F (&lt;40%)</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Teacher Evaluator Remarks</label>
            <input
              type="text"
              placeholder="e.g. Excellent analytical performance and consistent attendance."
              value={teacherRemarks}
              onChange={e => setTeacherRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsMarksEntryModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs"
            >
              Save Results & Announce
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setExamToDelete(null)}
          onConfirm={handleConfirmDeleteExam}
          title={`Delete Exam: ${examToDelete.title}`}
          message={`Are you sure you want to delete ${examToDelete.title}? All associated marks entries and datesheets will be removed.`}
          confirmLabel="Yes, Delete Exam"
          variant="danger"
        />
      )}

      {/* Delete Result Confirmation Modal */}
      {resultToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setResultToDelete(null)}
          onConfirm={handleConfirmDeleteResult}
          title={`Delete Student Result: ${resultToDelete.studentName}`}
          message={`Are you sure you want to delete the result card for ${resultToDelete.studentName} (${resultToDelete.examTitle})?`}
          confirmLabel="Yes, Delete Result"
          variant="danger"
        />
      )}

      {/* Printable Report Card Modal */}
      {selectedResultForPrint && (
        <ReportCardModal
          isOpen={true}
          onClose={() => setSelectedResultForPrint(null)}
          result={selectedResultForPrint}
          tenant={currentTenant}
        />
      )}
    </div>
  );
};
