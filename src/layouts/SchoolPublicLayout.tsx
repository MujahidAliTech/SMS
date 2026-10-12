import React, { useState } from 'react';
import { Outlet, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { tenantService } from '../services';
import { useApp } from '../context/AppContext';
import { DemoBanner } from '../components/common/DemoBanner';
import { ToastContainer } from '../components/common/ToastContainer';
import {
  GraduationCap,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Calendar,
  Users,
  Award
} from 'lucide-react';

export const SchoolPublicLayout: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentTenant } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Find tenant by URL slug or fallback to currentTenant
  const school = slug ? tenantService.getBySlug(slug) || currentTenant : currentTenant;
  const branding = school.branding;

  const publicNavLinks = [
    { label: 'Home', path: `/s/${school.slug}` },
    { label: 'About Us', path: `/s/${school.slug}/about` },
    { label: 'Programs & Classes', path: `/s/${school.slug}/classes` },
    { label: 'Faculty', path: `/s/${school.slug}/faculty` },
    { label: 'Admissions 2026', path: `/s/${school.slug}/admissions` },
    { label: 'Notice Board', path: `/s/${school.slug}/announcements` },
    { label: 'Contact', path: `/s/${school.slug}/contact` }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <DemoBanner />
      <ToastContainer />

      {/* Top School Contact Strip */}
      <div 
        className="text-white text-xs py-2 px-4 shadow-xs"
        style={{ backgroundColor: branding.primaryColor || '#1e3a8a' }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-300" />
              <span>{branding.phone}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-300" />
              <span>{branding.email}</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5 font-mono text-teal-200">
              Affiliation: {branding.affiliationBoard}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {branding.whatsapp && (
              <a
                href={`https://wa.me/${branding.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition shadow-xs"
              >
                <MessageCircle className="w-3 h-3" />
                <span>WhatsApp Desk</span>
              </a>
            )}
            <Link
              to="/login"
              className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[10px] font-semibold text-white transition"
            >
              Portal Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main School Website Header */}
      <header className="sticky top-[33px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & School Name */}
          <Link to={`/s/${school.slug}`} className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden shrink-0"
              style={{ backgroundColor: branding.primaryColor || '#1e3a8a' }}
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.schoolName} className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                {branding.schoolName}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                {branding.tagline}
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {publicNavLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-xs font-semibold tracking-wide uppercase transition ${
                    isActive
                      ? 'text-blue-900 border-b-2 border-blue-900 pb-1'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA Admission Button */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to={`/s/${school.slug}/admissions`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md transition hover:opacity-90"
              style={{ backgroundColor: branding.secondaryColor || '#0d9488' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply for Admission</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-2">
            {publicNavLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-900"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <Link
                to={`/s/${school.slug}/admissions`}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 text-xs font-bold text-white rounded-lg"
                style={{ backgroundColor: branding.secondaryColor || '#0d9488' }}
              >
                Apply for Admission (2026-2027)
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* School Public Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800 text-xs">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                {branding.schoolName}
              </h4>
              <p className="text-slate-400 leading-relaxed mb-3">
                {branding.aboutText.slice(0, 160)}...
              </p>
              <p className="text-teal-400 font-semibold">
                Affiliation: {branding.affiliationBoard}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Campus Location</h4>
              <p className="text-slate-400 flex items-start gap-2 mb-2">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{branding.address}, {branding.city}, {branding.province}, Pakistan</span>
              </p>
              <p className="text-slate-400 flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Phone: {branding.phone}</span>
              </p>
              <p className="text-slate-400 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Email: {branding.email}</span>
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Student & Parent Desk</h4>
              <p className="text-slate-400 mb-3 leading-relaxed">
                Registered parents and faculty can access real-time fee receipts, attendance, homework, and exam results through the portal.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white font-semibold transition"
              >
                <span>Access Student & Parent Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} {branding.schoolName}. All rights reserved.</p>
            <p className="text-slate-600">
              Powered by <Link to="/" className="text-teal-400 hover:underline">TaleemCloud PK</Link> — Multi-Tenant School ERP
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
