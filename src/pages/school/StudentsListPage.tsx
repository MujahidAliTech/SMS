import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { studentService, classService, parentService, exportService, feeService, examService } from '../../services';
import { studentApiAdapter, classApiAdapter } from '../../services/dataAdapter';
import { Student, SchoolClass } from '../../types';
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
  AlertCircle,
  Camera,
  Upload,
  Database,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';

export const StudentsListPage: React.FC = () => {
  const { currentTenant, storageMode, setStorageMode, toast } = useApp();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>(() => classService.getAll(currentTenant.id));
  const parents = parentService.getAll(currentTenant.id);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Photo upload state inside form
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    fatherName: '',
    motherName: '',
    gender: 'Male',
    dob: '2012-01-01',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionNo: '',
    classId: '',
    className: '',
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

  // Load students from adapter (Cloudflare D1 or Local Storage)
  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await studentApiAdapter.getStudents(
        currentTenant.id,
        {
          search: search || undefined,
          classId: classFilter !== 'all' ? classFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          gender: genderFilter !== 'all' ? genderFilter : undefined
        },
        storageMode
      );
      setStudents(data);

      // Also ensure classes are available
      try {
        const classData = await classApiAdapter.getClasses(currentTenant.id, storageMode);
        if (classData && classData.length > 0) setClasses(classData);
      } catch {
        setClasses(classService.getAll(currentTenant.id));
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      const msg = (err as Error).message || 'Failed to fetch student records';
      setApiError(msg);
      // Fallback display so interface doesn't completely break
      setStudents(studentService.getAll(currentTenant.id));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant.id, storageMode, search, classFilter, statusFilter, genderFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const refreshList = () => {
    loadStudents();
  };

  // Client-side filtering fallback
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
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
    setApiError(null);
    setFormPhotoFile(null);
    setFormPhotoPreview(null);

    const firstClass = classes[0] || { id: 'class-9', name: 'Class 9', monthlyTuitionFee: 5000 };
    setFormData({
      name: '',
      fatherName: '',
      motherName: '',
      gender: 'Male',
      dob: '2012-01-01',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionNo: `BFS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      classId: firstClass.id,
      className: firstClass.name,
      sectionId: 'sec-a',
      sectionName: 'A (Science)',
      rollNo: `09-${Math.floor(10 + Math.random() * 80)}`,
      parentContact: '+92 300 1234567',
      emergencyContact: '+92 300 1234567',
      address: `${currentTenant.branding.city}, Pakistan`,
      bFormOrCnic: '35202-0000000-1',
      previousSchool: '',
      status: 'active',
      monthlyFee: firstClass.monthlyTuitionFee || 5000
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setValidationErrors([]);
    setApiError(null);
    setFormPhotoFile(null);
    setFormPhotoPreview(student.photoUrl || null);
    setFormData(student);
    setIsAddModalOpen(true);
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.name?.trim()) errors.push('Student full name is required');
    if (!formData.fatherName?.trim()) errors.push("Father / Guardian name is required");
    if (!formData.admissionNo?.trim()) errors.push('Admission number is required');
    if (!formData.classId) errors.push('Academic class selection is required');
    if (!formData.rollNo?.trim()) errors.push('Roll number is required');
    if (!formData.parentContact?.trim()) errors.push('Parent contact phone number is required');
    if (formData.monthlyFee === undefined || formData.monthlyFee < 0) {
      errors.push('Monthly tuition fee must be a valid positive amount in PKR');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Only JPEG, PNG, and WebP images are allowed', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast('Profile photo must be less than 2 MB', 'error');
      return;
    }

    setFormPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFormPhotoPreview(previewUrl);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);
    const chosenClass = classes.find(c => c.id === formData.classId) || classes[0] || { id: 'class-9', name: 'Class 9', monthlyTuitionFee: 5000 };

    try {
      let savedStudent: Student;

      if (editingStudent) {
        savedStudent = await studentApiAdapter.updateStudent(
          editingStudent.id,
          {
            ...formData,
            className: chosenClass.name,
            classId: chosenClass.id
          },
          currentTenant.id,
          storageMode
        );
        toast(`Updated record for student ${formData.name}`, 'success');
      } else {
        const pId = parents[0]?.id || 'parent-1';
        savedStudent = await studentApiAdapter.createStudent(
          {
            tenantId: currentTenant.id,
            admissionNo: formData.admissionNo || `BFS-${Date.now().toString().slice(-4)}`,
            name: formData.name!.trim(),
            fatherName: formData.fatherName!.trim(),
            motherName: formData.motherName || '',
            gender: formData.gender as any || 'Male',
            dob: formData.dob || '2012-01-01',
            admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
            classId: chosenClass.id,
            className: chosenClass.name,
            sectionId: formData.sectionId || 'sec-a',
            sectionName: formData.sectionName || 'A',
            rollNo: formData.rollNo!.trim(),
            parentContact: formData.parentContact!.trim(),
            emergencyContact: formData.emergencyContact || formData.parentContact,
            address: formData.address || 'Pakistan',
            bFormOrCnic: formData.bFormOrCnic || '35202-0000000-1',
            previousSchool: formData.previousSchool || '',
            status: formData.status as any || 'active',
            parentId: pId,
            monthlyFee: Number(formData.monthlyFee) || chosenClass.monthlyTuitionFee
          },
          storageMode
        );
        toast(`Successfully enrolled student ${formData.name}`, 'success');
      }

      // If a photo was selected, upload it to Cloudflare R2 now
      if (formPhotoFile && savedStudent.id) {
        try {
          await studentApiAdapter.uploadPhoto(savedStudent.id, formPhotoFile, currentTenant.id, storageMode);
          toast('Profile picture uploaded to Cloudflare R2 storage', 'success');
        } catch (photoErr) {
          console.warn('Profile picture upload failed:', photoErr);
          toast(`Student created, but photo upload failed: ${(photoErr as Error).message}`, 'error');
        }
      }

      await loadStudents();
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save student:', err);
      const msg = err.message || 'Failed to save student record';
      setApiError(msg);
      toast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);
    setApiError(null);

    try {
      await studentApiAdapter.deleteStudent(studentToDelete.id, currentTenant.id, storageMode);
      toast(`Student ${studentToDelete.name} deleted from records`, 'info');
      setStudentToDelete(null);
      await loadStudents();
    } catch (err: any) {
      console.error('Deletion blocked:', err);
      const msg = err.message || 'Failed to delete student';
      setApiError(msg);
      toast(`Deletion blocked: ${msg}`, 'error');
      setStudentToDelete(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct photo upload from Profile Modal
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudentForProfile) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Please upload a valid JPEG, PNG, or WebP image', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast('Image exceeds 2 MB limit', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const res = await studentApiAdapter.uploadPhoto(
        selectedStudentForProfile.id,
        file,
        currentTenant.id,
        storageMode
      );
      toast('Profile photo updated in Cloudflare R2 storage', 'success');
      setSelectedStudentForProfile(prev => prev ? { ...prev, photoUrl: res.photoUrl } : null);
      await loadStudents();
    } catch (err: any) {
      toast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleProfilePhotoDelete = async () => {
    if (!selectedStudentForProfile) return;
    setIsUploadingPhoto(true);
    try {
      await studentApiAdapter.deletePhoto(
        selectedStudentForProfile.id,
        currentTenant.id,
        storageMode
      );
      toast('Profile picture removed from R2 storage', 'info');
      setSelectedStudentForProfile(prev => prev ? { ...prev, photoUrl: undefined, photoKey: undefined } : null);
      await loadStudents();
    } catch (err: any) {
      toast(err.message || 'Failed to delete photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
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
          <h1 className="text-xl font-bold text-slate-900">Student Admissions & Enrollment</h1>
          <p className="text-xs text-slate-500">
            Active school roster, student profiles, and multi-tenant Cloudflare D1/R2 management ({students.length} Total Enrolled)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Storage Mode Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs text-xs">
            <button
              onClick={() => setStorageMode('cloudflare_d1')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition ${
                storageMode === 'cloudflare_d1'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cloudflare Worker, D1 Database & R2 Storage"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Cloudflare D1/R2</span>
            </button>
            <button
              onClick={() => setStorageMode('local_storage')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                storageMode === 'local_storage'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Local Storage (Mock Demo Mode)"
            >
              <span>Local Demo</span>
            </button>
          </div>

          <button
            onClick={refreshList}
            disabled={isLoading}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition disabled:opacity-50"
            title="Refresh student roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Admit Student</span>
          </button>
        </div>
      </div>

      {/* API Error Notification Banner */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Backend Communication Notice</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{apiError}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={refreshList}
              className="px-2 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded font-semibold text-[10px]"
            >
              Retry
            </button>
            <button
              onClick={() => setApiError(null)}
              className="p-1 text-rose-600 hover:text-rose-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search student by name, roll no, admission no, father name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="struck_off">Struck Off</option>
          </select>

          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600 mb-2" />
                    <span>Loading student records from {storageMode === 'cloudflare_d1' ? 'Cloudflare D1' : 'Local Storage'}...</span>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
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
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              // Fallback on load error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
                            {student.name.charAt(0)}
                          </div>
                        )}
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
                      PKR {student.monthlyFee?.toLocaleString() || '0'}
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
                          title="View Complete Student Profile & Photo"
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
                          title="Delete Student from Records"
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
        subtitle="Complete enrollment file including father information, B-Form, class assignment, and profile picture"
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

          {/* Photo Picker Section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
            <div className="relative group">
              {formPhotoPreview ? (
                <img
                  src={formPhotoPreview}
                  alt="Student Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-600 shadow-2xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-500 font-bold flex items-center justify-center border border-slate-300">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>
            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Student Profile Picture (Cloudflare R2)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Supported formats: JPEG, PNG, WebP (Max 2 MB). Stored securely in R2.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Choose Photo</span>
                </button>
                {formPhotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormPhotoFile(null);
                      setFormPhotoPreview(null);
                    }}
                    className="px-2 py-1 text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                  >
                    Clear Photo
                  </button>
                )}
              </div>
            </div>
          </div>

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
              <label className="block font-semibold mb-1">Admission Number *</label>
              <input
                type="text"
                required
                placeholder="BFS-2026-101"
                value={formData.admissionNo || ''}
                onChange={e => setFormData({ ...formData, admissionNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Academic Class *</label>
              <select
                value={formData.classId || ''}
                onChange={e => {
                  const c = classes.find(cls => cls.id === e.target.value);
                  setFormData({
                    ...formData,
                    classId: e.target.value,
                    className: c?.name || '',
                    monthlyFee: c?.monthlyTuitionFee || formData.monthlyFee
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
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
                placeholder="e.g. A"
                value={formData.sectionName || 'A'}
                onChange={e => setFormData({ ...formData, sectionName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Roll Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 09-12"
                value={formData.rollNo || ''}
                onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Parent Phone *</label>
              <input
                type="text"
                required
                placeholder="+92 300 1234567"
                value={formData.parentContact || ''}
                onChange={e => setFormData({ ...formData, parentContact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">B-Form / CNIC</label>
              <input
                type="text"
                placeholder="35202-0000000-1"
                value={formData.bFormOrCnic || ''}
                onChange={e => setFormData({ ...formData, bFormOrCnic: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Monthly Tuition Fee (PKR)</label>
              <input
                type="number"
                min="0"
                value={formData.monthlyFee || 0}
                onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Enrollment Status</label>
              <select
                value={formData.status || 'active'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="struck_off">Struck Off</option>
                <option value="alumni">Alumni</option>
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
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : editingStudent ? 'Save Changes' : 'Complete Admission'}</span>
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
        message={
          studentToDelete
            ? `Are you sure you want to permanently delete student "${studentToDelete.name}" (Roll #${studentToDelete.rollNo}, Class ${studentToDelete.className})? Note: Deletion is blocked if active fee invoices or examination results exist; consider changing status to 'inactive' or 'alumni' instead.`
            : ''
        }
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
            {/* Header Identity Card with R2 Photo Upload Action */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="relative group shrink-0">
                {selectedStudentForProfile.photoUrl ? (
                  <img
                    src={selectedStudentForProfile.photoUrl}
                    alt={selectedStudentForProfile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-700 text-white font-bold text-3xl flex items-center justify-center shrink-0">
                    {selectedStudentForProfile.name.charAt(0)}
                  </div>
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-bold text-slate-900">{selectedStudentForProfile.name}</h3>
                <p className="text-slate-600">Father: {selectedStudentForProfile.fatherName}</p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1.5 text-[11px]">
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

                {/* Cloudflare R2 Photo Action Buttons */}
                <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                  <input
                    type="file"
                    ref={profilePhotoInputRef}
                    onChange={handleProfilePhotoUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <button
                    onClick={() => profilePhotoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded text-[11px] shadow-2xs transition disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedStudentForProfile.photoUrl ? 'Replace Photo' : 'Upload Photo'}</span>
                  </button>
                  {selectedStudentForProfile.photoUrl && (
                    <button
                      onClick={handleProfilePhotoDelete}
                      disabled={isUploadingPhoto}
                      className="px-2 py-1 text-rose-600 hover:text-rose-800 font-medium text-[11px] transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
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
