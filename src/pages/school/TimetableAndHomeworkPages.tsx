import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { timetableService, homeworkService, classService, teacherStaffService, subjectService } from '../../services';
import { TimetableEntry, Homework } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Paperclip,
  Download
} from 'lucide-react';

export const TimetablePage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const classes = classService.getAll(currentTenant.id);
  const teachers = teacherStaffService.getAll(currentTenant.id);
  const subjects = subjectService.getAll(currentTenant.id);

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || 'class-9');
  const [entries, setEntries] = useState<TimetableEntry[]>(() => timetableService.getAll(currentTenant.id));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    day: 'Monday' as TimetableEntry['day'],
    periodNo: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectName: subjects[0]?.name || 'Mathematics',
    teacherName: teachers[0]?.name || 'Sir Zeeshan Haider',
    roomNo: 'Room 102'
  });

  const refreshList = () => {
    setEntries(timetableService.getAll(currentTenant.id));
  };

  const classEntries = entries.filter(e => e.classId === selectedClassId);
  const days: TimetableEntry['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Timetable Clash Detector!
  const hasClashes = () => {
    // Check if any teacher is assigned to multiple classes at the same day and period
    const teacherSlotMap: Record<string, string[]> = {};
    for (const e of entries) {
      const key = `${e.day}-${e.periodNo}-${e.teacherName}`;
      if (!teacherSlotMap[key]) teacherSlotMap[key] = [];
      teacherSlotMap[key].push(e.className);
    }
    const clashes: string[] = [];
    Object.entries(teacherSlotMap).forEach(([key, classNames]) => {
      if (classNames.length > 1) {
        clashes.push(`${key.split('-')[2]} is double-booked on ${key.split('-')[0]} (Period ${key.split('-')[1]}) across: ${classNames.join(', ')}`);
      }
    });
    return clashes;
  };

  const activeClashes = hasClashes();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find(c => c.id === selectedClassId) || classes[0];

    timetableService.create({
      tenantId: currentTenant.id,
      classId: cls.id,
      className: cls.name,
      section: 'A',
      day: formData.day,
      periodNo: Number(formData.periodNo),
      startTime: formData.startTime,
      endTime: formData.endTime,
      subjectName: formData.subjectName,
      teacherName: formData.teacherName,
      roomNo: formData.roomNo
    });

    refreshList();
    setIsAddModalOpen(false);
    toast(`Scheduled Period ${formData.periodNo} (${formData.subjectName}) for ${cls.name}`, 'success');
  };

  const handleDelete = (id: string) => {
    timetableService.delete(id);
    refreshList();
    toast('Period removed from schedule', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Timetable & Schedule</h1>
          <p className="text-xs text-slate-500">
            Weekly periods, lab timings, teacher room assignments, and automatic clash detector
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-blue-900 focus:outline-none focus:border-blue-600 shadow-xs"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} Timetable</option>
            ))}
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Period</span>
          </button>
        </div>
      </div>

      {/* Clash Alert Banner */}
      {activeClashes.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Timetable Conflict Detected!</span>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-rose-700">
              {activeClashes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Weekly Schedule Grid */}
      <div className="space-y-4">
        {days.map(day => {
          const dayPeriods = classEntries.filter(e => e.day === day).sort((a, b) => a.periodNo - b.periodNo);

          return (
            <div key={day} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">{day}</span>
                <span className="text-[10px] text-slate-400 font-medium">{dayPeriods.length} Periods Scheduled</span>
              </div>

              {dayPeriods.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No periods scheduled for {day}.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {dayPeriods.map(period => (
                    <div
                      key={period.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs flex flex-col justify-between hover:border-blue-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold font-mono text-blue-900 bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px]">
                            Period {period.periodNo}
                          </span>
                          <button
                            onClick={() => handleDelete(period.id)}
                            className="text-slate-400 hover:text-rose-600"
                            title="Delete period"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs">{period.subjectName}</h4>
                        <p className="text-slate-600 text-[11px] mt-0.5">{period.teacherName}</p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{period.startTime} - {period.endTime}</span>
                        <span className="text-slate-600 font-semibold">{period.roomNo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Period Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Assign Timetable Period"
        subtitle="Schedules class subject, period duration, and teacher"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs text-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Day of Week *</label>
              <select
                value={formData.day}
                onChange={e => setFormData({ ...formData, day: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Period Number *</label>
              <input
                type="number"
                min={1}
                max={9}
                value={formData.periodNo}
                onChange={e => setFormData({ ...formData, periodNo: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Start Time</label>
              <input
                type="text"
                placeholder="08:00 AM"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">End Time</label>
              <input
                type="text"
                placeholder="08:45 AM"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Subject *</label>
              <select
                value={formData.subjectName}
                onChange={e => setFormData({ ...formData, subjectName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Assigned Teacher *</label>
              <select
                value={formData.teacherName}
                onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Room / Laboratory</label>
            <input
              type="text"
              placeholder="e.g. Science Lab 1 or Room 102"
              value={formData.roomNo}
              onChange={e => setFormData({ ...formData, roomNo: e.target.value })}
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
              Add to Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const HomeworkPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const [homeworkList, setHomeworkList] = useState<Homework[]>(() => homeworkService.getAll(currentTenant.id));
  const classes = classService.getAll(currentTenant.id);
  const subjects = subjectService.getAll(currentTenant.id);
  const teachers = teacherStaffService.getAll(currentTenant.id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: classes[0]?.id || '',
    subjectName: subjects[0]?.name || 'Mathematics',
    teacherName: teachers[0]?.name || 'Sir Zeeshan Haider',
    dueDate: '2026-10-15',
    attachmentName: 'Chapter_Summary_Notes.pdf'
  });

  const refreshList = () => {
    setHomeworkList(homeworkService.getAll(currentTenant.id));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const cls = classes.find(c => c.id === formData.classId) || classes[0];

    homeworkService.create({
      tenantId: currentTenant.id,
      title: formData.title,
      description: formData.description,
      classId: cls.id,
      className: cls.name,
      section: 'A',
      subjectName: formData.subjectName,
      teacherName: formData.teacherName,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate,
      status: 'active',
      attachmentName: formData.attachmentName
    });

    refreshList();
    setIsAddModalOpen(false);
    toast(`Assigned homework for ${cls.name}`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Homework & Assignments Desk</h1>
          <p className="text-xs text-slate-500">
            Daily diary tasks and digital worksheets accessible to students and parents
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Homework</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {homeworkList.map(hw => (
          <div key={hw.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[11px]">
                  {hw.className} • {hw.subjectName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Due: {hw.dueDate}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug">{hw.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{hw.description}</p>

              {hw.attachmentName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-mono">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span>{hw.attachmentName}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Teacher: {hw.teacherName}</span>
              <span className="text-emerald-700 font-bold uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                {hw.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Homework Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Assign Daily Homework"
        subtitle="Broadcasts task to student and parent mobile portals"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Homework Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 4 Exercise 4.2 Q1 to Q10"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Class *</label>
              <select
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Subject</label>
              <select
                value={formData.subjectName}
                onChange={e => setFormData({ ...formData, subjectName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Instructions / Description *</label>
            <textarea
              rows={3}
              required
              placeholder="Provide question numbers, instructions for notebook, or test preparation guidelines..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Submission Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Mock Attachment Filename</label>
              <input
                type="text"
                placeholder="Worksheet_Oct_14.pdf"
                value={formData.attachmentName}
                onChange={e => setFormData({ ...formData, attachmentName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
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
              Post Homework
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
