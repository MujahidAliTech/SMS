import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { subscriptionService, tenantService } from '../../services';
import { TenantBranding } from '../../types';
import { Modal } from '../../components/common/Modal';
import {
  Globe,
  Settings,
  Award,
  Sparkles,
  Save,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const SchoolSettingsPage: React.FC = () => {
  const { currentTenant, updateBranding, toast } = useApp();
  const [form, setForm] = useState<TenantBranding>(currentTenant.branding);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(form);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">School Identity & Branding Settings</h1>
          <p className="text-xs text-slate-500">
            Tenant customization for {currentTenant.name} (Live preview reflects instantly)
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Save className="w-4 h-4" />
          <span>Save Branding Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-5 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Official School Name *</label>
            <input
              type="text"
              required
              value={form.schoolName}
              onChange={e => setForm({ ...form, schoolName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">School Tagline / Motto</label>
            <input
              type="text"
              value={form.tagline}
              onChange={e => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Primary Theme Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Secondary Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.secondaryColor}
                  onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Academic Session</label>
              <input
                type="text"
                value={form.academicSession}
                onChange={e => setForm({ ...form, academicSession: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Affiliation Board</label>
              <input
                type="text"
                value={form.affiliationBoard}
                onChange={e => setForm({ ...form, affiliationBoard: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Campus Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">WhatsApp Desk Number</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Principal / Incharge Name</label>
              <input
                type="text"
                value={form.principalName}
                onChange={e => setForm({ ...form, principalName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Official Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Physical Address & City</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </form>

        {/* Right Col: Live Branding Preview */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Live Tenant Card Preview</span>
            <div
              className="p-4 rounded-xl text-white shadow-md relative overflow-hidden"
              style={{ backgroundColor: form.primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm"
                  style={{ backgroundColor: form.secondaryColor }}
                >
                  {form.schoolName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-white">{form.schoolName}</h4>
                  <p className="text-[10px] text-slate-200">{form.tagline}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center text-[10px] text-slate-200">
                <span>{form.city}, Pakistan</span>
                <span className="font-mono">{form.academicSession}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div><strong>Board:</strong> {form.affiliationBoard}</div>
              <div><strong>Phone:</strong> {form.phone}</div>
              <div><strong>Principal:</strong> {form.principalName}</div>
            </div>

            <div className="mt-4">
              <a
                href={`/s/${currentTenant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
              >
                <span>Preview Public Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WebsiteSettingsPage: React.FC = () => {
  const { currentTenant, updateBranding, toast } = useApp();
  const [form, setForm] = useState<TenantBranding>(currentTenant.branding);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(form);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Public Website Builder & Content</h1>
          <p className="text-xs text-slate-500">
            Customize the public pages that prospective parents see when visiting your school site
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/s/${currentTenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition"
          >
            <Globe className="w-4 h-4" />
            <span>Launch School Site</span>
          </a>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Public Content</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs text-xs text-slate-800">
        <div>
          <label className="block font-semibold mb-1">Public Hero Headline *</label>
          <input
            type="text"
            required
            value={form.heroHeadline}
            onChange={e => setForm({ ...form, heroHeadline: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-bold text-slate-900"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Public Hero Subheading</label>
          <textarea
            rows={2}
            value={form.heroSubheadline}
            onChange={e => setForm({ ...form, heroSubheadline: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">About the School (History & Vision)</label>
          <textarea
            rows={4}
            value={form.aboutText}
            onChange={e => setForm({ ...form, aboutText: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1">Facebook Page URL</label>
            <input
              type="url"
              value={form.facebookUrl || ''}
              onChange={e => setForm({ ...form, facebookUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">YouTube Channel URL</label>
            <input
              type="url"
              value={form.youtubeUrl || ''}
              onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export const SubscriptionPage: React.FC = () => {
  const { currentTenant, toast } = useApp();
  const plans = subscriptionService.getPlans();
  const currentSub = subscriptionService.getByTenantId(currentTenant.id);

  const currentPlan = plans.find(p => p.id === currentTenant.planId) || plans[1];
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const studentPercent = Math.min(100, Math.round((currentTenant.activeStudentCount / currentTenant.studentLimit) * 100));
  const teacherPercent = Math.min(100, Math.round((currentTenant.activeTeacherCount / currentTenant.teacherLimit) * 100));

  const handleUpgrade = (planId: string) => {
    subscriptionService.updatePlan(currentTenant.id, planId);
    toast('Subscription tier updated successfully', 'success');
    setIsUpgradeModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">School Subscription & Capacity</h1>
          <p className="text-xs text-slate-500">
            Current SaaS plan tier, limits, and renewal dates
          </p>
        </div>

        <button
          onClick={() => setIsUpgradeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Change Plan Tier</span>
        </button>
      </div>

      {/* Active Plan Card */}
      <div className="bg-white border-2 border-blue-600 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Active Subscription
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">{currentPlan.name}</h2>
          <p className="text-xs text-slate-600 mt-1">{currentPlan.description}</p>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-4">
            <span>Next Renewal: <strong className="text-slate-800 font-mono">{currentSub?.renewalDate || '2027-03-15'}</strong></span>
            <span>Billing: <strong className="text-slate-800 capitalize font-mono">{currentSub?.billingCycle || 'Yearly'}</strong></span>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <span className="text-2xl font-black text-slate-900">
            PKR {currentPlan.priceMonthlyPkr.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500"> / month</span>
          <p className="text-[10px] text-emerald-700 font-semibold mt-1">Status: Active Account</p>
        </div>
      </div>

      {/* Quotas & Capacity Utilization */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-5">
        <h3 className="font-bold text-sm text-slate-900">Tenant Student & Staff Quotas</h3>

        {/* Student Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Enrolled Students</span>
            <span className="font-bold text-slate-900">{currentTenant.activeStudentCount} / {currentTenant.studentLimit} Max</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${studentPercent > 85 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${studentPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {currentTenant.studentLimit - currentTenant.activeStudentCount} student seats remaining in current tier.
          </span>
        </div>

        {/* Teacher Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Teaching Faculty Accounts</span>
            <span className="font-bold text-slate-900">{currentTenant.activeTeacherCount} / {currentTenant.teacherLimit} Max</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all"
              style={{ width: `${teacherPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade or Switch Subscription Plan"
        subtitle="Select tier suitable for your school capacity"
      >
        <div className="space-y-4 text-xs text-slate-800">
          {plans.map(p => (
            <div
              key={p.id}
              className={`p-4 rounded-xl border flex items-center justify-between transition ${
                p.id === currentTenant.planId ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <span className="font-bold text-slate-900 text-sm block">{p.name}</span>
                <span className="text-slate-500 text-[11px]">Up to {p.studentLimit} students • {p.teacherLimit} faculty</span>
                <span className="font-bold text-blue-900 block mt-1 font-mono">
                  PKR {p.priceMonthlyPkr.toLocaleString()} / mo
                </span>
              </div>
              <button
                disabled={p.id === currentTenant.planId}
                onClick={() => handleUpgrade(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  p.id === currentTenant.planId
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
              >
                {p.id === currentTenant.planId ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
