import React from 'react';
import { FeeInvoice, FeePayment, Tenant } from '../../types';
import { Modal } from '../common/Modal';
import { Printer, Download, CheckCircle2 } from 'lucide-react';

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: FeeInvoice;
  payment?: FeePayment;
  tenant: Tenant;
}

export const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  payment,
  tenant
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptNo = payment?.receiptNo || `REC-${invoice.invoiceNo.replace(/[^0-9]/g, '').slice(-6)}`;
  const dateStr = payment?.paymentDate || invoice.issueDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Fee Challan & Receipt"
      subtitle="Printable 3-part slip format compliant with Pakistani school accounting"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Modal Controls */}
        <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Status:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
              invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {invoice.status}
            </span>
            <span>• Due Date: {invoice.dueDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </div>
        </div>

        {/* Printable Voucher Section (3 Column Challan for Pakistani Schools) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-800 bg-white p-2">
          {['STUDENT COPY', 'ACCOUNTS COPY', 'BANK / ARCHIVE COPY'].map((copyTitle, copyIdx) => (
            <div 
              key={copyIdx} 
              className="border border-slate-300 rounded-lg p-3.5 text-xs flex flex-col justify-between relative bg-slate-50/30"
            >
              {/* Top Watermark / Badge */}
              <div className="text-center pb-2 border-b border-slate-200">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-slate-200/80 px-2 py-0.5 rounded">
                  {copyTitle}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1.5 truncate">
                  {tenant.branding.schoolName}
                </h4>
                <p className="text-[10px] text-slate-500 truncate">{tenant.branding.address}, {tenant.branding.city}</p>
                <p className="text-[10px] text-slate-400 font-mono">Affiliation: {tenant.branding.affiliationBoard}</p>
              </div>

              {/* Invoice & Student Meta */}
              <div className="py-2.5 border-b border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold">{receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Challan No:</span>
                  <span className="font-mono">{invoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-semibold">{invoice.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission No:</span>
                  <span>{invoice.admissionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Class:</span>
                  <span>{invoice.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Month:</span>
                  <span className="font-medium text-blue-900">{invoice.feeMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issue / Paid:</span>
                  <span>{dateStr}</span>
                </div>
              </div>

              {/* Fee Breakdown Table */}
              <div className="py-2 flex-1">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="text-left font-medium pb-1">Head</th>
                      <th className="text-right font-medium pb-1">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-1">Tuition Fee</td>
                      <td className="text-right font-mono font-medium">{invoice.tuitionFee.toLocaleString()}</td>
                    </tr>
                    {invoice.examFee ? (
                      <tr>
                        <td className="py-1">Exam Charges</td>
                        <td className="text-right font-mono">{invoice.examFee.toLocaleString()}</td>
                      </tr>
                    ) : null}
                    {invoice.admissionFee ? (
                      <tr>
                        <td className="py-1">Admission Fee</td>
                        <td className="text-right font-mono">{invoice.admissionFee.toLocaleString()}</td>
                      </tr>
                    ) : null}
                    {invoice.otherCharges ? (
                      <tr>
                        <td className="py-1">Lab / Misc</td>
                        <td className="text-right font-mono">{invoice.otherCharges.toLocaleString()}</td>
                      </tr>
                    ) : null}
                    {invoice.discount ? (
                      <tr className="text-emerald-700">
                        <td className="py-1">Concession / Sibling</td>
                        <td className="text-right font-mono">-{invoice.discount.toLocaleString()}</td>
                      </tr>
                    ) : null}
                    {invoice.lateFee ? (
                      <tr className="text-rose-700">
                        <td className="py-1">Late Fine</td>
                        <td className="text-right font-mono">+{invoice.lateFee.toLocaleString()}</td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-800 font-bold text-slate-900">
                      <td className="pt-1.5">Net Payable:</td>
                      <td className="text-right pt-1.5 font-mono text-xs">PKR {invoice.totalAmount.toLocaleString()}</td>
                    </tr>
                    <tr className="text-[10px] text-slate-600">
                      <td>Paid:</td>
                      <td className="text-right font-mono">PKR {invoice.amountPaid.toLocaleString()}</td>
                    </tr>
                    <tr className="text-[10px] font-semibold text-rose-600">
                      <td>Remaining:</td>
                      <td className="text-right font-mono">PKR {invoice.balance.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 mt-2 flex justify-between items-end text-[9px] text-slate-500">
                <div className="text-center">
                  <div className="border-t border-slate-400 w-16 mb-0.5"></div>
                  <span>Depositor</span>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 w-16 mb-0.5"></div>
                  <span>Cashier / Stamp</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="no-print text-center text-xs text-slate-400 italic">
          Tip: Use Landscape mode in printer settings to print all 3 copies across a standard A4 sheet.
        </p>
      </div>
    </Modal>
  );
};
