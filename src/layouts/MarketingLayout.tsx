import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DemoBanner } from '../components/common/DemoBanner';
import { ToastContainer } from '../components/common/ToastContainer';
import { 
  GraduationCap, 
  Menu, 
  X, 
  Phone, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MarketingLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTenant, switchRole } = useApp();

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing (PKR)', path: '/pricing' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  const handleLaunchDemo = (role: 'school_admin' | 'super_admin' = 'school_admin') => {
    switchRole(role);
    if (role === 'super_admin') {
      navigate('/super-admin/dashboard');
    } else {
      navigate('/school/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <DemoBanner />
      <ToastContainer />

      {/* Main SaaS Navbar */}
      <header className="sticky top-[33px] z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Taleem<span className="text-blue-700">Cloud</span>
              </span>
              <span className="text-[10px] block font-semibold text-teal-700 tracking-wider -mt-1 uppercase">
                Pakistan School SaaS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition ${
                    isActive 
                      ? 'text-blue-800 font-semibold border-b-2 border-blue-800 pb-0.5' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => handleLaunchDemo('school_admin')}
              className="text-xs font-semibold px-3.5 py-2 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition"
            >
              School Admin Login
            </button>
            <button
              onClick={() => handleLaunchDemo('school_admin')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-900/20 transition hover:shadow-md"
            >
              <span>Explore Live Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); handleLaunchDemo('school_admin'); }}
                className="w-full text-center py-2 text-xs font-semibold text-blue-900 bg-blue-50 rounded-lg"
              >
                Launch School Admin Demo
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLaunchDemo('super_admin'); }}
                className="w-full text-center py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
              >
                Platform Super Admin View
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* SaaS Marketing Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
            {/* Col 1: About */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-teal-300" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">TaleemCloud PK</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The all-in-one multi-tenant school management software tailored specifically for private schools, academies, and tuition centers across Pakistan.
              </p>
              <div className="pt-2 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>+92 42 35889900 (Lahore Office)</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp: +92 300 1234567</span>
                </div>
              </div>
            </div>

            {/* Col 2: Solutions */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Tailored Solutions</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to="/solutions" className="hover:text-white transition">Private Matric & FSc Schools</Link></li>
                <li><Link to="/solutions" className="hover:text-white transition">Tuition & Coaching Academies</Link></li>
                <li><Link to="/solutions" className="hover:text-white transition">Cambridge O & A-Level Institutes</Link></li>
                <li><Link to="/solutions" className="hover:text-white transition">Multi-Branch School Networks</Link></li>
                <li><Link to="/solutions" className="hover:text-white transition">Madrasa & Hifz Academies</Link></li>
              </ul>
            </div>

            {/* Col 3: Product Portals */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Included Portals</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><button onClick={() => { switchRole('school_admin'); navigate('/school/dashboard'); }} className="hover:text-white text-left">Principal & Admin ERP</button></li>
                <li><button onClick={() => { switchRole('teacher'); navigate('/teacher/dashboard'); }} className="hover:text-white text-left">Mobile Teacher Portal</button></li>
                <li><button onClick={() => { switchRole('parent'); navigate('/parent/dashboard'); }} className="hover:text-white text-left">Parent Fee & Attendance App</button></li>
                <li><button onClick={() => { switchRole('accountant'); navigate('/school/fees'); }} className="hover:text-white text-left">Accountant Challan & Fee Desk</button></li>
                <li><button onClick={() => { switchRole('super_admin'); navigate('/super-admin/dashboard'); }} className="hover:text-white text-left">SaaS Super Admin Control</button></li>
              </ul>
            </div>

            {/* Col 4: Pakistan Compliance */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Pakistan Ready</h4>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>PKR Currency & 3-Part Bank Challan prints</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>BISE Punjab, Sindh, Federal grading scales</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>JazzCash, Easypaisa & Bank transfer reconciliations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Urdu language and RTL typography support</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <p>© {new Date().getFullYear()} TaleemCloud PK. Built for educational excellence in Pakistan. Cloudflare Edge Architecture Ready.</p>
            <div className="flex items-center gap-4">
              <Link to="/pricing" className="hover:text-slate-300">Pricing</Link>
              <Link to="/about" className="hover:text-slate-300">About</Link>
              <Link to="/contact" className="hover:text-slate-300">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
