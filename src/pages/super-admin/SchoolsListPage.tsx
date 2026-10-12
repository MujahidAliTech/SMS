import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { tenantService, auditLogService } from '../../services';
import { Modal } from '../../components/common/Modal';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  Filter,
  ExternalLink
} from 'lucide-react';

export const SchoolsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenants, refreshTenants, switchTenant, switchRole, toast } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newSchool, setNewSchool] = useState({
    name: '',
    slug: '',
    type: 'school' as 'school' | 'academy' | 'tuition_center',
    city: 'Lahore',
    principalName: '',
    phone: '',
    affiliationBoard: 'BISE Lahore',
    planId: 'plan-standard'
  });

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.branding.city.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = (id: string, name: string) => {
    const updated = tenantService.toggleStatus(id);
    refreshTenants();
    toast(`School "${name}" status changed to ${updated.status}`, 'info');
    auditLogService.logAction({
      schoolName: name,
      actorName: 'Tariq Mahmood (Super Admin)',
      role: 'super_admin',
      action: 'School Status Toggled',
      details: `Status set to ${updated.status}`,
      ipAddress: '111.119.182.12 (Islamabad)'
    });
  };

  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool.name || !newSchool.slug) return;

    tenantService.create({
      slug: newSchool.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: newSchool.name,
      type: newSchool.type,
      status: 'active',
      planId: newSchool.planId,
      studentLimit: newSchool.planId === 'plan-starter' ? 150 : (newSchool.planId === 'plan-standard' ? 500 : 1500),
      teacherLimit: newSchool.planId === 'plan-starter' ? 10 : (newSchool.planId === 'plan-standard' ? 30 : 75),
      subscriptionEndDate: '2027-10-12',
      branding: {
        schoolName: newSchool.name,
        tagline: 'Committed to Academic Excellence',
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '#1e3a8a',
        secondaryColor: '#0d9488',
        phone: newSchool.phone || '+92 42 35889900',
        whatsapp: newSchool.phone || '+92 300 1234567',
        email: `info@${newSchool.slug}.edu.pk`,
        address: `Main Boulevard, Phase 1, ${newSchool.city}`,
        city: newSchool.city,
        province: 'Punjab',
        principalName: newSchool.principalName || 'Principal Incharge',
        academicSession: '2026-2027',
        affiliationBoard: newSchool.affiliationBoard,
        aboutText: `${newSchool.name} is a premier educational institute dedicated to quality learning and character building.`,
        heroHeadline: 'Welcome to ' + newSchool.name,
        heroSubheadline: 'Admissions open for Session 2026-2027.'
      }
    });

    refreshTenants();
    setIsAddModalOpen(false);
    toast(`School "${newSchool.name}" successfully created!`, 'success');
  };

  const handleJump = (tenantId: string) => {
    switchTenant(tenantId);
    switchRole('school_admin');
    navigate('/school/dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Registered Schools & Tenants</h1>
          <p className="text-xs text-slate-400">Manage institutional tenants, plans, and active statuses</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New School</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search school name, city, or slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Statuses ({tenants.length})</option>
            <option value="active">Active Only</option>
            <option value="trial">Trial Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">School Details</th>
                <th className="py-3 px-3">City & Board</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Students</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredTenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-700/30 transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                        style={{ backgroundColor: t.branding.primaryColor || '#1e3a8a' }}
                      >
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">{t.branding.schoolName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Principal: {t.branding.principalName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-medium text-slate-200 block">{t.branding.city}</span>
                    <span className="text-[10px] text-slate-400">{t.branding.affiliationBoard}</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="capitalize px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 text-[10px]">
                      {t.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="font-bold text-white">{t.activeStudentCount}</span>
                    <span className="text-slate-500"> / {t.studentLimit} max</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      onClick={() => handleToggleStatus(t.id, t.name)}
                      title="Click to toggle status"
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                        t.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                          : t.status === 'trial'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800 hover:bg-amber-900'
                          : 'bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900'
                      }`}
                    >
                      {t.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/s/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                        title="View Public Website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleJump(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold transition"
                      >
                        <span>ERP</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard New School Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Pakistani School Tenant"
        subtitle="Registers an independent database space and branding configuration"
      >
        <form onSubmit={handleCreateSchool} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">School / Academy Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Crescent Model High School"
              value={newSchool.name}
              onChange={e => setNewSchool({ ...newSchool, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Tenant Slug (Subdomain) *</label>
              <input
                type="text"
                required
                placeholder="crescent-model"
                value={newSchool.slug}
                onChange={e => setNewSchool({ ...newSchool, slug: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Institution Type</label>
              <select
                value={newSchool.type}
                onChange={e => setNewSchool({ ...newSchool, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="school">High School (Matric)</option>
                <option value="academy">Cambridge / Islamic Academy</option>
                <option value="tuition_center">Tuition & Coaching Center</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">City in Pakistan</label>
              <select
                value={newSchool.city}
                onChange={e => setNewSchool({ ...newSchool, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="Lahore">Lahore</option>
                <option value="Karachi">Karachi</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Faisalabad">Faisalabad</option>
                <option value="Multan">Multan</option>
                <option value="Peshawar">Peshawar</option>
                <option value="Quetta">Quetta</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Affiliation Board</label>
              <input
                type="text"
                placeholder="e.g. BISE Lahore / Federal Board"
                value={newSchool.affiliationBoard}
                onChange={e => setNewSchool({ ...newSchool, affiliationBoard: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Principal / Incharge Name</label>
              <input
                type="text"
                placeholder="e.g. Prof. Tariq Jamil"
                value={newSchool.principalName}
                onChange={e => setNewSchool({ ...newSchool, principalName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Contact Phone / WhatsApp</label>
              <input
                type="tel"
                placeholder="+92 300 1234567"
                value={newSchool.phone}
                onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Subscription Plan Assigned</label>
            <select
              value={newSchool.planId}
              onChange={e => setNewSchool({ ...newSchool, planId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-blue-900"
            >
              <option value="plan-starter">Taleem Starter (Max 150 Students) — PKR 4,500/mo</option>
              <option value="plan-standard">Taleem Standard (Max 500 Students) — PKR 9,500/mo</option>
              <option value="plan-pro">Taleem Enterprise (Max 1500 Students) — PKR 18,000/mo</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
            >
              Provision Tenant Space
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
