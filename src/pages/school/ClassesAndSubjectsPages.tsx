import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { classService, subjectService, teacherStaffService, studentService } from '../../services';
import { classApiAdapter } from '../../services/dataAdapter';
import { SchoolClass, Subject, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  Layers,
  BookOpen,
  Plus,
  Users,
  Award,
  BookCheck,
  Edit2,
  Trash2,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Database,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const ClassesSectionsListPage: React.FC = () => {
  const { currentTenant, storageMode, setStorageMode, toast } = useApp();
  const [classes, setClasses] = useState<SchoolClass[]>(() => classService.getAll(currentTenant.id));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const students = studentService.getAll(currentTenant.id);
  const teachers = teacherStaffService.getAll(currentTenant.id);

  // Search & Filters
  const [search, setSearch] = useState('');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [selectedClassForView, setSelectedClassForView] = useState<SchoolClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    gradeNumeric: 1,
    sections: 'A, B',
    classTeacherName: '',
    capacity: 60,
    monthlyTuitionFee: 4500
  });

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await classApiAdapter.getClasses(currentTenant.id, storageMode);
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
      setApiError((err as Error).message || 'Failed to load classes from server');
      // If remote failed, fallback to local so the UI is not empty, but display error
      setClasses(classService.getAll(currentTenant.id));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant.id, storageMode]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const refreshList = () => {
    loadClasses();
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(search.toLowerCase()) ||
    (cls.classTeacherName && cls.classTeacherName.toLowerCase().includes(search.toLowerCase())) ||
    cls.sections.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingClass(null);
    setValidationErrors([]);
    setApiError(null);
    setFormData({
      name: '',
      gradeNumeric: classes.length > 0 ? Math.max(...classes.map(c => c.gradeNumeric)) + 1 : 1,
      sections: 'A, B',
      classTeacherName: teachers[0]?.name || '',
      capacity: 60,
      monthlyTuitionFee: 4500
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setValidationErrors([]);
    setApiError(null);
    setFormData({
      name: cls.name,
      gradeNumeric: cls.gradeNumeric,
      sections: cls.sections.join(', '),
      classTeacherName: cls.classTeacherName || '',
      capacity: cls.capacity,
      monthlyTuitionFee: cls.monthlyTuitionFee
    });
    setIsAddEditModalOpen(true);
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Class name/title is required');
    if (!formData.sections.trim()) errors.push('At least one section is required (e.g. A, B)');
    if (formData.capacity <= 0) errors.push('Capacity must be greater than zero');
    if (formData.monthlyTuitionFee < 0) errors.push('Monthly tuition fee cannot be negative');
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const sectionsArray = formData.sections.split(',').map(s => s.trim()).filter(Boolean);
    setIsSaving(true);
    setApiError(null);

    try {
      if (editingClass) {
        await classApiAdapter.updateClass(
          editingClass.id,
          {
            name: formData.name.trim(),
            gradeNumeric: Number(formData.gradeNumeric),
            sections: sectionsArray,
            classTeacherName: formData.classTeacherName.trim(),
            capacity: Number(formData.capacity),
            monthlyTuitionFee: Number(formData.monthlyTuitionFee)
          },
          currentTenant.id,
          storageMode
        );
        toast(`Class ${formData.name} updated successfully`, 'success');
      } else {
        await classApiAdapter.createClass(
          {
            tenantId: currentTenant.id,
            name: formData.name.trim(),
            gradeNumeric: Number(formData.gradeNumeric),
            sections: sectionsArray,
            classTeacherName: formData.classTeacherName.trim(),
            capacity: Number(formData.capacity),
            totalStudents: 0,
            monthlyTuitionFee: Number(formData.monthlyTuitionFee)
          },
          storageMode
        );
        toast(`Class ${formData.name} created successfully`, 'success');
      }

      await loadClasses();
      setIsAddEditModalOpen(false);
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    setIsSaving(true);
    setApiError(null);

    try {
      await classApiAdapter.deleteClass(classToDelete.id, currentTenant.id, storageMode);
      toast(`Class ${classToDelete.name} deleted successfully`, 'info');
      setClassToDelete(null);
      await loadClasses();
    } catch (err) {
      // Relational error or failure (e.g. students enrolled)
      const msg = (err as Error).message;
      setApiError(msg);
      toast(`Action blocked: ${msg}`, 'error');
      setClassToDelete(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Classes & Sections Management</h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                storageMode === 'cloudflare_d1'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>{storageMode === 'cloudflare_d1' ? 'Cloudflare D1 Mode' : 'Local Demo Mode'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure academic grades, section capacities, incharge faculty, and tuition rates ({classes.length} Classes)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadClasses()}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs transition hover:bg-slate-50"
            title="Refresh classes list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Class</span>
          </button>
        </div>
      </div>

      {/* Actionable Error Alert if Remote Error occurs */}
      {apiError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Relational / API Constraint Error:</strong>
              <span className="leading-relaxed">{apiError}</span>
            </div>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by class name, teacher, section..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No classes found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or create a new academic grade.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map(cls => {
            const classStudents = students.filter(s => s.classId === cls.id);
            const classStudentsCount = classStudents.length;
            const utilizationPct = cls.capacity > 0 ? Math.min(100, Math.round((classStudentsCount / cls.capacity) * 100)) : 0;

            return (
              <div 
                key={cls.id} 
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center shadow-xs">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{cls.name}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">Grade {cls.gradeNumeric}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold font-mono border border-emerald-200">
                      PKR {cls.monthlyTuitionFee.toLocaleString()}/mo
                    </span>
                  </div>

                  <div className="space-y-2 py-2.5 border-y border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Incharge Teacher:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]" title={cls.classTeacherName}>
                        {cls.classTeacherName || 'Not Assigned'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Enrolled Students:</span>
                      <span className="font-bold text-blue-900">
                        {classStudentsCount} / {cls.capacity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Sections ({cls.sections.length}):</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                        {cls.sections.map((sec, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200">
                            {sec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 pt-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          utilizationPct > 90 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${utilizationPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Capacity utilization</span>
                      <span className="font-semibold text-slate-600">{utilizationPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedClassForView(cls)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Students ({classStudentsCount})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      title="Edit Class"
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setClassToDelete(cls)}
                      title="Delete Class"
                      className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingClass ? `Edit Class: ${editingClass.name}` : 'Add Academic Class'}
        subtitle="Specify class title, grade numeric, section capacities, and monthly tuition rate in PKR"
        maxWidth="md"
      >
        <form onSubmit={handleSaveClass} className="space-y-4 text-xs text-slate-800">
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Please correct errors:</span>
              </div>
              <ul className="list-disc list-inside text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">Class Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Class 8 or Matric Part 1"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Numeric Grade</label>
              <input
                type="number"
                value={formData.gradeNumeric}
                onChange={e => setFormData({ ...formData, gradeNumeric: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Monthly Tuition Fee (PKR) *</label>
              <input
                type="number"
                required
                value={formData.monthlyTuitionFee}
                onChange={e => setFormData({ ...formData, monthlyTuitionFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Sections (comma-separated) *</label>
              <input
                type="text"
                required
                placeholder="A, B, C (Science)"
                value={formData.sections}
                onChange={e => setFormData({ ...formData, sections: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. A, B or Rose, Tulip</span>
            </div>
            <div>
              <label className="block font-semibold mb-1">Maximum Student Capacity</label>
              <input
                type="number"
                required
                value={formData.capacity}
                onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Class Teacher Incharge</label>
            <select
              value={formData.classTeacherName}
              onChange={e => setFormData({ ...formData, classTeacherName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="">Select Incharge Teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.name}>{t.name} ({t.designation})</option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition"
            >
              {editingClass ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Class Details & Enrolled Students Modal */}
      {selectedClassForView && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClassForView(null)}
          title={`Class Roster: ${selectedClassForView.name}`}
          subtitle={`Grade ${selectedClassForView.gradeNumeric} • Incharge: ${selectedClassForView.classTeacherName || 'Not Assigned'}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Monthly Fee</span>
                <span className="font-bold font-mono text-emerald-800">
                  PKR {selectedClassForView.monthlyTuitionFee.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Active Sections</span>
                <div className="flex gap-1 mt-0.5">
                  {selectedClassForView.sections.map((s, i) => (
                    <span key={i} className="px-1.5 py-0.2 bg-white rounded border border-slate-200 text-[10px] font-mono font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Enrolled Students</span>
                <span className="font-bold text-blue-900 font-mono">
                  {students.filter(s => s.classId === selectedClassForView.id).length} of {selectedClassForView.capacity}
                </span>
              </div>
            </div>

            {/* Students Table */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Enrolled Students in this Class</h4>
              {students.filter(s => s.classId === selectedClassForView.id).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                  <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No students enrolled in {selectedClassForView.name} yet.</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Roll No</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">Section</th>
                        <th className="py-2 px-3">Father Name</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.filter(s => s.classId === selectedClassForView.id).map(st => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{st.rollNo}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{st.name}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{st.sectionName}</td>
                          <td className="py-2 px-3 text-slate-600">{st.fatherName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{st.parentContact}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClassForView(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setClassToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Class: ${classToDelete.name}`}
          message={
            students.filter(s => s.classId === classToDelete.id).length > 0
              ? `WARNING: There are ${students.filter(s => s.classId === classToDelete.id).length} students actively enrolled in ${classToDelete.name}. Deleting this class may orphan their academic records. Are you sure you wish to proceed?`
              : `Are you sure you want to delete ${classToDelete.name}? This action cannot be undone.`
          }
          confirmLabel="Yes, Delete Class"
          variant="danger"
        />
      )}
    </div>
  );
};

export const SubjectsListPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>(() => subjectService.getAll(currentTenant.id));
  const classes = classService.getAll(currentTenant.id);
  const teachers = teacherStaffService.getAll(currentTenant.id);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    classId: classes[0]?.id || '',
    teacherName: teachers[0]?.name || '',
    totalMarks: 75,
    passingMarks: 25
  });

  const refreshList = () => {
    setSubjects(subjectService.getAll(currentTenant.id));
  };

  const filtered = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(search.toLowerCase()));
    const matchesClass = classFilter === 'all' || s.classId === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      classId: classes[0]?.id || '',
      teacherName: teachers[0]?.name || '',
      totalMarks: 75,
      passingMarks: 25
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      classId: sub.classId,
      teacherName: sub.teacherName || '',
      totalMarks: sub.totalMarks,
      passingMarks: sub.passingMarks
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSubject) {
      subjectService.update(editingSubject.id, {
        name: formData.name.trim(),
        code: formData.code.trim() || `${formData.name.slice(0, 3).toUpperCase()}-01`,
        classId: formData.classId,
        teacherName: formData.teacherName,
        totalMarks: Number(formData.totalMarks),
        passingMarks: Number(formData.passingMarks)
      });
      toast(`Subject ${formData.name} updated`, 'success');
    } else {
      subjectService.create({
        tenantId: currentTenant.id,
        name: formData.name.trim(),
        code: formData.code.trim() || `${formData.name.slice(0, 3).toUpperCase()}-01`,
        classId: formData.classId,
        teacherName: formData.teacherName,
        totalMarks: Number(formData.totalMarks),
        passingMarks: Number(formData.passingMarks)
      });
      toast(`Subject ${formData.name} added to curriculum`, 'success');
    }

    refreshList();
    setIsAddEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!subjectToDelete) return;
    subjectService.delete(subjectToDelete.id);
    refreshList();
    toast(`Subject ${subjectToDelete.name} deleted`, 'info');
    setSubjectToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Subjects Curriculum</h1>
          <p className="text-xs text-slate-500">
            Subject syllabus codes, assigned faculty specialists, and examination passing criteria ({subjects.length} Subjects)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by subject name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-3">Subject Code</th>
                <th className="py-3 px-3">Class Assigned</th>
                <th className="py-3 px-3">Assigned Faculty</th>
                <th className="py-3 px-3">Total Marks</th>
                <th className="py-3 px-3">Passing Marks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No subjects found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(s => {
                  const cls = classes.find(c => c.id === s.classId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{s.code}</td>
                      <td className="py-3 px-3 font-medium text-blue-900">{cls?.name || 'Class 9'}</td>
                      <td className="py-3 px-3 text-slate-700">{s.teacherName || 'Not Assigned'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{s.totalMarks}</td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{s.passingMarks}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Subject"
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSubjectToDelete(s)}
                            title="Delete Subject"
                            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add Subject to Curriculum'}
        subtitle="Define subject marks, passing criteria, and teacher specialist"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Subject Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Computer Science or Tarjuma-tul-Quran"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Subject Code</label>
              <input
                type="text"
                placeholder="CS-09"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Class Assigned</label>
              <select
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Total Exam Marks</label>
              <input
                type="number"
                value={formData.totalMarks}
                onChange={e => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Passing Marks</label>
              <input
                type="number"
                value={formData.passingMarks}
                onChange={e => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Assigned Teacher Specialist</label>
            <select
              value={formData.teacherName}
              onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="">Select Faculty Member</option>
              {teachers.map(t => (
                <option key={t.id} value={t.name}>{t.name} ({t.qualification})</option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs"
            >
              {editingSubject ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setSubjectToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Subject: ${subjectToDelete.name}`}
          message={`Are you sure you want to remove ${subjectToDelete.name} (${subjectToDelete.code}) from the curriculum?`}
          confirmLabel="Yes, Delete Subject"
          variant="danger"
        />
      )}
    </div>
  );
};
