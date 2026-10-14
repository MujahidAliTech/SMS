import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
  Laptop
} from 'lucide-react';

interface DemoCredential {
  role: UserRole;
  title: string;
  email: string;
  password: string;
  school: string;
  badge: string;
  color: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    role: 'school_admin',
    title: 'School Administrator (Malik Asif)',
    email: 'admin@brightfuture.edu.pk',
    password: 'Password123!',
    school: 'Bright Future High School (Lahore)',
    badge: 'School ERP',
    color: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  {
    role: 'super_admin',
    title: 'Platform Super Admin (Tariq Mahmood)',
    email: 'tariq@taleemcloud.pk',
    password: 'Password123!',
    school: 'TaleemCloud Platform HQ',
    badge: 'Platform Owner',
    color: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  {
    role: 'teacher',
    title: 'Senior Teacher (Sir Zeeshan)',
    email: 'zeeshan@brightfuture.edu.pk',
    password: 'Password123!',
    school: 'Bright Future High School (Lahore)',
    badge: 'Teacher Portal',
    color: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  {
    role: 'accountant',
    title: 'Accountant (Farooq Ahmed)',
    email: 'accounts@brightfuture.edu.pk',
    password: 'Password123!',
    school: 'Bright Future High School (Lahore)',
    badge: 'Accounts Desk',
    color: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  {
    role: 'parent',
    title: 'Parent (Mohammad Rizwan)',
    email: 'rizwan.father@gmail.com',
    password: 'Password123!',
    school: 'Bright Future High School (Lahore)',
    badge: 'Parent App',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  {
    role: 'student',
    title: 'Student (Hamza Rizwan)',
    email: 'hamza.rizwan@student.pk',
    password: 'Password123!',
    school: 'Bright Future High School (Lahore)',
    badge: 'Student Portal',
    color: 'bg-slate-50 text-slate-800 border-slate-200'
  }
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchRole, storageMode, setStorageMode, toast } = useApp();

  // Form State
  const [email, setEmail] = useState('admin@brightfuture.edu.pk');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active tab: 'server_auth' (Cloudflare Worker & D1) vs 'local_demo' (Simulation)
  const [activeTab, setActiveTab] = useState<'server_auth' | 'local_demo'>('server_auth');

  const redirectByRole = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        navigate('/super-admin/dashboard');
        break;
      case 'school_admin':
      case 'principal':
        navigate('/school/dashboard');
        break;
      case 'teacher':
        navigate('/teacher/dashboard');
        break;
      case 'parent':
        navigate('/parent/dashboard');
        break;
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'accountant':
        navigate('/school/fees');
        break;
      default:
        navigate('/school/dashboard');
    }
  };

  /**
   * Handle Live Server Authentication via POST /api/v1/auth/login
   */
  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your registered email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success && result.user) {
        redirectByRole(result.user.role);
      } else {
        setErrorMessage(result.error || 'Invalid credentials or connection error.');
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Quick-fill demo account details into form
   */
  const handleQuickFill = (cred: DemoCredential) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setErrorMessage(null);
    toast(`Loaded credentials for ${cred.title}`, 'info');
  };

  /**
   * Offline/Local Storage Demo Mode Handler (Explicitly development only)
   */
  const handleLocalDemoLogin = (role: UserRole) => {
    switchRole(role);
    setStorageMode('local_storage');
    toast(`Entering demo dashboard as ${role.replace('_', ' ')} (Local Storage)`, 'info');
    redirectByRole(role);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-900/20">
          <GraduationCap className="w-7 h-7 text-teal-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Sign In to TaleemCloud
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Multi-Tenant Cloud ERP for Schools, Academies & Tuition Centers in Pakistan.
        </p>
      </div>

      {/* Authentication Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200 justify-center">
        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('server_auth')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'server_auth'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-blue-600" />
            <span>Cloudflare Worker & D1 Login (Production Backend)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local_demo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'local_demo'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4 text-amber-600" />
            <span>Local Storage Demo (Development Simulation)</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Cloudflare Worker & D1 Authentication Form */}
      {activeTab === 'server_auth' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Login Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  Account Authentication
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Worker API v1
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Credentials are authenticated against Cloudflare D1 with PBKDF2-SHA256 and secure HttpOnly cookie sessions.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Authentication Failed</span>
                  {errorMessage}
                </div>
              </div>
            )}

            <form onSubmit={handleServerLogin} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. admin@brightfuture.edu.pk"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Default demo: <code className="bg-slate-100 px-1 py-0.5 rounded">Password123!</code>
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full pl-9 pr-10 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                    <span>Verifying Credentials on Cloudflare...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-teal-300" />
                    <span>Sign In via Cloudflare Worker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tenant isolation enforced server-side</span>
              <span className="text-teal-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                Session Encrypted
              </span>
            </div>
          </div>

          {/* Quick-Fill Demo Personas Helper Panel */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Quick-Fill Demo Accounts
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Click any role below to autofill verified test credentials into the login form:
              </p>
            </div>

            <div className="space-y-2">
              {DEMO_CREDENTIALS.map(cred => (
                <div
                  key={cred.email}
                  onClick={() => handleQuickFill(cred)}
                  className={`p-3 rounded-xl border bg-white hover:border-blue-400 hover:shadow-xs transition cursor-pointer flex items-center justify-between group ${
                    email === cred.email ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900 transition">
                        {cred.title.split('(')[0].trim()}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${cred.color}`}>
                        {cred.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {cred.email}
                    </span>
                  </div>

                  <span className="text-xs text-blue-700 font-semibold group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                    Fill →
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 text-[11px] text-blue-950 space-y-1">
              <span className="font-bold block">Developer Note:</span>
              <p className="text-slate-600 leading-normal">
                All accounts use PBKDF2 hash of <code>Password123!</code> with 100,000 rounds. Lockout activates after 5 failed attempts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Explicit Development / Local Storage Simulation */}
      {activeTab === 'local_demo' && (
        <div className="space-y-6">
          {/* Security Disclaimer Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>OFFLINE / LOCAL STORAGE SIMULATION MODE (DEVELOPMENT ONLY)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              This mode operates completely within browser <code>localStorage</code> via <code>MockStorageAdapter</code>. It is provided strictly for offline testing and does not communicate with Cloudflare D1 or provide production security.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Select Demo Persona (Local Storage):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_CREDENTIALS.map(item => (
                <div
                  key={item.role}
                  onClick={() => handleLocalDemoLogin(item.role)}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-amber-400 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition">
                        {item.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.color}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {item.school} • Mock Role: <code>{item.role}</code>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-800 group-hover:text-amber-900">
                    <span>Simulate as {item.title.split(' ')[0]} →</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
