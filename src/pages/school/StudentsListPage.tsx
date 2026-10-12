import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { studentService, classService, parentService, exportService, feeService, examService, attendanceService } from '../../services';
import { Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Phone,
  User,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const StudentsListPage: React.FC = () => {
  const { currentTenant, toast } = useApp();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const [students, setStudents] = useState<Student[]>(() => studentService.getAll(currentTenant.id));
  const classes = classService.getAll(currentTenant.id);
  const parents = parentService.getAll(currentTenant.id);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    fatherName: '',
    motherName: '',
    gender: 'Male',
    dob: '2012-01-01',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionNo: '',
    classId: classes[0]?.id || 'class-9',
    className: classes[0]?.name || 'Class 9',
    sectionId: 'sec-a',
    sectionName: 'A (Science)',
    rollNo: '',
    parentContact: '+92 300 1234567',
    emergencyContact: '+92 300 1234567',
    address: 'Lahore, Pakistan',
    bFormOrCnic: '35202-0000000-1',
    previousSchool: '',
    status: 'active',
    monthlyFee: 5000
  });

  const refreshList = () => {
    setStudents(studentService.getAll(currentTenant.id));
  };

  useEffect(() => {
    refreshList();
  }, [currentTenant.id]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      s.fatherName.toLowerCase().includes(search.toLowerCase()) ||
      s.parentContact.includes(search);
    const matchesClass = classFilter === 'all' || s.classId === classFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
    return matchesSearch && matchesClass && matchesStatus && matchesGender;
  });

  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setValidationErrors([]);
    setFormData({
      name: '',
      fatherName: '',
      motherName: '',
      gender: 'Male',
      dob: '2012-01-01',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionNo: `BFS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      classId: classes[0]?.id || 'class-9',
      className: classes[0]?.name || 'Class 9',
      sectionId: 'sec-a',
      sectionName: 'A (Science)',
      rollNo: `09-${Math.floor(10 + Math.random() * 80)}`,
      parentContact: '+92 300 1234567',
      emergencyContact: '+92 300 1234567',
      address: `${currentTenant.branding.city}, Pakistan`,
      bFormOrCnic: '35202-0000000-1',
      previousSchool: '',
      status: 'active',
      monthlyFee: classes[0]?.monthlyTuitionFee || 5000
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setValidationErrors([]);
    setFormData(student);
    setIsAddModalOpen(true);
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.name?.trim()) errors.push('Student full name is required');
    if (!formData.fatherName?.trim()) errors.push("Father / Guardian name is required");
    if (!formData.rollNo?.trim()) errors.push('Roll number is required');
    if (!formData.parentContact?.trim()) errors.push('Parent contact phone number is required');
    if (formData.monthlyFee === undefined || formData.monthlyFee < 0) errors.push('Monthly tuition fee must be a valid positive amount in PKR');
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const chosenClass = classes.find(c => c.id === formData.classId) || classes[0];

    try {
      if (editingStudent) {
        studentService.update(editingStudent.id, {
          ...formData,
          className: chosenClass.name
        });
        toast(`Updated record for student ${formData.name}`, 'success');
      } else {
        const pId = parents[0]?.id || 'parent-1';
        studentService.create({
          tenantId: currentTenant.id,
          admissionNo: formData.admissionNo || `BFS-${Date.now().toString().slice(-4)}`,
          name: formData.name!,
          fatherName: formData.fatherName!,
          motherName: formData.motherName || '',
          gender: formData.gender as any || 'Male',
          dob: formData.dob || '2012-01-01',
          admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
          classId: chosenClass.id,
          className: chosenClass.name,
          sectionId: formData.sectionId || 'sec-a',
          sectionName: formData.sectionName || 'A',
          rollNo: formData.rollNo!,
          parentContact: formData.parentContact!,
          emergencyContact: formData.emergencyContact || formData.parentContact,
          address: formData.address || 'Pakistan',
          bFormOrCnic: formData.bFormOrCnic || '35202-0000000-1',
          previousSchool: formData.previousSchool || '',
          status: formData.status as any || 'active',
          parentId: pId,
          monthlyFee: Number(formData.monthlyFee) || chosenClass.monthlyTuitionFee
        });
        toast(`Successfully enrolled student ${formData.name}`, 'success');
      }

      refreshList();
      setIsAddModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Failed to save student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!studentToDelete) return;
    studentService.delete(studentToDelete.id);
    refreshList();
    toast(`Student ${studentToDelete.name} removed from active roster`, 'info');
    setStudentToDelete(null);
  };

  const handleExportCsv = () => {
    const headers = ['Admission No', 'Name', 'Father Name', 'Class', 'Roll No', 'Phone', 'B-Form / CNIC', 'Monthly Fee (PKR)', 'Status'];
    const rows = filteredStudents.map(s => [
      s.admissionNo,
      s.name,
      s.fatherName,
      s.className,
      s.rollNo,
      s.parentContact,
      s.bFormOrCnic,
      s.monthlyFee,
      s.status
    ]);
    exportService.downloadCsv(`${currentTenant.slug}_students_roster`, headers, rows);
    toast('Student records exported to CSV successfully', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Directory & Profiles</h1>
          <p className="text-xs text-slate-500">
            Official student registry for Session {currentTenant.branding.academicSession} ({students.length} Total Registered)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Admit New Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by student name, roll no, father name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={classFilter}
            onChange={e => { setClassFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Classes ({classes.length})</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={e => { setGenderFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="struck_off">Struck Off</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-3">Class & Section</th>
                <th className="py-3 px-3">Roll No</th>
                <th className="py-3 px-3">Father & Contact</th>
                <th className="py-3 px-3">Monthly Fee</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No students matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{student.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{student.admissionNo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {student.className}
                      <span className="text-[10px] text-slate-400 block">Sec {student.sectionName}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-blue-900">
                      {student.rollNo}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-800 font-medium block">{student.fatherName}</span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.parentContact}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      PKR {student.monthlyFee.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        student.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStudentForProfile(student)}
                          title="View Complete Student Profile"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(student)}
                          title="Edit Student Info"
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(student)}
                          title="Delete / Strike Off Student"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
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

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStudents.length}
          itemsPerPage={pageSize}
          onPageChange={page => setCurrentPage(page)}
        />
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.name}` : 'Admit New Student'}
        subtitle="Complete enrollment file including father information, B-Form, and class assignment"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs text-slate-800">
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Please complete the required fields:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-rose-700">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Student Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Muhammad Bilal"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Father's Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Mehmood"
                value={formData.fatherName || ''}
                onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Gender</label>
              <select
                value={formData.gender || 'Male'}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob || '2012-01-01'}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">B-Form / CNIC No</label>
              <input
                type="text"
                placeholder="35202-xxxxxxx-x"
                value={formData.bFormOrCnic || ''}
                onChange={e => setFormData({ ...formData, bFormOrCnic: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Class Assigned *</label>
              <select
                value={formData.classId || classes[0]?.id}
                onChange={e => {
                  const sel = classes.find(c => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    classId: e.target.value,
                    className: sel?.name || '',
                    monthlyFee: sel?.monthlyTuitionFee || 5000
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Section</label>
              <input
                type="text"
                placeholder="A (Science)"
                value={formData.sectionName || ''}
                onChange={e => setFormData({ ...formData, sectionName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Roll Number *</label>
              <input
                type="text"
                placeholder="09-15"
                required
                value={formData.rollNo || ''}
                onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Father / Guardian Phone *</label>
              <input
                type="tel"
                required
                placeholder="+92 300 1234567"
                value={formData.parentContact || ''}
                onChange={e => setFormData({ ...formData, parentContact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Monthly Tuition Fee (PKR) *</label>
              <input
                type="number"
                required
                min={0}
                placeholder="5500"
                value={formData.monthlyFee || 5000}
                onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Status</label>
              <select
                value={formData.status || 'active'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="struck_off">Struck Off</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Previous School Attended</label>
              <input
                type="text"
                placeholder="e.g. Crescent Model School"
                value={formData.previousSchool || ''}
                onChange={e => setFormData({ ...formData, previousSchool: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Residential Address</label>
            <input
              type="text"
              placeholder="House #, Street, Colony, City"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingStudent ? 'Save Changes' : 'Complete Admission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Student Removal"
        message={studentToDelete ? `Are you sure you want to remove student "${studentToDelete.name}" (Roll #${studentToDelete.rollNo}, Class ${studentToDelete.className})? This will remove them from the active classroom register.` : ''}
        confirmLabel="Yes, Remove Student"
      />

      {/* Student 360-degree Profile Modal */}
      {selectedStudentForProfile && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudentForProfile(null)}
          title={`Student Profile: ${selectedStudentForProfile.name}`}
          subtitle={`Admission No: ${selectedStudentForProfile.admissionNo} • ${selectedStudentForProfile.className}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-slate-800">
            {/* Header Identity Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-blue-700 text-white font-bold text-2xl flex items-center justify-center shrink-0">
                {selectedStudentForProfile.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">{selectedStudentForProfile.name}</h3>
                <p className="text-slate-600">Father: {selectedStudentForProfile.fatherName}</p>
                <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold">
                    {selectedStudentForProfile.className} ({selectedStudentForProfile.sectionName})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono">
                    Roll: {selectedStudentForProfile.rollNo}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                    {selectedStudentForProfile.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date of Birth</span>
                <span className="font-medium">{selectedStudentForProfile.dob}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">B-Form / CNIC</span>
                <span className="font-mono">{selectedStudentForProfile.bFormOrCnic}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Parent Contact</span>
                <span className="font-mono">{selectedStudentForProfile.parentContact}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monthly Fee</span>
                <span className="font-bold text-blue-900 font-mono">PKR {selectedStudentForProfile.monthlyFee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Admission Date</span>
                <span>{selectedStudentForProfile.admissionDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Address</span>
                <span className="truncate block" title={selectedStudentForProfile.address}>{selectedStudentForProfile.address}</span>
              </div>
            </div>

            {/* Fee Invoices History */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-700" />
                Fee Challans for this Student
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Invoice No</th>
                      <th className="py-2 px-2">Month</th>
                      <th className="py-2 px-2">Total Amount</th>
                      <th className="py-2 px-2">Paid</th>
                      <th className="py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeService.getInvoices(currentTenant.id)
                      .filter(inv => inv.studentId === selectedStudentForProfile.id)
                      .map(inv => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono">{inv.invoiceNo}</td>
                          <td className="py-2 px-2 font-medium">{inv.feeMonth}</td>
                          <td className="py-2 px-2 font-mono">PKR {inv.totalAmount.toLocaleString()}</td>
                          <td className="py-2 px-2 font-mono">PKR {inv.amountPaid.toLocaleString()}</td>
                          <td className="py-2 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exam Results History */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                Exam Progress History
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Exam Term</th>
                      <th className="py-2 px-2">Obtained / Total</th>
                      <th className="py-2 px-2">Percentage</th>
                      <th className="py-2 px-2">Grade</th>
                      <th className="py-2 px-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examService.getResults(currentTenant.id, undefined, selectedStudentForProfile.id).map(r => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-medium">{r.examTitle}</td>
                        <td className="py-2 px-2 font-mono font-bold">{r.totalObtained} / {r.totalMarks}</td>
                        <td className="py-2 px-2 font-mono text-blue-900">{r.percentage}%</td>
                        <td className="py-2 px-2 font-bold text-emerald-700">{r.grade}</td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudentForProfile(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-semibold rounded-lg"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
