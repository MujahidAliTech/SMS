import React from 'react';
import { GraduationCap, ShieldCheck, Zap, Globe, HeartHandshake, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Our Mission</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Modernizing Pakistan's Educational Institutions
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          TaleemCloud PK was conceived to bridge the technology gap for thousands of independent private schools, academies, and tuition centers across Pakistan.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-900">Why TaleemCloud PK?</h2>
        <p>
          Most international school software is bloated, priced in foreign dollars, and fails to accommodate fundamental Pakistani realities: 3-part bank fee challans, BISE Matric/FSc board grading schemas, father CNIC/B-Form verification, high smartphone usage among teachers, and bilingual communication in English and Urdu.
        </p>
        <p>
          TaleemCloud PK offers a lightning-fast, multi-tenant software-as-a-service where each school owner gets full autonomy over their branding, tuition fee structures, faculty assignments, and public marketing website without needing to hire an expensive in-house IT team.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Edge Performance</h4>
            <p className="text-xs text-slate-500">
              Designed for Cloudflare Pages and Edge Workers for sub-second page loads even on 3G and 4G mobile networks across Pakistan.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Strict Multi-Tenancy</h4>
            <p className="text-xs text-slate-500">
              Complete tenant isolation so student records, fee collection ledgers, and exam papers are strictly protected.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Local Support</h4>
            <p className="text-xs text-slate-500">
              Assistance available in Urdu and English via WhatsApp, phone, and local training sessions for school administrative staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    schoolName: '',
    contactPerson: '',
    city: 'Lahore',
    phone: '',
    studentCount: '150-500',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Get In Touch</span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Request a School Demonstration or Quotation
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Our team is based in Lahore with partner representatives in Karachi and Islamabad.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Demo Request Received!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Thank you, <strong>{formData.contactPerson}</strong> from <strong>{formData.schoolName}</strong>. Our Pakistani onboarding specialist will contact your WhatsApp at {formData.phone} shortly.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg"
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">School / Academy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Crescent Science Academy"
                  value={formData.schoolName}
                  onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person (Principal / Owner) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Malik Tariq"
                  value={formData.contactPerson}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                <select
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option value="Lahore">Lahore</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Multan">Multan</option>
                  <option value="Peshawar">Peshawar</option>
                  <option value="Quetta">Quetta</option>
                  <option value="Other">Other City</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Student Strength</label>
                <select
                  value={formData.studentCount}
                  onChange={e => setFormData({ ...formData, studentCount: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option value="Under 150">Under 150 (Tuition / Small Academy)</option>
                  <option value="150-500">150 to 500 Students (Standard High School)</option>
                  <option value="500-1500">500 to 1,500 Students (Large School / College)</option>
                  <option value="1500+">1,500+ Students (Multiple Branches)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Requirements / Message</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your fee challan needs, timetable scheduling, or current challenges..."
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Submit Demonstration Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
