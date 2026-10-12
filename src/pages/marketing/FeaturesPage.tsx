import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  CalendarCheck,
  FileSpreadsheet,
  Clock,
  BookOpen,
  Users,
  Smartphone,
  Globe,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useApp();

  const handleLaunch = () => {
    switchRole('school_admin');
    navigate('/school/dashboard');
  };

  const featureModules = [
    {
      icon: CreditCard,
      color: 'bg-blue-100 text-blue-700',
      title: 'Pakistani Fee & Challan Management',
      description: 'Streamline monthly collection with customizable fee heads (Tuition, Computer, Exam, Sports) and print ready 3-part bank slips.',
      points: [
        'Automatic late fine calculations after the 10th or 15th of each month',
        'Sibling concession and scholarship percentage discounts',
        'Partial payments with instant receipt printouts in PKR',
        'Cash, Bank, Easypaisa, and JazzCash payment tracking',
        'Printable thermal and 3-copy A4 bank deposit vouchers'
      ]
    },
    {
      icon: CalendarCheck,
      color: 'bg-teal-100 text-teal-700',
      title: 'Class-Wise Daily Attendance Roster',
      description: 'Mark morning attendance in under 15 seconds. Track students who are Present, Absent, Late, or on Medical Leave.',
      points: [
        'Single-click "Mark All Present" with quick toggling for absentees',
        'Monthly percentage attendance registers for board compliance',
        'Instant WhatsApp and SMS template generation for absent students',
        'Student attendance history and chronic absenteeism flags',
        'Mobile-optimized for classroom teachers on Android phones'
      ]
    },
    {
      icon: FileSpreadsheet,
      color: 'bg-purple-100 text-purple-700',
      title: 'Exams, Results & Report Cards',
      description: 'Complete examination lifecycle from schedule datesheet to board-standard progress report generation.',
      points: [
        'Configurable passing marks, subject totals, and grading schemas',
        'Automatic percentage, grade (A+, A, B, C, D, F), and class position calculation',
        'Subject-wise marks entry by designated class teachers',
        'Printable progress report cards with teacher remarks and signatures',
        'Mid-Term, Pre-Board, and Final Term session history'
      ]
    },
    {
      icon: Clock,
      color: 'bg-amber-100 text-amber-700',
      title: 'Timetable Scheduling & Clash Prevention',
      description: 'Construct weekly school periods, room assignments, and teacher schedules without double-booking.',
      points: [
        'Weekly period schedule from 8:00 AM assembly to dismissal',
        'Automatic alert when a teacher is assigned to two rooms at the same time',
        'Class-wise and Teacher-wise timetable views',
        'Student timetable display on parent and student portals',
        'Support for 6-day (Monday through Saturday) Pakistani school schedules'
      ]
    },
    {
      icon: Users,
      color: 'bg-emerald-100 text-emerald-700',
      title: 'Multi-Child Parent & Student Portal',
      description: 'Empower parents to stay engaged with their children’s education without needing to physically visit the school office.',
      points: [
        'Single parent login with effortless switching between siblings',
        'Real-time view of unpaid fee dues, due dates, and payment history',
        'Access to daily homework assignments and subject study notes',
        'View term progress report cards as soon as announced',
        'Receive official school announcements in English and Urdu'
      ]
    },
    {
      icon: Globe,
      color: 'bg-indigo-100 text-indigo-700',
      title: 'School Website Builder & Online Admissions',
      description: 'Every school gets an independent, branded public presence with customizable colors, contact info, and admission forms.',
      points: [
        'School logo, brand colors, principal message, and mission statement',
        'Course catalog and class admission fee schedules',
        'Public online admission inquiry form that converts directly to student profile',
        'Official notice board and upcoming school events calendar',
        'Dedicated WhatsApp quick chat desk for parents'
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Enterprise-Grade Modules</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Comprehensive Features Built for Pakistani Institutes
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Explore the modules designed to eliminate administrative confusion, speed up fee collection, and give your institute a world-class digital image.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {featureModules.map((module, idx) => {
          const Icon = module.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${module.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{module.title}</h3>
                  <p className="text-xs text-slate-500">{module.description}</p>
                </div>
              </div>
              <ul className="space-y-2.5 pt-2 border-t border-slate-100">
                {module.points.map((pt, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-8">
        <button
          onClick={handleLaunch}
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <span>Test All Features in Live School Admin Demo</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
