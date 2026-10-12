import React from 'react';
import { StudentResult, Tenant } from '../../types';
import { Modal } from '../common/Modal';
import { Printer, Award, CheckCircle } from 'lucide-react';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  result?: StudentResult;
  tenant: Tenant;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  result,
  tenant
}) => {
  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Academic Report Card"
      subtitle="Official Board standard grade assessment card"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="no-print flex justify-end pb-2 border-b border-slate-200">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report Card
          </button>
        </div>

        {/* Official Card Body */}
        <div className="border-2 border-slate-700 rounded-xl p-6 bg-white text-slate-800 relative">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-300">
            <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">{tenant.branding.schoolName}</h2>
            <p className="text-xs text-slate-600">{tenant.branding.address}, {tenant.branding.city}</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{tenant.branding.affiliationBoard}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-wider">
              {result.examTitle} • PROGRESS REPORT
            </div>
          </div>

          {/* Student Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs border-b border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Student Name</span>
              <span className="font-bold text-slate-900 text-sm">{result.studentName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Roll Number</span>
              <span className="font-mono font-semibold text-slate-800">{result.rollNo}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Class & Section</span>
              <span className="font-semibold text-slate-800">{result.className}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Session</span>
              <span className="font-semibold text-slate-800">{tenant.branding.academicSession}</span>
            </div>
          </div>

          {/* Marks Table */}
          <div className="py-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-y border-slate-300">
                  <th className="py-2 px-3 text-left">Subject</th>
                  <th className="py-2 px-2 text-center">Total Marks</th>
                  <th className="py-2 px-2 text-center">Passing</th>
                  <th className="py-2 px-2 text-center">Obtained Marks</th>
                  <th className="py-2 px-2 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {result.subjectsMarks.map((sm, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2 px-3 font-medium text-slate-800">{sm.subjectName}</td>
                    <td className="py-2 px-2 text-center font-mono">{sm.totalMarks}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500">{sm.passingMarks}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-900">{sm.obtainedMarks}</td>
                    <td className="py-2 px-2 text-center font-bold">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        sm.grade.startsWith('A') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {sm.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-100 font-bold">
                  <td className="py-2.5 px-3">GRAND TOTAL</td>
                  <td className="py-2.5 px-2 text-center font-mono">{result.totalMarks}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                  <td className="py-2.5 px-2 text-center font-mono text-blue-900 text-sm">{result.totalObtained}</td>
                  <td className="py-2.5 px-2 text-center text-blue-900 text-sm">{result.grade}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Percentage</span>
              <span className="text-base font-bold text-blue-900">{result.percentage}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Position</span>
              <span className="text-base font-bold text-emerald-700">
                {result.positionInClass ? `${result.positionInClass}${result.positionInClass === 1 ? 'st' : result.positionInClass === 2 ? 'nd' : 'rd'}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Final Result</span>
              <span className={`text-base font-bold uppercase ${result.status === 'pass' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {result.status}
              </span>
            </div>
          </div>

          {/* Teacher Remarks */}
          <div className="mt-4 p-3 border border-slate-200 rounded-lg bg-amber-50/40 text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Teacher Remarks:</span>
            <p className="text-slate-600 italic leading-relaxed">"{result.teacherRemarks}"</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-10 mt-6 text-center text-xs text-slate-600 border-t border-slate-200">
            <div>
              <div className="border-t border-slate-400 w-28 mx-auto mb-1"></div>
              <span>Class Teacher</span>
            </div>
            <div>
              <div className="border-t border-slate-400 w-28 mx-auto mb-1"></div>
              <span>Exam Controller</span>
            </div>
            <div>
              <div className="border-t border-slate-400 w-28 mx-auto mb-1"></div>
              <span>Principal</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
