import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, HelpCircle, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const navigate = useNavigate();
  const { currentTenant, switchRole, toast } = useApp();

  const handleSelectPlan = (planName: string) => {
    toast(`Selected ${planName} demo tier. Redirecting to School ERP...`, 'success');
    switchRole('school_admin');
    navigate('/school/subscription');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Simple & Transparent</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Priced in PKR for Pakistani Schools
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          No dollar conversions. No hidden platform setup fees. Subscribe easily via local Pakistani bank transfer, Easypaisa, or JazzCash.
        </p>

        {/* Billing cycle toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-blue-900' : 'text-slate-500'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 rounded-full bg-blue-900 p-0.5 transition-colors relative flex items-center"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${billingCycle === 'yearly' ? 'text-blue-900' : 'text-slate-500'}`}>
              Annual Billing
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Save 2 Months Free
            </span>
          </div>
        </div>
      </div>

      {/* Mock notice */}
      <div className="max-w-2xl mx-auto p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Demonstration Note: Subscription plans and PKR amounts are simulated mock rates for software evaluation.</span>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Starter Plan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taleem Starter</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Tuition & Small Academy</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {billingCycle === 'yearly' ? 'PKR 45,000' : 'PKR 4,500'}
              </span>
              <span className="text-xs text-slate-500">
                {billingCycle === 'yearly' ? '/ year' : '/ month'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              For small tuition centers and primary academies up to 150 students.
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Max 150 Active Students</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Max 10 Teaching Faculty</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Student & Parent Directory</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Daily Attendance Marking</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Single Fee Receipt Prints</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Exam Marks & Result Cards</div>
            </div>
          </div>
          <button
            onClick={() => handleSelectPlan('Taleem Starter')}
            className="mt-8 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Choose Starter
          </button>
        </div>

        {/* Standard Plan (Featured) */}
        <div className="bg-blue-900 text-white rounded-2xl border-2 border-teal-400 p-6 flex flex-col justify-between shadow-xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-400 text-slate-950 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Most Popular Choice
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Taleem Standard</span>
            <h3 className="text-xl font-bold text-white mt-1">Established High School</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">
                {billingCycle === 'yearly' ? 'PKR 95,000' : 'PKR 9,500'}
              </span>
              <span className="text-xs text-slate-300">
                {billingCycle === 'yearly' ? '/ year' : '/ month'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              For complete Matric schools up to 500 students with multi-role access.
            </p>
            <div className="mt-6 pt-6 border-t border-blue-800 space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Max 500 Active Students</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Max 30 Teaching Staff</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> 3-Part Bank Challan Printing</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Teacher & Parent Mobile Portals</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Timetable Scheduler & Clash Alert</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> School Public Website Builder</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-300" /> Accountant Role & Daily Cashbook</div>
            </div>
          </div>
          <button
            onClick={() => handleSelectPlan('Taleem Standard')}
            className="mt-8 w-full py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold rounded-xl transition shadow-md"
          >
            Select Standard Plan
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taleem Enterprise</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Multi-Campus Institution</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {billingCycle === 'yearly' ? 'PKR 180,000' : 'PKR 18,000'}
              </span>
              <span className="text-xs text-slate-500">
                {billingCycle === 'yearly' ? '/ year' : '/ month'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              For comprehensive institutions, college academies, and networks up to 1,500 students.
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Max 1,500 Active Students</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Max 75 Faculty & Staff</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> All Standard ERP Features</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Custom Domain Integration</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Cambridge & BISE Dual Schemas</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Cloudflare R2 Document Vault</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Dedicated Phone & WhatsApp Support</div>
            </div>
          </div>
          <button
            onClick={() => handleSelectPlan('Taleem Enterprise')}
            className="mt-8 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Choose Enterprise
          </button>
        </div>
      </div>
    </div>
  );
};
