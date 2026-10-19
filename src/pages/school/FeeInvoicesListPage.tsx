import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { feeService, studentService, classService, exportService } from '../../services';
import { feeApiAdapter } from '../../services/dataAdapter';
import { FeeInvoice, FeePayment, SchoolClass } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { FeeReceiptModal } from '../../components/print/FeeReceiptModal';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  AlertCircle,
  FileText,
  Layers,
  Edit2,
  Trash2,
  Zap,
  Info
} from 'lucide-react';

export const FeeInvoicesListPage: React.FC = () => {
  const { currentTenant, currentUser, storageMode, toast } = useApp();
  const [invoices, setInvoices] = useState<FeeInvoice[]>(() => feeService.getInvoices(currentTenant.id));
  const students = studentService.getAll(currentTenant.id);
  const [classes, setClasses] = useState<SchoolClass[]>(() => classService.getAll(currentTenant.id));

  // Active view tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'structures'>('invoices');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Modals
  const [isNewChallanModalOpen, setIsNewChallanModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<FeeInvoice | null>(null);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<FeeInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<FeeInvoice | null>(null);

  // Edit Fee Structure Modal
  const [editingStructureClass, setEditingStructureClass] = useState<SchoolClass | null>(null);
  const [structureFeeAmount, setStructureFeeAmount] = useState<number>(5000);

  // New Invoice Form
  const [challanForm, setChallanForm] = useState({
    studentId: students[0]?.id || '',
    feeMonth: 'October 2026',
    dueDate: '2026-10-15',
    tuitionFee: 5000,
    examFee: 0,
    admissionFee: 0,
    otherCharges: 0,
    discount: 0,
    lateFee: 0
  });

  // Batch Generation Form
  const [batchForm, setBatchForm] = useState({
    classId: 'all',
    feeMonth: 'October 2026',
    dueDate: '2026-10-15'
  });

  // Payment Record Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'cash' as FeePayment['paymentMethod'],
    transactionRef: ''
  });

  const [actionLoading, setActionLoading] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      const invs = await feeApiAdapter.getInvoices(currentTenant.id, undefined, storageMode);
      setInvoices(invs);
    } catch (err: any) {
      console.warn('Failed to load invoices from API:', err);
      setInvoices(feeService.getInvoices(currentTenant.id));
    }
    setClasses(classService.getAll(currentTenant.id));
  }, [currentTenant.id, storageMode]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.studentName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.admissionNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesMonth = monthFilter === 'all' || inv.feeMonth === monthFilter;
    const matchesClass = classFilter === 'all' || inv.classId === classFilter;
    return matchesSearch && matchesStatus && matchesMonth && matchesClass;
  });

  const handleOpenPayment = (inv: FeeInvoice) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentForm({
      amount: inv.balance,
      paymentMethod: 'cash',
      transactionRef: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    if (paymentForm.amount <= 0 || paymentForm.amount > selectedInvoiceForPayment.balance) {
      toast('Payment amount must be greater than zero and cannot exceed remaining balance', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
      const result = await feeApiAdapter.recordPayment({
        tenantId: currentTenant.id,
        invoiceId: selectedInvoiceForPayment.id,
        amount: Number(paymentForm.amount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: paymentForm.paymentMethod,
        receivedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
        transactionRef: paymentForm.transactionRef || `TRX-${Date.now().toString().slice(-6)}`,
        idempotencyKey
      }, storageMode);

      await refreshList();
      setIsPaymentModalOpen(false);
      toast(`Payment of PKR ${Number(paymentForm.amount).toLocaleString()} recorded for ${selectedInvoiceForPayment.studentName}`, 'success');

      // Prompt user with printable receipt
      setSelectedInvoiceForReceipt(result.invoice);
    } catch (err: any) {
      toast(err.message || 'Failed to record payment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === challanForm.studentId);
    if (!st) return;

    const tuition = Number(challanForm.tuitionFee) || 5000;
    const exam = Number(challanForm.examFee) || 0;
    const admission = Number(challanForm.admissionFee) || 0;
    const other = Number(challanForm.otherCharges) || 0;
    const disc = Number(challanForm.discount) || 0;
    const late = Number(challanForm.lateFee) || 0;

    const total = Math.max(0, tuition + exam + admission + other + late - disc);

    try {
      setActionLoading(true);
      await feeApiAdapter.createInvoice({
        tenantId: currentTenant.id,
        studentId: st.id,
        feeMonth: challanForm.feeMonth,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: challanForm.dueDate,
        tuitionFee: tuition,
        examFee: exam,
        admissionFee: admission,
        otherCharges: other,
        discount: disc
      }, storageMode);

      await refreshList();
      setIsNewChallanModalOpen(false);
      toast(`Fee Challan issued for ${st.name} (PKR ${total.toLocaleString()})`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to generate challan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await feeApiAdapter.createInvoice({
        tenantId: currentTenant.id,
        classId: batchForm.classId === 'all' ? undefined : batchForm.classId,
        feeMonth: batchForm.feeMonth,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: batchForm.dueDate
      }, storageMode);

      await refreshList();
      setIsBatchModalOpen(false);
      toast(res.message || `Batch generated fee challans for ${batchForm.feeMonth}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to batch generate challans', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStructureClass) return;

    classService.update(editingStructureClass.id, {
      monthlyTuitionFee: Number(structureFeeAmount)
    });

    refreshList();
    setEditingStructureClass(null);
    toast(`Fee rate for ${editingStructureClass.name} updated to PKR ${structureFeeAmount.toLocaleString()}`, 'success');
  };

  const handleDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    feeService.deleteInvoice(invoiceToDelete.id);
    refreshList();
    toast(`Challan ${invoiceToDelete.invoiceNo} cancelled and removed`, 'info');
    setInvoiceToDelete(null);
  };

  const handleExportCsv = () => {
    const headers = ['Invoice No', 'Student', 'Class', 'Month', 'Tuition', 'Discount', 'Total (PKR)', 'Paid', 'Balance', 'Status', 'Due Date'];
    const rows = filteredInvoices.map(i => [
      i.invoiceNo,
      i.studentName,
      i.className,
      i.feeMonth,
      i.tuitionFee,
      i.discount,
      i.totalAmount,
      i.amountPaid,
      i.balance,
      i.status,
      i.dueDate
    ]);
    exportService.downloadCsv(`${currentTenant.slug}_fee_invoices`, headers, rows);
    toast('Invoices exported to CSV', 'success');
  };

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + i.balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fee Invoices & Bank Challans</h1>
          <p className="text-xs text-slate-500">
            Monthly vouchers, class fee structures, collection ledger, and 3-part bank receipts in PKR
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="bg-slate-200/80 p-0.5 rounded-lg flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'invoices' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fee Vouchers ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('structures')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'structures' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Class Fee Structures ({classes.length})
            </button>
          </div>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Batch Generate</span>
          </button>

          <button
            onClick={() => setIsNewChallanModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Challan</span>
          </button>
        </div>
      </div>

      {/* Demo Records Notification Banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>DEMO BILLING ENGINE:</strong> All invoices and payments are simulated records in local state. No live payment gateway or banking API is connected.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
          Demo Mode
        </span>
      </div>

      {activeTab === 'invoices' ? (
        <>
          {/* Financial Health Mini Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Invoiced (PKR)</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">PKR {totalBilled.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400">Total ledger receivables</span>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 shadow-xs">
              <span className="text-[11px] text-emerald-700 font-semibold uppercase">Recovered Amount</span>
              <p className="text-2xl font-bold text-emerald-800 mt-1">PKR {totalCollected.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% recovery rate
              </span>
            </div>
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 shadow-xs">
              <span className="text-[11px] text-rose-700 font-semibold uppercase">Pending Dues</span>
              <p className="text-2xl font-bold text-rose-800 mt-1">PKR {totalOutstanding.toLocaleString()}</p>
              <span className="text-[10px] text-rose-600">Awaiting parent deposits</span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col lg:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full lg:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by student, challan no, admission no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>

              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Challan / Invoice</th>
                    <th className="py-3 px-3">Student & Class</th>
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Paid</th>
                    <th className="py-3 px-3">Balance</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No fee vouchers found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNo}
                          <span className="text-[10px] text-slate-400 block font-normal font-sans">
                            Due: {inv.dueDate}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 block">{inv.studentName}</span>
                          <span className="text-[10px] text-slate-500">{inv.className} ({inv.admissionNo})</span>
                        </td>
                        <td className="py-3 px-3 font-medium text-blue-900">{inv.feeMonth}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          PKR {inv.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-emerald-700">
                          PKR {inv.amountPaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-700">
                          PKR {inv.balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.balance > 0 && (
                              <button
                                onClick={() => handleOpenPayment(inv)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition shadow-xs"
                              >
                                Record Payment
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedInvoiceForReceipt(inv)}
                              title="Print 3-Part Bank Challan Slip"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInvoiceToDelete(inv)}
                              title="Cancel Invoice"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Class Fee Structures Tab */
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Class-wise Tuition Fee Schedule</h3>
                <p className="text-xs text-slate-500">Standard monthly tuition rates applied when batching fee challans</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-3">Grade</th>
                    <th className="py-3 px-3">Monthly Tuition Fee</th>
                    <th className="py-3 px-3">Admission Fee (One-Time)</th>
                    <th className="py-3 px-3">Annual Charges</th>
                    <th className="py-3 px-3">Enrolled Students</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map(cls => {
                    const stCount = students.filter(s => s.classId === cls.id).length;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{cls.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">Grade {cls.gradeNumeric}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-800 text-sm">
                          PKR {cls.monthlyTuitionFee.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          PKR {(cls.monthlyTuitionFee * 1.5).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          PKR {(cls.monthlyTuitionFee * 0.5).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-900">{stCount} students</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingStructureClass(cls);
                              setStructureFeeAmount(cls.monthlyTuitionFee);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Modify Rate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {selectedInvoiceForPayment && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Fee Payment for ${selectedInvoiceForPayment.studentName}`}
          subtitle={`Challan: ${selectedInvoiceForPayment.invoiceNo} • Month: ${selectedInvoiceForPayment.feeMonth}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs text-slate-800">
            {/* Demo notice inside modal */}
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Simulated payment entry. Updates student ledger and emits printable challan voucher.</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Total Invoiced:</span>
                <span className="font-bold text-slate-900 font-mono">
                  PKR {selectedInvoiceForPayment.totalAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Already Paid:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  PKR {selectedInvoiceForPayment.amountPaid.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Outstanding Balance:</span>
                <span className="font-bold text-rose-700 font-mono">
                  PKR {selectedInvoiceForPayment.balance.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Amount Receiving (PKR) *</label>
              <input
                type="number"
                required
                max={selectedInvoiceForPayment.balance}
                min={1}
                value={paymentForm.amount}
                onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Supports partial deposits. Balance updates automatically.
              </span>
            </div>

            <div>
              <label className="block font-semibold mb-1">Payment Method / Channel *</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="cash">Cash (Counter Deposit)</option>
                <option value="easypaisa">Easypaisa Mobile Account / QR</option>
                <option value="jazzcash">JazzCash Mobile Wallet</option>
                <option value="bank_transfer">Direct Bank Transfer / IBFT</option>
                <option value="online">1Bill Voucher / Online Portal</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Bank Receipt / Transaction Ref (Optional)</label>
              <input
                type="text"
                placeholder="e.g. MBL-887419 or Slip-001"
                value={paymentForm.transactionRef}
                onChange={e => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
              >
                Record Payment & Print Voucher
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Generate Single Challan Modal */}
      <Modal
        isOpen={isNewChallanModalOpen}
        onClose={() => setIsNewChallanModalOpen(false)}
        title="Issue Monthly Student Fee Challan"
        subtitle="Calculates tuition, exam, concessions, and generates 3-part bank slip"
      >
        <form onSubmit={handleCreateChallan} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Select Student *</label>
            <select
              value={challanForm.studentId}
              onChange={e => {
                const st = students.find(s => s.id === e.target.value);
                setChallanForm({
                  ...challanForm,
                  studentId: e.target.value,
                  tuitionFee: st?.monthlyFee || 5000
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.className} • Roll {s.rollNo})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Billing Month *</label>
              <input
                type="text"
                required
                value={challanForm.feeMonth}
                onChange={e => setChallanForm({ ...challanForm, feeMonth: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Due Date</label>
              <input
                type="date"
                required
                value={challanForm.dueDate}
                onChange={e => setChallanForm({ ...challanForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Tuition Fee (PKR) *</label>
              <input
                type="number"
                required
                value={challanForm.tuitionFee}
                onChange={e => setChallanForm({ ...challanForm, tuitionFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Exam Charges</label>
              <input
                type="number"
                value={challanForm.examFee}
                onChange={e => setChallanForm({ ...challanForm, examFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Sibling Concession / Discount</label>
              <input
                type="number"
                value={challanForm.discount}
                onChange={e => setChallanForm({ ...challanForm, discount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Late Fine (If overdue)</label>
              <input
                type="number"
                value={challanForm.lateFee}
                onChange={e => setChallanForm({ ...challanForm, lateFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-rose-700"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewChallanModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs"
            >
              Issue Challan
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Generate Challans Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Batch Generate Class Fee Challans"
        subtitle="Automates fee vouchers for all enrolled students according to class fee rates"
      >
        <form onSubmit={handleBatchGenerate} className="space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-semibold mb-1">Select Target Class</label>
            <select
              value={batchForm.classId}
              onChange={e => setBatchForm({ ...batchForm, classId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="all">All School Classes (Whole Student Body)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Billing Month</label>
              <input
                type="text"
                required
                value={batchForm.feeMonth}
                onChange={e => setBatchForm({ ...batchForm, feeMonth: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Due Date</label>
              <input
                type="date"
                required
                value={batchForm.dueDate}
                onChange={e => setBatchForm({ ...batchForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
            <span className="font-semibold block mb-1">Batch Run Preview:</span>
            <span>
              Will generate separate fee vouchers for active students in the selected grade at each student's designated monthly fee rate.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs"
            >
              Generate Challans Now
            </button>
          </div>
        </form>
      </Modal>

      {/* Modify Class Fee Structure Modal */}
      {editingStructureClass && (
        <Modal
          isOpen={true}
          onClose={() => setEditingStructureClass(null)}
          title={`Modify Fee Rate for ${editingStructureClass.name}`}
          subtitle="Updates default monthly tuition rate for this grade"
        >
          <form onSubmit={handleSaveStructure} className="space-y-4 text-xs text-slate-800">
            <div>
              <label className="block font-semibold mb-1">Monthly Tuition Fee (PKR) *</label>
              <input
                type="number"
                required
                min={500}
                value={structureFeeAmount}
                onChange={e => setStructureFeeAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono font-bold text-base"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStructureClass(null)}
                className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs"
              >
                Save Rate
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setInvoiceToDelete(null)}
          onConfirm={handleDeleteInvoice}
          title={`Cancel Invoice: ${invoiceToDelete.invoiceNo}`}
          message={`Are you sure you want to cancel and delete invoice ${invoiceToDelete.invoiceNo} for ${invoiceToDelete.studentName}? This action cannot be undone.`}
          confirmLabel="Yes, Delete Challan"
          variant="danger"
        />
      )}

      {/* Printable 3-Part Bank Challan Modal */}
      {selectedInvoiceForReceipt && (
        <FeeReceiptModal
          isOpen={true}
          onClose={() => setSelectedInvoiceForReceipt(null)}
          invoice={selectedInvoiceForReceipt}
          tenant={currentTenant}
        />
      )}
    </div>
  );
};
