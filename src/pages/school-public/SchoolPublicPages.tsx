import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tenantService, classService, teacherStaffService, admissionService, announcementService, eventService } from '../../services';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Sparkles,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Users,
  Award,
  BookOpen,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const SchoolPublicHome: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentTenant } = useApp();
  const school = slug ? tenantService.getBySlug(slug) || currentTenant : currentTenant;
  const branding = school.branding;

  const classes = classService.getAll(school.id);
  const faculty = teacherStaffService.getAll(school.id).filter(t => t.role === 'teacher' || t.role === 'principal');
  const announcements = announcementService.getAll(school.id).filter(a => a.targetAudience === 'everyone');

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section
        className="text-white py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${branding.primaryColor || '#1e3a8a'} 0%, #0f172a 100%)`
        }}
      >
        <div className="max-w-4xl mx-auto space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Admissions Open for Session {branding.academicSession}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            {branding.heroHeadline}
          </h1>

          <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
            {branding.heroSubheadline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              to={`/s/${school.slug}/admissions`}
              className="px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: branding.secondaryColor || '#0d9488' }}
            >
              Apply Online for Admission
            </Link>
            <Link
              to={`/s/${school.slug}/classes`}
              className="px-5 py-3 rounded-xl font-semibold text-xs text-white bg-white/10 hover:bg-white/20 transition border border-white/20"
            >
              Explore Academic Programs
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Principal's Welcome</span>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              A Legacy of Quality Education in {branding.city}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {branding.aboutText}
            </p>
            <div className="pt-2 text-xs text-slate-700 space-y-1">
              <div><strong>Principal:</strong> {branding.principalName}</div>
              <div><strong>Affiliation:</strong> {branding.affiliationBoard}</div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Key Campus Highlights</h3>
            <div className="space-y-2.5 text-slate-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Well-equipped modern science and computer laboratories</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Certified and highly experienced teaching faculty</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Real-time mobile app updates for parents and students</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Co-curricular debates, sports galas, and science exhibitions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Offered Curriculums</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Academic Programs & Classes</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {classes.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Grade Level: {c.gradeNumeric}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="font-mono text-blue-900">PKR {c.monthlyTuitionFee.toLocaleString()}/mo</span>
                <Link to={`/s/${school.slug}/admissions`} className="text-[11px] text-teal-700 hover:underline">
                  Inquire →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Public Notice Board */}
      {announcements.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Official Circulars</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Campus Notice Board</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map(ann => (
              <div key={ann.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex justify-between items-center mb-1 text-[11px] text-slate-400">
                  <span className="font-mono">{ann.createdAt}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{ann.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const SchoolPublicAdmissions: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentTenant, toast } = useApp();
  const school = slug ? tenantService.getBySlug(slug) || currentTenant : currentTenant;
  const classes = classService.getAll(school.id);

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    applicantName: '',
    fatherName: '',
    classApplied: classes[0]?.name || 'Class 9',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    dob: '2012-01-01',
    gender: 'Male' as 'Male' | 'Female',
    previousSchool: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    admissionService.submitApplication({
      tenantId: school.id,
      applicantName: form.applicantName,
      fatherName: form.fatherName,
      classApplied: form.classApplied,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      email: form.email,
      address: form.address,
      dob: form.dob,
      gender: form.gender,
      previousSchool: form.previousSchool
    });

    setSubmitted(true);
    toast('Admission application submitted to school administration!', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Session {school.branding.academicSession}</span>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Online Admission Inquiry — {school.branding.schoolName}
        </h1>
        <p className="text-xs text-slate-500">
          Fill out the prospective student form below. Our admissions desk will contact you within 24 hours.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Application Received!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Thank you, <strong>{form.fatherName}</strong>. Application for <strong>{form.applicantName}</strong> has been assigned an application number and forwarded to the Principal's office.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 px-4 py-2 bg-blue-900 text-white text-xs font-bold rounded-lg"
            >
              Submit Another Application
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Bilal"
                  value={form.applicantName}
                  onChange={e => setForm({ ...form, applicantName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Father's Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kamran Tariq"
                  value={form.fatherName}
                  onChange={e => setForm({ ...form, fatherName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Class Applying For *</label>
                <select
                  value={form.classApplied}
                  onChange={e => setForm({ ...form, classApplied: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Father Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={form.whatsapp}
                  onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Residential Address *</label>
              <input
                type="text"
                required
                placeholder="House #, Street, Colony, City"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Previous School Attended (If Any)</label>
              <input
                type="text"
                placeholder="e.g. Army Public School or Crescent Model"
                value={form.previousSchool}
                onChange={e => setForm({ ...form, previousSchool: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition hover:opacity-90 mt-2"
              style={{ backgroundColor: school.branding.primaryColor || '#1e3a8a' }}
            >
              Submit Admission Application (2026-27)
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
