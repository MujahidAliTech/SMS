import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  ShieldCheck,
  CreditCard,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  Smartphone,
  Globe,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Award,
  ChevronDown,
  Building,
  HelpCircle,
  Clock,
  Printer,
  BookOpen
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant, switchRole } = useApp();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleLaunchAdminDemo = () => {
    switchRole('school_admin');
    navigate('/school/dashboard');
  };

  const handleLaunchSuperAdminDemo = () => {
    switchRole('super_admin');
    navigate('/super-admin/dashboard');
  };

  const faqs = [
    {
      q: 'Does TaleemCloud generate traditional 3-part Pakistani bank fee challans?',
      a: 'Yes. In addition to single thermal receipts, the software formats official 3-copy vouchers (Student Copy, Accounts Copy, and Bank Copy) with school logo, admission number, monthly breakdown, and due dates in PKR.'
    },
    {
      q: 'Can a school customize its own branding, colors, and public website?',
      a: 'Every school or academy gets an independent tenant space. You can set your own school logo, primary/secondary colors, phone numbers, principal name, board affiliation, and launch a branded public school website.'
    },
    {
      q: 'How does multi-tenancy protect school data isolation?',
      a: 'The architecture is structured around strict tenantId partitioning. While schools run on high-performance Cloudflare edge infrastructure, school records, student profiles, and financials are isolated per institute.'
    },
    {
      q: 'Can teachers and parents use the system easily on budget Android smartphones?',
      a: 'Yes. The Teacher and Parent portals feature mobile-first responsive bottom navigation bars, quick attendance marking buttons, instant WhatsApp challan sharing, and lightweight pages.'
    },
    {
      q: 'Does it support BISE Board and Cambridge grading formulas?',
      a: 'Yes! You can configure custom passing marks, total marks, percentage thresholds, and grading schemes (A+, A, B, C, D, F) suitable for BISE Punjab, Sindh, Federal, or Cambridge O-Levels.'
    }
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-teal-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Multi-Tenant School Management SaaS • Designed for Pakistan</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            The Modern Education Operating System for <span className="text-teal-400">Schools & Academies</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate paperwork, recover overdue student fees on time, generate 3-part bank challans, and delight parents with automated academic portals. Tailored for small schools, private academies, and tuition centers in Pakistan.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleLaunchAdminDemo}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-teal-500/20 hover:scale-105"
            >
              <span>Explore School Admin ERP</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLaunchSuperAdminDemo}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition border border-slate-700"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Platform Super Admin Demo</span>
            </button>

            <Link
              to={`/s/${currentTenant.slug}`}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-teal-300 font-semibold text-sm transition border border-teal-500/30"
            >
              <Globe className="w-4 h-4" />
              <span>Preview Demo School Website</span>
            </Link>
          </div>

          {/* Key Value Pills */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>PKR Fee Invoicing & Receipts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>BISE & Cambridge Grading</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Multi-Child Parent App</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Independent School Websites</span>
            </div>
          </div>
        </div>

        {/* Dashboard Snapshot Interactive Card */}
        <div className="max-w-5xl mx-auto mt-14 bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-2 text-slate-800 overflow-hidden">
          <div className="bg-slate-100 rounded-xl p-3 border border-slate-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="font-mono text-slate-600 ml-2 hidden sm:inline">
                https://{currentTenant.slug}.taleemcloud.pk/dashboard
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">
                {currentTenant.branding.schoolName}
              </span>
              <button
                onClick={handleLaunchAdminDemo}
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-medium text-[11px] rounded"
              >
                Launch ERP Interactive
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 uppercase font-medium">Total Enrolled</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{currentTenant.activeStudentCount}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Active Session 2026-27</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 uppercase font-medium">Fee Collection Rate</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">87.5%</p>
              <span className="text-[10px] text-emerald-600 font-semibold">↑ 4.2% vs last month</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 uppercase font-medium">Today's Attendance</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">94%</p>
              <span className="text-[10px] text-blue-600 font-semibold">Verified Morning Roster</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 uppercase font-medium">Teaching Faculty</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{currentTenant.activeTeacherCount}</p>
              <span className="text-[10px] text-slate-500">Subject Specialists</span>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions for Pakistan Segment */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Targeted Education Models</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Engineered for Every Type of Educational Institute in Pakistan
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Whether you operate a primary school, high school preparing students for Matric board exams, or an evening coaching center.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Solution 1: Small Schools */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Private Matric Schools</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Playgroup to Class 10 (Matric Science & Arts). Complete BISE board exam record keeping, section management, and father B-Form/CNIC tracking.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>3-Part Bank & Cash Challans</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Monthly Class Roster Sheets</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Parent Teacher SMS & WhatsApp Alerts</span>
              </li>
            </ul>
          </div>

          {/* Solution 2: Tuition Centers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Tuition & Coaching Centers</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Evening batches for 9th, 10th, 1st Year, and 2nd Year FSc pre-medical / engineering. Track subject-wise enrollments and test series.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Subject & Batch-Wise Fees</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Chapter-Wise Sunday Test Cards</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Visiting Teacher Commission & Salary</span>
              </li>
            </ul>
          </div>

          {/* Solution 3: Academies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cambridge & Islamic Academies</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Institutions offering Cambridge O/A-Levels alongside Nazra Quran & Hifz programs with separate department reporting.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Cambridge Grade Boundaries (A*, A, B)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Hifz Sabqi & Manzil Tracker</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Bilingual Urdu & English Reports</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="bg-slate-100/70 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Features That Matter</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Everything Your School Needs to Run Smoothly
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Built after studying the day-to-day operations of hundreds of Pakistani school owners and administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="p-2.5 w-fit rounded-lg bg-blue-50 text-blue-700">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Pakistan Fee Challans</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate monthly fee vouchers with 1-click sibling discounts, late fines, tuition, exam charges, and partial payments in PKR.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="p-2.5 w-fit rounded-lg bg-teal-50 text-teal-700">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">10-Second Attendance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Teachers mark entire classes on their phones in under 10 seconds. Auto-generate monthly percentage attendance registers.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="p-2.5 w-fit rounded-lg bg-purple-50 text-purple-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Exams & Report Cards</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter marks per subject, calculate positions, percentage, and printable board-style progress cards with teacher remarks.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="p-2.5 w-fit rounded-lg bg-amber-50 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Timetable Scheduler</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Design weekly schedules for classes and teachers. Avoid overlapping room assignments and teacher double-bookings.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="p-2.5 w-fit rounded-lg bg-emerald-50 text-emerald-700">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Child Parent App</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Parents with multiple children switch effortlessly between siblings to view fee challans, homework, and test results.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="p-2.5 w-fit rounded-lg bg-rose-50 text-rose-700">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">School Website Builder</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every tenant receives an attractive public website with school branding, faculty profiles, admissions form, and notice board.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Transparent & Affordable</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Predictable Pricing in Pakistani Rupees (PKR)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            No expensive USD conversions or credit card barriers. Pay via JazzCash, Easypaisa, or local bank transfer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taleem Starter</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">PKR 4,500</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Up to 150 students. Ideal for small academies.</p>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> 150 Active Students</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Daily Attendance Marking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Manual Fee Challans & Receipts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Exam Marks & Result Cards</li>
              </ul>
            </div>
            <button
              onClick={handleLaunchAdminDemo}
              className="mt-8 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Test Starter Demo
            </button>
          </div>

          <div className="bg-blue-900 text-white rounded-2xl border-2 border-teal-400 p-6 flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-400 text-slate-950 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Most Popular in Pakistan
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Taleem Standard</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">PKR 9,500</span>
                <span className="text-xs text-slate-300">/ month</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">Up to 500 students. For high schools & colleges.</p>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> 500 Active Students & 30 Staff</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Teacher & Parent Mobile Apps</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> 3-Part Bank Challan Printing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Timetable Clash Detector</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Public School Website Builder</li>
              </ul>
            </div>
            <button
              onClick={handleLaunchAdminDemo}
              className="mt-8 w-full py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold rounded-xl transition shadow-md"
            >
              Launch Live Standard ERP
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taleem Enterprise</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">PKR 18,000</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Up to 1,500 students. Multi-branch institutions.</p>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> 1,500 Students & 75 Faculty</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> All Portals + Accountant Desk</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Custom Domain Support (e.g. yourschool.edu.pk)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Dedicated WhatsApp Support Manager</li>
              </ul>
            </div>
            <button
              onClick={handleLaunchAdminDemo}
              className="mt-8 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Test Enterprise Demo
            </button>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Got Questions?</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeFaq === idx ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-900 to-teal-800 rounded-3xl p-8 sm:p-12 text-white text-center space-y-4 shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Modernize Your School in Pakistan?
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto">
            Test the live multi-tenant prototype right now. Switch between demo schools, test teacher portals, print fee challans, and preview public school websites.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleLaunchAdminDemo}
              className="px-6 py-3 bg-white text-blue-950 font-bold text-xs rounded-xl hover:bg-slate-100 transition shadow-md"
            >
              Start Free Interactive Demo
            </button>
            <Link
              to="/pricing"
              className="px-6 py-3 bg-blue-950/40 text-white font-semibold text-xs rounded-xl hover:bg-blue-950/60 transition border border-white/20"
            >
              View Plan Details
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
