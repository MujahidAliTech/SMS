import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { parentService, teacherStaffService, studentService, classService } from '../../services';
import { Parent, TeacherStaff } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  Users,
  Briefcase,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  DollarSign,
  Filter,
  BookOpen,
  Calendar,
  Layers,
  AlertCircle
} from 'lucide-react';

export const ParentsListPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [parents, setParents] = useState<Parent[]>(() => parentService.getAll(currentTenant.id));
  const students = studentService.getAll(currentTenant.id);
  const [search, setSearch] = useState('');

  const filtered = parents.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.cnic.includes(search) ||
    p.occupation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parent Directory</h1>
          <p className="text-xs text-slate-500">
            Registered fathers and guardians with multi-child linkages ({parents.length} registered)
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search parent by name, phone, or CNIC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const linkedStudents = students.filter(s => p.childrenIds.includes(s.id) || s.parentId === p.id);

          return (
            <div key={p.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">CNIC: {p.cnic}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 py-2 border-y border-slate-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{p.phone}</span>
                  </div>
                  {p.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">Occupation:</strong> {p.occupation}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate" title={p.address}>
                    <strong className="text-slate-700">Address:</strong> {p.address}
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Linked Children ({linkedStudents.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedStudents.map(child => (
                      <span
                        key={child.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-medium"
                      >
                        <GraduationCap className="w-3 h-3 text-blue-700" />
                        {child.name} ({child.className})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TeachersStaffListPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const classes = classService.getAll(currentTenant.id);
  const [staffList, setStaffList] = useState<TeacherStaff[]>(() => teacherStaffService.getAll(currentTenant.id));
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<TeacherStaff | null>(null);
  const [selectedStaffForView, setSelectedStaffForView] = useState<TeacherStaff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<TeacherStaff | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<TeacherStaff>>({
    name: '',
    teacherCode: '',
    role: 'teacher',
    designation: 'Senior Subject Specialist',
    qualification: 'M.Sc / B.Ed',
    subjects: ['Mathematics'],
    assignedClasses: ['Class 9', 'Class 10'],
    joiningDate: new Date().toISOString().split('T')[0],
    phone: '+92 300 1234567',
    email: 'teacher@school.edu.pk',
    cnic: '35202-0000000-1',
    employmentStatus: 'active',
    salaryMonthly: 50000
  });

  const refreshList = () => {
    setStaffList(teacherStaffService.getAll(currentTenant.id));
  };

  // Derive unique subjects across all staff
  const allKnownSubjects = Array.from(
    new Set(staffList.flatMap(s => s.subjects || []).filter(Boolean))
  ).sort();

  const filtered = staffList.filter(t => {
    const code = t.teacherCode || t.id;
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.designation.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      code.toLowerCase().includes(search.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(search.toLowerCase())) ||
      (t.subjects && t.subjects.some(s => s.toLowerCase().includes(search.toLowerCase())));

    const matchesRole = roleFilter === 'all' || t.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || t.employmentStatus === statusFilter;
    const matchesSubject = subjectFilter === 'all' || (t.subjects && t.subjects.includes(subjectFilter));

    return matchesSearch && matchesRole && matchesStatus && matchesSubject;
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setValidationErrors([]);
    setFormData({
      name: '',
      teacherCode: `TCH-${Math.floor(10 + Math.random() * 90)}`,
      role: 'teacher',
      designation: 'Senior Subject Specialist',
      qualification: 'M.Sc / B.Ed',
      subjects: ['Mathematics'],
      assignedClasses: classes.slice(0, 2).map(c => c.name),
      joiningDate: new Date().toISOString().split('T')[0],
      phone: '+92 300 1234567',
      email: 'teacher@school.edu.pk',
      cnic: '35202-0000000-1',
      employmentStatus: 'active',
      salaryMonthly: 50000
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (staff: TeacherStaff) => {
    setEditingStaff(staff);
    setValidationErrors([]);
    setFormData({ ...staff });
    setIsAddEditModalOpen(true);
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.name?.trim()) errors.push('Full name is required');
    if (!formData.phone?.trim()) errors.push('Contact phone number is required');
    if (!formData.designation?.trim()) errors.push('Designation is required');
    if (formData.salaryMonthly === undefined || formData.salaryMonthly < 0) {
      errors.push('Monthly salary must be a valid positive amount in PKR');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const subjectsArray = Array.isArray(formData.subjects) 
        ? formData.subjects 
        : String(formData.subjects || '').split(',').map(s => s.trim()).filter(Boolean);

      const classesArray = Array.isArray(formData.assignedClasses)
        ? formData.assignedClasses
        : String(formData.assignedClasses || '').split(',').map(c => c.trim()).filter(Boolean);

      if (editingStaff) {
        teacherStaffService.update(editingStaff.id, {
          name: formData.name!.trim(),
          teacherCode: formData.teacherCode || editingStaff.teacherCode || `TCH-${editingStaff.id.slice(-2)}`,
          role: formData.role as any || 'teacher',
          designation: formData.designation!.trim(),
          qualification: formData.qualification || 'B.A / B.Sc',
          subjects: subjectsArray,
          assignedClasses: classesArray,
          joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
          phone: formData.phone!.trim(),
          email: formData.email?.trim() || '',
          cnic: formData.cnic?.trim() || '35202-0000000-1',
          employmentStatus: formData.employmentStatus as any || 'active',
          salaryMonthly: Number(formData.salaryMonthly) || 45000
        });
        toast(`Updated faculty record for ${formData.name}`, 'success');
      } else {
        teacherStaffService.create({
          tenantId: currentTenant.id,
          teacherCode: formData.teacherCode || `TCH-${Math.floor(10 + Math.random() * 90)}`,
          name: formData.name!.trim(),
          role: formData.role as any || 'teacher',
          designation: formData.designation!.trim(),
          qualification: formData.qualification || 'M.A / M.Sc',
          subjects: subjectsArray,
          assignedClasses: classesArray,
          joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
          phone: formData.phone!.trim(),
          email: formData.email?.trim() || '',
          cnic: formData.cnic?.trim() || '35202-0000000-1',
          employmentStatus: formData.employmentStatus as any || 'active',
          salaryMonthly: Number(formData.salaryMonthly) || 45000
        });
        toast(`Faculty member ${formData.name} registered successfully`, 'success');
      }

      refreshList();
      setIsAddEditModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Failed to save staff record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!staffToDelete) return;
    teacherStaffService.delete(staffToDelete.id);
    refreshList();
    toast(`Faculty member ${staffToDelete.name} deleted from records`, 'info');
    setStaffToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Teaching Faculty & Staff Directory</h1>
          <p className="text-xs text-slate-500">
            Subject teachers, department heads, and campus administration ({staffList.length} Total Records)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col lg:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, ID, subject, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Roles</option>
            <option value="teacher">Teaching Faculty</option>
            <option value="principal">Principal / Leadership</option>
            <option value="accountant">Accountant / Bursar</option>
            <option value="staff">Campus Staff</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="leave">On Leave</option>
            <option value="resigned">Resigned</option>
          </select>

          {/* Subject Filter */}
          {allKnownSubjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Subjects</option>
              {allKnownSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          )}

          {(search || roleFilter !== 'all' || statusFilter !== 'all' || subjectFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
                setSubjectFilter('all');
              }}
              className="px-2.5 py-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No faculty members found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or filters, or add a new teacher to your school directory.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Faculty Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(staff => {
            const teacherIdDisplay = staff.teacherCode || staff.id.replace('teacher-', 'TCH-');
            const statusBg = {
              active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              leave: 'bg-amber-50 text-amber-800 border-amber-200',
              resigned: 'bg-slate-100 text-slate-600 border-slate-200'
            }[staff.employmentStatus] || 'bg-slate-100 text-slate-600';

            return (
              <div 
                key={staff.id} 
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0 text-base shadow-xs">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">{staff.name}</h3>
                        <span className="text-xs font-medium text-blue-700 block">{staff.designation}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {teacherIdDisplay}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusBg}`}>
                      {staff.employmentStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 py-2.5 border-y border-slate-100">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-800">{staff.phone}</span>
                    </div>
                    {staff.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-700">{staff.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Joined: <strong className="text-slate-700">{staff.joiningDate}</strong></span>
                    </div>
                    {staff.qualification && (
                      <div className="text-[11px] text-slate-500">
                        <strong className="text-slate-700">Qualification:</strong> {staff.qualification}
                      </div>
                    )}
                  </div>

                  {/* Assigned Subjects & Classes */}
                  <div className="mt-3 space-y-2">
                    {staff.subjects && staff.subjects.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Assigned Subjects:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {staff.subjects.map((sub, i) => (
                            <span 
                              key={i} 
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-medium"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {staff.assignedClasses && staff.assignedClasses.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Assigned Classes:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {staff.assignedClasses.map((cls, i) => (
                            <span 
                              key={i} 
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Salary & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block uppercase">Monthly Salary</span>
                    <span className="font-mono font-bold text-slate-900">
                      PKR {staff.salaryMonthly.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedStaffForView(staff)}
                      title="View Details"
                      className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(staff)}
                      title="Edit Teacher"
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setStaffToDelete(staff)}
                      title="Delete Teacher"
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

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingStaff ? `Edit Faculty: ${editingStaff.name}` : 'Add Faculty / Staff Member'}
        subtitle="Configure teacher credentials, assigned classes, subjects, and compensation in PKR"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4 text-xs text-slate-800">
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Please correct the following:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sir Naveed Akhtar"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Teacher ID / Code</label>
              <input
                type="text"
                placeholder="e.g. TCH-05"
                value={formData.teacherCode || ''}
                onChange={e => setFormData({ ...formData, teacherCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Role / Department</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="teacher">Teaching Faculty</option>
                <option value="principal">Vice Principal / Incharge</option>
                <option value="accountant">Accountant / Bursar</option>
                <option value="staff">Administrative Staff</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Designation *</label>
              <input
                type="text"
                required
                placeholder="Senior Mathematics Teacher"
                value={formData.designation || ''}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Employment Status</label>
              <select
                value={formData.employmentStatus}
                onChange={e => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="active">Active Duty</option>
                <option value="leave">On Leave</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Educational Qualification</label>
              <input
                type="text"
                placeholder="e.g. M.Sc Physics (Punjab University), B.Ed"
                value={formData.qualification || ''}
                onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Monthly Salary (PKR) *</label>
              <input
                type="number"
                required
                placeholder="55000"
                value={formData.salaryMonthly || ''}
                onChange={e => setFormData({ ...formData, salaryMonthly: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Contact Phone *</label>
              <input
                type="tel"
                required
                placeholder="+92 321 4455667"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Official Email</label>
              <input
                type="email"
                placeholder="teacher@school.edu.pk"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">CNIC Number</label>
              <input
                type="text"
                placeholder="35202-1234567-1"
                value={formData.cnic || ''}
                onChange={e => setFormData({ ...formData, cnic: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Assigned Subjects (comma-separated)</label>
              <input
                type="text"
                placeholder="Physics, Mathematics, General Science"
                value={Array.isArray(formData.subjects) ? formData.subjects.join(', ') : formData.subjects || ''}
                onChange={e => setFormData({
                  ...formData,
                  subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Separate subjects with commas</span>
            </div>
            <div>
              <label className="block font-semibold mb-1">Assigned Classes (comma-separated)</label>
              <input
                type="text"
                placeholder="Class 9, Class 10"
                value={Array.isArray(formData.assignedClasses) ? formData.assignedClasses.join(', ') : formData.assignedClasses || ''}
                onChange={e => setFormData({
                  ...formData,
                  assignedClasses: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Enter class names this teacher instructs</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Joining Date</label>
            <input
              type="date"
              value={formData.joiningDate || ''}
              onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
              className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
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
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs transition"
            >
              {editingStaff ? 'Save Changes' : 'Register Faculty Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Staff Profile Modal */}
      {selectedStaffForView && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStaffForView(null)}
          title={`Faculty Profile: ${selectedStaffForView.name}`}
          subtitle="Complete academic credentials and employment overview"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                {selectedStaffForView.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedStaffForView.name}</h3>
                <p className="text-xs font-semibold text-blue-700">{selectedStaffForView.designation}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[11px] text-slate-500">
                    ID: {selectedStaffForView.teacherCode || selectedStaffForView.id}
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {selectedStaffForView.employmentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Contact Phone</span>
                <span className="font-mono font-medium text-slate-800">{selectedStaffForView.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Official Email</span>
                <span className="text-slate-800 truncate block">{selectedStaffForView.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">CNIC Number</span>
                <span className="font-mono text-slate-800">{selectedStaffForView.cnic}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Joining Date</span>
                <span className="text-slate-800">{selectedStaffForView.joiningDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Qualification</span>
                <span className="text-slate-800">{selectedStaffForView.qualification}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Monthly Remuneration</span>
                <span className="font-mono font-bold text-blue-900">
                  PKR {selectedStaffForView.salaryMonthly.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Subjects Handled:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedStaffForView.subjects.map((sub, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-medium">
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Classes Assigned:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedStaffForView.assignedClasses.map((cls, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStaffForView(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setStaffToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Remove Faculty Member: ${staffToDelete.name}`}
          message={`Are you sure you want to remove ${staffToDelete.name} (${staffToDelete.designation}) from the school staff directory? This will remove their class assignment linkages.`}
          confirmLabel="Yes, Delete Record"
          variant="danger"
        />
      )}
    </div>
  );
};
