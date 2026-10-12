import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { GraduationCap, BookOpen, Building, CheckCircle2, ArrowRight } from 'lucide-react';

export const SolutionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchTenant, switchRole } = useApp();

  const handleDemoLaunch = (tenantId: string) => {
    switchTenant(tenantId);
    switchRole('school_admin');
    navigate('/school/dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Tailored Verticals</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Purpose-Built Solutions for Pakistani Educational Institutes
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          TaleemCloud PK adapts to your school structure, whether you run a private primary/matric school, an evening tuition academy, or a premier Cambridge institute.
        </p>
      </div>

      {/* Vertical 1: Small & Medium Schools */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              Playgroup to Matric (Class 10)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Private Matric & High Schools</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Eliminate bulky paper fee registers and manual report cards. Handle BISE Punjab, Sindh, KPK, and Federal Board grading conventions, student CNIC/B-Forms, and father emergency contacts. Print standard 3-part fee challans that parents can deposit at authorized bank branches or in the school accounts office.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Sibling Concession Automatic Calculation</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> BISE 9th & 10th Registration Records</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Class Section (Science vs Arts) Separation</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Urdu & English Parent Notifications</div>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto text-center">
          <button
            onClick={() => handleDemoLaunch('tenant-bfs')}
            className="w-full md:w-auto px-5 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Load "Bright Future High School" Demo
          </button>
        </div>
      </div>

      {/* Vertical 2: Tuition & Science Academies */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider">
              Evening Sessions & Test Series
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Tuition Centers & Entry Test Academies</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tuition centers operate on different economics than traditional morning schools. Manage students enrolled in selective subjects (e.g., Only Physics & Math), track batch timings, calculate visiting professor hourly and revenue-share payouts, and send instant test series marks directly to parents via SMS templates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Per-Subject Fee Invoicing</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Sunday Test Series Leaderboards</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Visiting Professor Salary Tracking</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> MDCAT / ECAT Crash Course Batches</div>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto text-center">
          <button
            onClick={() => handleDemoLaunch('tenant-kpt')}
            className="w-full md:w-auto px-5 py-3 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Load "Knowledge Point Academy" Demo
          </button>
        </div>
      </div>

      {/* Vertical 3: Cambridge & Islamic Academies */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
          <Building className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
              Cambridge & Hifz Dual Curriculum
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Islamic & Cambridge Academies</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Designed for forward-thinking academies offering British Cambridge assessment alongside Quran Tajweed, Arabic language, and Hifz-ul-Quran programs. Track both academic grades (A*, A, B) and Islamic memorization milestones (Sabqi and Manzil) with full confidentiality.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Cambridge Letter Grade System</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Hifz Memorization Progress Tracking</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Multi-Campus & Multi-Section Capacity</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Bilingual Website & Report Cards</div>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto text-center">
          <button
            onClick={() => handleDemoLaunch('tenant-alnoor')}
            className="w-full md:w-auto px-5 py-3 bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Load "Al-Noor Academy" Demo
          </button>
        </div>
      </div>
    </div>
  );
};
