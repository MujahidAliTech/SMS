import React, { useState } from 'react';
import { subscriptionService, auditLogService } from '../../services';
import { SubscriptionPlan, TenantSubscription, AuditLog } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useApp } from '../../context/AppContext';
import {
  Award,
  CreditCard,
  History,
  Settings,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldAlert,
  Server,
  Database,
  CloudRain
} from 'lucide-react';

export const PlansListPage: React.FC = () => {
  const plans = subscriptionService.getPlans();
  const { toast } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">SaaS Subscription Plans</h1>
        <p className="text-xs text-slate-400">Configure pricing tiers, student thresholds, and feature gates in PKR</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{plan.name}</span>
                {plan.isPopular && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60 text-[10px] font-bold">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4">{plan.description}</p>
              
              <div className="space-y-1 py-3 border-y border-slate-700/60">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Monthly:</span>
                  <span className="font-bold text-white">PKR {plan.priceMonthlyPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Annual:</span>
                  <span className="font-bold text-emerald-400">PKR {plan.priceYearlyPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Max Students:</span>
                  <span className="font-semibold text-white">{plan.studentLimit}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Max Teachers:</span>
                  <span className="font-semibold text-white">{plan.teacherLimit}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase block">Included Modules:</span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => toast(`Editing plan schema for ${plan.name} is enabled in settings`, 'info')}
              className="mt-6 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-lg transition"
            >
              Configure Plan Limits
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SubscriptionsListPage: React.FC = () => {
  const subscriptions = subscriptionService.getSubscriptions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">School Subscriptions & MRR</h1>
          <p className="text-xs text-slate-400">Active billing contracts, cycle renewals, and subscription states</p>
        </div>
      </div>

      <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">School</th>
                <th className="py-3 px-3">Plan Assigned</th>
                <th className="py-3 px-3">Billing Cycle</th>
                <th className="py-3 px-3">Contract Value</th>
                <th className="py-3 px-3">Renewal Date</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {subscriptions.map(s => (
                <tr key={s.id} className="hover:bg-slate-700/30 transition">
                  <td className="py-3 px-4 font-bold text-white">{s.schoolName}</td>
                  <td className="py-3 px-3 font-semibold text-purple-300">{s.planName}</td>
                  <td className="py-3 px-3 capitalize">{s.billingCycle}</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    PKR {s.amountPkr.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{s.renewalDate}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.status === 'active'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AuditLogsPage: React.FC = () => {
  const logs = auditLogService.getAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">System Security & Audit Trail</h1>
        <p className="text-xs text-slate-400">Immutable trace of administrative actions, fee approvals, and attendance events</p>
      </div>

      <div className="bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">School / Tenant</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Details</th>
                <th className="py-3 px-4">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-700/30 transition">
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3 px-3 font-medium text-white">
                    <div>{log.actorName}</div>
                    <div className="text-[10px] text-purple-400 capitalize">{log.role.replace('_', ' ')}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{log.schoolName || 'Platform Global'}</td>
                  <td className="py-3 px-3 font-semibold text-teal-300">{log.action}</td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs">{log.details}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const SuperAdminSettings: React.FC = () => {
  const { toast } = useApp();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white">Platform Infrastructure Settings</h1>
        <p className="text-xs text-slate-400">Configure Cloudflare Edge environment parameters and future database connectors</p>
      </div>

      <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            Cloudflare Architecture Readiness
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Status of the planned serverless backend deployment targets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Hosting Runtime</span>
              <p className="font-bold text-white mt-1">Cloudflare Pages</p>
              <span className="text-teal-400 text-[10px]">Vite SPA Bundle Ready</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">API Backend</span>
              <p className="font-bold text-white mt-1">Cloudflare Workers</p>
              <span className="text-teal-400 text-[10px]">Service abstraction pre-mapped</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Relational Database</span>
              <p className="font-bold text-white mt-1">Cloudflare D1 (SQLite)</p>
              <span className="text-teal-400 text-[10px]">tenantId partition prepared</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-xs font-semibold text-white block">Default Currency</span>
            <span className="text-xs text-slate-400">PKR (Pakistani Rupee) — Configured system-wide</span>
          </div>
          <span className="px-3 py-1 bg-slate-900 text-teal-400 rounded border border-slate-700 text-xs font-mono font-bold">
            PKR (₨)
          </span>
        </div>

        <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-xs font-semibold text-white block">Urdu RTL Support</span>
            <span className="text-xs text-slate-400">Pre-styled Nastaliq typography and RTL orientation</span>
          </div>
          <span className="px-3 py-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-800 text-xs font-bold">
            Enabled
          </span>
        </div>
      </div>
    </div>
  );
};
