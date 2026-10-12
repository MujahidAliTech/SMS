import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { eventService, studentService, feeService, attendanceService, examService, exportService, classService } from '../../services';
import { SchoolEvent } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  Calendar,
  FileBarChart,
  Download,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  Filter,
  Printer
} from 'lucide-react';

export const EventsPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [events, setEvents] = useState<SchoolEvent[]>(() => eventService.getAll(currentTenant.id));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    time: '10:00 AM - 01:00 PM',
    location: 'Main Auditorium',
    category: 'academic' as SchoolEvent['category'],
    audience: 'All Students & Parents'
  });

  const refreshList = () => {
    setEvents(eventService.getAll(currentTenant.id));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    eventService.create({
      tenantId: currentTenant.id,
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate,
      endDate: formData.endDate,
      time: formData.time,
      location: formData.location,
      category: formData.category,
      audience: formData.audience
    });

    refreshList();
    setIsAddModalOpen(false);
    toast(`Event "${formData.title}" added to school calendar`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Events & School Calendar</h1>
          <p className="text-xs text-slate-500">
            Annual science exhibitions, sports galas, speech competitions, and board exam dates
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Calendar Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {events.map(evt => (
          <div key={evt.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[10px] uppercase">
                  {evt.category}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{evt.startDate}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug">{evt.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{evt.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{evt.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{evt.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add School Event"
        subtitle="Adds event to calendar and school public website"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Sports Gala 2026"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="academic">Academic & Science</option>
                <option value="sports">Sports & Athletics</option>
                <option value="cultural">Cultural & Debate</option>
                <option value="holiday">Public Holiday</option>
                <option value="exam">Examination Term</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Target Audience</label>
              <input
                type="text"
                value={formData.audience}
                onChange={e => setFormData({ ...formData, audience: e.target.value })}
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
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Timing</label>
              <input
                type="text"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Campus Location</label>
            <input
              type="text"
              placeholder="Main Grounds or Auditorium"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
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
              Add Event
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ReportsPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const students = studentService.getAll(currentTenant.id);
  const invoices = feeService.getInvoices(currentTenant.id);
  const results = examService.getResults(currentTenant.id);
  const classes = classService.getAll(currentTenant.id);

  const [activeReport, setActiveReport] = useState<'fees' | 'enrollment' | 'merit'>('fees');

  const handleExportFees = () => {
    const headers = ['Invoice No', 'Student Name', 'Class', 'Billing Month', 'Total PKR', 'Paid PKR', 'Balance PKR', 'Status', 'Due Date'];
    const rows = invoices.map(i => [
      i.invoiceNo,
      i.studentName,
      i.className,
      i.feeMonth,
      i.totalAmount,
      i.amountPaid,
      i.balance,
      i.status,
      i.dueDate
    ]);
    exportService.downloadCsv(`${currentTenant.slug}_fee_ledger_report`, headers, rows);
    toast('Fee collection report exported', 'success');
  };

  const handleExportMerit = () => {
    const headers = ['Position', 'Student Name', 'Class', 'Exam Term', 'Total Obtained', 'Total Marks', 'Percentage', 'Grade', 'Status'];
    const rows = results.map(r => [
      r.positionInClass || 'N/A',
      r.studentName,
      r.className,
      r.examTitle,
      r.totalObtained,
      r.totalMarks,
      `${r.percentage}%`,
      r.grade,
      r.status
    ]);
    exportService.downloadCsv(`${currentTenant.slug}_exam_merit_list`, headers, rows);
    toast('Academic merit list exported', 'success');
  };

  const handleExportEnrollment = () => {
    const headers = ['Admission No', 'Student Name', 'Father Name', 'Class', 'Roll No', 'Phone', 'Monthly Fee PKR', 'Status'];
    const rows = students.map(s => [
      s.admissionNo,
      s.name,
      s.fatherName,
      s.className,
      s.rollNo,
      s.parentContact,
      s.monthlyFee,
      s.status
    ]);
    exportService.downloadCsv(`${currentTenant.slug}_enrollment_register`, headers, rows);
    toast('Enrollment roster exported', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports & Analytics Export</h1>
          <p className="text-xs text-slate-500">
            Generate printable ledgers, attendance registers, and CSV spreadsheets for school owners
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeReport === 'fees' && (
            <button
              onClick={handleExportFees}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Fee CSV</span>
            </button>
          )}
          {activeReport === 'enrollment' && (
            <button
              onClick={handleExportEnrollment}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Enrollment CSV</span>
            </button>
          )}
          {activeReport === 'merit' && (
            <button
              onClick={handleExportMerit}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Merit List CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveReport('fees')}
          className={`pb-3 transition ${activeReport === 'fees' ? 'border-b-2 border-blue-700 text-blue-900 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Fee Collection & Recovery Ledger
        </button>
        <button
          onClick={() => setActiveReport('enrollment')}
          className={`pb-3 transition ${activeReport === 'enrollment' ? 'border-b-2 border-blue-700 text-blue-900 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Student Enrollment Roster
        </button>
        <button
          onClick={() => setActiveReport('merit')}
          className={`pb-3 transition ${activeReport === 'merit' ? 'border-b-2 border-blue-700 text-blue-900 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Examination Merit & Positions
        </button>
      </div>

      {/* Report Table View */}
      {activeReport === 'fees' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Challan No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3">Billed (PKR)</th>
                  <th className="py-3 px-3">Collected (PKR)</th>
                  <th className="py-3 px-3">Balance (PKR)</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(i => (
                  <tr key={i.id}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{i.invoiceNo}</td>
                    <td className="py-3 px-3 font-medium">{i.studentName}</td>
                    <td className="py-3 px-3">{i.className}</td>
                    <td className="py-3 px-3 text-blue-900 font-medium">{i.feeMonth}</td>
                    <td className="py-3 px-3 font-mono">PKR {i.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono font-medium text-emerald-700">PKR {i.amountPaid.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-700">PKR {i.balance.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        i.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'enrollment' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Father Name</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3">Roll No</th>
                  <th className="py-3 px-3">Parent Phone</th>
                  <th className="py-3 px-3">Fee / Mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-mono text-slate-500">{s.admissionNo}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-3">{s.fatherName}</td>
                    <td className="py-3 px-3 text-blue-900 font-medium">{s.className}</td>
                    <td className="py-3 px-3 font-mono">{s.rollNo}</td>
                    <td className="py-3 px-3 font-mono">{s.parentContact}</td>
                    <td className="py-3 px-3 font-mono font-bold">PKR {s.monthlyFee.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'merit' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3">Exam Assessment</th>
                  <th className="py-3 px-3">Obtained / Total</th>
                  <th className="py-3 px-3">Percentage</th>
                  <th className="py-3 px-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map(r => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      {r.positionInClass ? `${r.positionInClass}${r.positionInClass === 1 ? 'st' : 'nd'} Position` : 'Pass'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{r.studentName}</td>
                    <td className="py-3 px-3 text-blue-900 font-medium">{r.className}</td>
                    <td className="py-3 px-3">{r.examTitle}</td>
                    <td className="py-3 px-3 font-mono font-bold">{r.totalObtained} / {r.totalMarks}</td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-900">{r.percentage}%</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {r.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
