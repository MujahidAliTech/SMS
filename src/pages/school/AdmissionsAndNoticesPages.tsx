import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { admissionService, announcementService, eventService, classService, studentService } from '../../services';
import { AdmissionApplication, Announcement, SchoolEvent } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  UserPlus,
  Bell,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Plus,
  Clock,
  ArrowRight
} from 'lucide-react';

export const AdmissionsPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [applications, setApplications] = useState<AdmissionApplication[]>(() => admissionService.getAll(currentTenant.id));
  const classes = classService.getAll(currentTenant.id);

  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [conversionModalApp, setConversionModalApp] = useState<AdmissionApplication | null>(null);

  const [convertForm, setConvertForm] = useState({
    classId: classes[0]?.id || '',
    sectionId: 'sec-a',
    rollNo: '09-20'
  });

  const refreshList = () => {
    setApplications(admissionService.getAll(currentTenant.id));
  };

  const handleUpdateStatus = (id: string, status: AdmissionApplication['status']) => {
    admissionService.updateStatus(id, status);
    refreshList();
    toast(`Application marked as ${status.toUpperCase()}`, 'info');
  };

  const handleConvertToStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionModalApp) return;

    const student = admissionService.convertToStudent(
      conversionModalApp.id,
      convertForm.classId || classes[0].id,
      convertForm.sectionId,
      convertForm.rollNo
    );

    refreshList();
    setConversionModalApp(null);
    toast(`Applicant ${conversionModalApp.applicantName} enrolled as official student!`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Online Admissions Desk</h1>
          <p className="text-xs text-slate-500">
            Incoming parent inquiries submitted via public school website ({applications.length} Applications)
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Applicant Name</th>
                <th className="py-3 px-3">Class Desired</th>
                <th className="py-3 px-3">Father Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Applied Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {app.applicantName}
                    <span className="text-[10px] text-slate-400 block font-mono font-normal">{app.applicationNo}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-blue-900">{app.classApplied}</td>
                  <td className="py-3 px-3 text-slate-700">{app.fatherName}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{app.phone}</td>
                  <td className="py-3 px-3 text-slate-500">{app.submissionDate}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      app.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : app.status === 'under_review'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {app.status !== 'approved' && (
                        <button
                          onClick={() => {
                            setConversionModalApp(app);
                            const matchingClass = classes.find(c => c.name.toLowerCase().includes(app.classApplied.toLowerCase())) || classes[0];
                            setConvertForm({
                              classId: matchingClass.id,
                              sectionId: 'sec-a',
                              rollNo: '09-25'
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition shadow-xs"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Admit Student</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convert to Student Modal */}
      {conversionModalApp && (
        <Modal
          isOpen={true}
          onClose={() => setConversionModalApp(null)}
          title={`Convert Applicant to Enrolled Student`}
          subtitle={`Assigns official roll number and enrolls ${conversionModalApp.applicantName} into academic register`}
        >
          <form onSubmit={handleConvertToStudent} className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="font-bold text-blue-900 block">{conversionModalApp.applicantName}</span>
              <span className="text-slate-600 block text-[11px]">Father: {conversionModalApp.fatherName} • Contact: {conversionModalApp.phone}</span>
            </div>

            <div>
              <label className="block font-semibold mb-1">Confirm Class Placement *</label>
              <select
                value={convertForm.classId}
                onChange={e => setConvertForm({ ...convertForm, classId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-blue-900"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (PKR {c.monthlyTuitionFee}/mo)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Section</label>
                <input
                  type="text"
                  value={convertForm.sectionId}
                  onChange={e => setConvertForm({ ...convertForm, sectionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Assigned Roll Number</label>
                <input
                  type="text"
                  value={convertForm.rollNo}
                  onChange={e => setConvertForm({ ...convertForm, rollNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConversionModalApp(null)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
              >
                Confirm Admission & Enrol
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Application Modal */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Application Details: ${selectedApp.applicantName}`}
          subtitle={`App No: ${selectedApp.applicationNo} • Submitted: ${selectedApp.submissionDate}`}
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Class Applied</span>
                <span className="font-bold text-blue-900">{selectedApp.classApplied}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date of Birth</span>
                <span className="font-medium">{selectedApp.dob} ({selectedApp.gender})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Father Name</span>
                <span className="font-medium">{selectedApp.fatherName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Phone</span>
                <span className="font-mono">{selectedApp.phone}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Address</span>
                <span>{selectedApp.address}</span>
              </div>
              {selectedApp.notes && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inquiry Notes</span>
                  <p className="text-slate-600 italic">{selectedApp.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => { handleUpdateStatus(selectedApp.id, 'under_review'); setSelectedApp(null); }}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-semibold"
                >
                  Mark Under Review
                </button>
                <button
                  onClick={() => { handleUpdateStatus(selectedApp.id, 'rejected'); setSelectedApp(null); }}
                  className="px-2.5 py-1 rounded bg-rose-50 text-rose-800 font-semibold"
                >
                  Reject
                </button>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const AnnouncementsPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => announcementService.getAll(currentTenant.id));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'everyone' as Announcement['targetAudience'],
    isUrdu: false,
    authorName: 'School Administration'
  });

  const refreshList = () => {
    setAnnouncements(announcementService.getAll(currentTenant.id));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    announcementService.create({
      tenantId: currentTenant.id,
      title: formData.title,
      content: formData.content,
      targetAudience: formData.targetAudience,
      isUrdu: formData.isUrdu,
      status: 'published',
      authorName: formData.authorName
    });

    refreshList();
    setIsAddModalOpen(false);
    toast('Announcement broadcasted to portals', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Announcements & Notices</h1>
          <p className="text-xs text-slate-500">
            Broadcast official circulars to parents, teachers, and student dashboards in English & Urdu
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Circular</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {announcements.map(ann => (
          <div
            key={ann.id}
            className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${
              ann.isUrdu ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] uppercase">
                  Audience: {ann.targetAudience.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{ann.createdAt}</span>
              </div>

              <h3 className={`font-bold text-slate-900 text-sm ${ann.isUrdu ? 'urdu-text text-base' : ''}`}>
                {ann.title}
              </h3>
              <p className={`mt-2 text-slate-600 leading-relaxed ${ann.isUrdu ? 'urdu-text text-sm' : 'text-xs'}`}>
                {ann.content}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Author: {ann.authorName}</span>
              <span className="text-emerald-700 font-bold uppercase text-[10px]">
                {ann.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Publish Notice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Publish Official Announcement"
        subtitle="Broadcasts immediately to target mobile apps and school public notice board"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Notice Headline *</label>
            <input
              type="text"
              required
              placeholder="e.g. Winter Vacation Datesheet or PT Meeting"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Target Audience</label>
              <select
                value={formData.targetAudience}
                onChange={e => setFormData({ ...formData, targetAudience: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="everyone">Everyone (Public & All)</option>
                <option value="parents">Parents Only</option>
                <option value="teachers">Teaching Faculty Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Language Script</label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="script"
                    checked={!formData.isUrdu}
                    onChange={() => setFormData({ ...formData, isUrdu: false })}
                  />
                  <span>English</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="script"
                    checked={formData.isUrdu}
                    onChange={() => setFormData({ ...formData, isUrdu: true })}
                  />
                  <span className="font-bold text-emerald-800">اردو (Urdu)</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Announcement Content *</label>
            <textarea
              rows={4}
              required
              placeholder={formData.isUrdu ? 'یہاں اردو میں نوٹس تحریر کریں...' : 'Enter complete announcement circular text...'}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 ${
                formData.isUrdu ? 'urdu-text text-sm' : ''
              }`}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs"
            >
              Publish Circular
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
