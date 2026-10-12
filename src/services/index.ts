import { MockStorageAdapter } from './storage';
import {
  Tenant,
  User,
  Student,
  Parent,
  TeacherStaff,
  SchoolClass,
  Subject,
  AttendanceRecord,
  FeeInvoice,
  FeePayment,
  Exam,
  StudentResult,
  TimetableEntry,
  Homework,
  AdmissionApplication,
  Announcement,
  SchoolEvent,
  SubscriptionPlan,
  TenantSubscription,
  AuditLog
} from '../types';

export const tenantService = {
  getAll(): Tenant[] {
    return MockStorageAdapter.getTenants();
  },
  getById(id: string): Tenant | undefined {
    return MockStorageAdapter.getTenants().find(t => t.id === id);
  },
  getBySlug(slug: string): Tenant | undefined {
    return MockStorageAdapter.getTenants().find(t => t.slug === slug);
  },
  update(id: string, updates: Partial<Tenant>): Tenant {
    const list = MockStorageAdapter.getTenants();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Tenant not found');
    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    MockStorageAdapter.setTenants(list);
    return updated;
  },
  create(newTenant: Omit<Tenant, 'id' | 'createdAt' | 'activeStudentCount' | 'activeTeacherCount'>): Tenant {
    const list = MockStorageAdapter.getTenants();
    const id = `tenant-${Date.now()}`;
    const created: Tenant = {
      ...newTenant,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      activeStudentCount: 0,
      activeTeacherCount: 0
    };
    list.unshift(created);
    MockStorageAdapter.setTenants(list);
    return created;
  },
  toggleStatus(id: string): Tenant {
    const tenant = this.getById(id);
    if (!tenant) throw new Error('Tenant not found');
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    return this.update(id, { status: nextStatus });
  }
};

export const studentService = {
  getAll(tenantId: string): Student[] {
    return MockStorageAdapter.getStudents().filter(s => s.tenantId === tenantId);
  },
  getById(id: string): Student | undefined {
    return MockStorageAdapter.getStudents().find(s => s.id === id);
  },
  create(data: Omit<Student, 'id'>): Student {
    const list = MockStorageAdapter.getStudents();
    const created: Student = {
      ...data,
      id: `student-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setStudents(list);

    // Update tenant student count
    const tenant = tenantService.getById(data.tenantId);
    if (tenant) {
      tenantService.update(tenant.id, {
        activeStudentCount: tenant.activeStudentCount + 1
      });
    }

    return created;
  },
  update(id: string, updates: Partial<Student>): Student {
    const list = MockStorageAdapter.getStudents();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setStudents(list);
    return list[idx];
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getStudents();
    const found = list.find(s => s.id === id);
    if (found) {
      const filtered = list.filter(s => s.id !== id);
      MockStorageAdapter.setStudents(filtered);
      const tenant = tenantService.getById(found.tenantId);
      if (tenant && tenant.activeStudentCount > 0) {
        tenantService.update(tenant.id, {
          activeStudentCount: tenant.activeStudentCount - 1
        });
      }
    }
  }
};

export const parentService = {
  getAll(tenantId: string): Parent[] {
    return MockStorageAdapter.getParents().filter(p => p.tenantId === tenantId);
  },
  getById(id: string): Parent | undefined {
    return MockStorageAdapter.getParents().find(p => p.id === id);
  },
  create(data: Omit<Parent, 'id'>): Parent {
    const list = MockStorageAdapter.getParents();
    const created: Parent = {
      ...data,
      id: `parent-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setParents(list);
    return created;
  },
  update(id: string, updates: Partial<Parent>): Parent {
    const list = MockStorageAdapter.getParents();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Parent not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setParents(list);
    return list[idx];
  }
};

export const teacherStaffService = {
  getAll(tenantId: string): TeacherStaff[] {
    return MockStorageAdapter.getTeachers().filter(t => t.tenantId === tenantId);
  },
  getById(id: string): TeacherStaff | undefined {
    return MockStorageAdapter.getTeachers().find(t => t.id === id);
  },
  create(data: Omit<TeacherStaff, 'id'>): TeacherStaff {
    const list = MockStorageAdapter.getTeachers();
    const created: TeacherStaff = {
      ...data,
      id: `teacher-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setTeachers(list);

    const tenant = tenantService.getById(data.tenantId);
    if (tenant) {
      tenantService.update(tenant.id, {
        activeTeacherCount: tenant.activeTeacherCount + 1
      });
    }

    return created;
  },
  update(id: string, updates: Partial<TeacherStaff>): TeacherStaff {
    const list = MockStorageAdapter.getTeachers();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Staff not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setTeachers(list);
    return list[idx];
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getTeachers();
    const found = list.find(t => t.id === id);
    if (found) {
      MockStorageAdapter.setTeachers(list.filter(t => t.id !== id));
      const tenant = tenantService.getById(found.tenantId);
      if (tenant && tenant.activeTeacherCount > 0) {
        tenantService.update(tenant.id, {
          activeTeacherCount: tenant.activeTeacherCount - 1
        });
      }
    }
  }
};

export const classService = {
  getAll(tenantId: string): SchoolClass[] {
    return MockStorageAdapter.getClasses().filter(c => c.tenantId === tenantId);
  },
  getById(id: string): SchoolClass | undefined {
    return MockStorageAdapter.getClasses().find(c => c.id === id);
  },
  create(data: Omit<SchoolClass, 'id'>): SchoolClass {
    const list = MockStorageAdapter.getClasses();
    const created: SchoolClass = {
      ...data,
      id: `class-${Date.now()}`
    };
    list.push(created);
    MockStorageAdapter.setClasses(list);
    return created;
  },
  update(id: string, updates: Partial<SchoolClass>): SchoolClass {
    const list = MockStorageAdapter.getClasses();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Class not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setClasses(list);
    return list[idx];
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getClasses().filter(c => c.id !== id);
    MockStorageAdapter.setClasses(list);
  }
};

export const subjectService = {
  getAll(tenantId: string, classId?: string): Subject[] {
    let list = MockStorageAdapter.getSubjects().filter(s => s.tenantId === tenantId);
    if (classId) {
      list = list.filter(s => s.classId === classId);
    }
    return list;
  },
  create(data: Omit<Subject, 'id'>): Subject {
    const list = MockStorageAdapter.getSubjects();
    const created: Subject = {
      ...data,
      id: `sub-${Date.now()}`
    };
    list.push(created);
    MockStorageAdapter.setSubjects(list);
    return created;
  },
  update(id: string, updates: Partial<Subject>): Subject {
    const list = MockStorageAdapter.getSubjects();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Subject not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setSubjects(list);
    return list[idx];
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getSubjects().filter(s => s.id !== id);
    MockStorageAdapter.setSubjects(list);
  }
};

export const attendanceService = {
  getRecords(tenantId: string, date: string, classId?: string): AttendanceRecord[] {
    let list = MockStorageAdapter.getAttendance().filter(a => a.tenantId === tenantId && a.date === date);
    if (classId) {
      list = list.filter(a => a.classId === classId);
    }
    return list;
  },
  saveRecords(tenantId: string, records: AttendanceRecord[]): void {
    const all = MockStorageAdapter.getAttendance();
    const recordIds = new Set(records.map(r => r.id));
    // Keep records not updated here
    const remaining = all.filter(r => !(r.tenantId === tenantId && recordIds.has(r.id)));
    MockStorageAdapter.setAttendance([...records, ...remaining]);
  },
  getHistory(tenantId: string, studentId?: string, classId?: string): AttendanceRecord[] {
    let list = MockStorageAdapter.getAttendance().filter(a => a.tenantId === tenantId);
    if (studentId) list = list.filter(a => a.studentId === studentId);
    if (classId) list = list.filter(a => a.classId === classId);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }
};

export const feeService = {
  getInvoices(tenantId: string): FeeInvoice[] {
    return MockStorageAdapter.getInvoices().filter(inv => inv.tenantId === tenantId);
  },
  getInvoiceById(id: string): FeeInvoice | undefined {
    return MockStorageAdapter.getInvoices().find(i => i.id === id);
  },
  getPayments(tenantId: string): FeePayment[] {
    return MockStorageAdapter.getPayments().filter(p => p.tenantId === tenantId);
  },
  createInvoice(data: Omit<FeeInvoice, 'id'>): FeeInvoice {
    const list = MockStorageAdapter.getInvoices();
    const created: FeeInvoice = {
      ...data,
      id: `inv-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setInvoices(list);
    return created;
  },
  deleteInvoice(id: string): void {
    const list = MockStorageAdapter.getInvoices().filter(i => i.id !== id);
    MockStorageAdapter.setInvoices(list);
  },
  recordPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: FeePayment['paymentMethod'];
    receivedBy: string;
    transactionRef?: string;
  }): { invoice: FeeInvoice; payment: FeePayment } {
    const invoices = MockStorageAdapter.getInvoices();
    const invIdx = invoices.findIndex(i => i.id === data.invoiceId);
    if (invIdx === -1) throw new Error('Invoice not found');

    const inv = invoices[invIdx];
    const newPaid = inv.amountPaid + data.amount;
    const newBalance = Math.max(0, inv.totalAmount - newPaid);
    const newStatus: FeeInvoice['status'] = newBalance === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');

    invoices[invIdx] = {
      ...inv,
      amountPaid: newPaid,
      balance: newBalance,
      status: newStatus
    };
    MockStorageAdapter.setInvoices(invoices);

    const payment: FeePayment = {
      id: `pay-${Date.now()}`,
      tenantId: inv.tenantId,
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      studentId: inv.studentId,
      studentName: inv.studentName,
      amount: data.amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: data.paymentMethod,
      transactionRef: data.transactionRef,
      receivedBy: data.receivedBy
    };

    const payments = MockStorageAdapter.getPayments();
    payments.unshift(payment);
    MockStorageAdapter.setPayments(payments);

    return { invoice: invoices[invIdx], payment };
  }
};

export const examService = {
  getExams(tenantId: string): Exam[] {
    return MockStorageAdapter.getExams().filter(e => e.tenantId === tenantId);
  },
  createExam(data: Omit<Exam, 'id'>): Exam {
    const list = MockStorageAdapter.getExams();
    const created: Exam = {
      ...data,
      id: `exam-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setExams(list);
    return created;
  },
  updateExam(id: string, updates: Partial<Exam>): Exam {
    const list = MockStorageAdapter.getExams();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Exam not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setExams(list);
    return list[idx];
  },
  deleteExam(id: string): void {
    const list = MockStorageAdapter.getExams().filter(e => e.id !== id);
    MockStorageAdapter.setExams(list);
  },
  getResults(tenantId: string, examId?: string, studentId?: string): StudentResult[] {
    let list = MockStorageAdapter.getResults().filter(r => r.tenantId === tenantId);
    if (examId) list = list.filter(r => r.examId === examId);
    if (studentId) list = list.filter(r => r.studentId === studentId);
    return list;
  },
  deleteResult(id: string): void {
    const list = MockStorageAdapter.getResults().filter(r => r.id !== id);
    MockStorageAdapter.setResults(list);
  },
  calculateGrade(percentage: number): string {
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  },
  saveResult(data: Omit<StudentResult, 'id'>): StudentResult {
    const list = MockStorageAdapter.getResults();
    const created: StudentResult = {
      ...data,
      id: `res-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setResults(list);
    return created;
  },
  saveMarksForStudent(params: {
    tenantId: string;
    examId: string;
    examTitle: string;
    studentId: string;
    studentName: string;
    rollNo: string;
    classId: string;
    className: string;
    subjectsMarks: {
      subjectId: string;
      subjectName: string;
      totalMarks: number;
      obtainedMarks: number;
      passingMarks: number;
    }[];
    teacherRemarks?: string;
  }): StudentResult {
    const list = MockStorageAdapter.getResults();
    const evaluatedMarks = params.subjectsMarks.map(sm => {
      const pct = sm.totalMarks > 0 ? (sm.obtainedMarks / sm.totalMarks) * 100 : 0;
      return {
        ...sm,
        grade: this.calculateGrade(pct)
      };
    });

    const totalMarks = evaluatedMarks.reduce((sum, m) => sum + m.totalMarks, 0);
    const totalObtained = evaluatedMarks.reduce((sum, m) => sum + m.obtainedMarks, 0);
    const percentage = totalMarks > 0 ? Math.round((totalObtained / totalMarks) * 1000) / 10 : 0;
    const grade = this.calculateGrade(percentage);
    const hasFailedAny = evaluatedMarks.some(m => m.obtainedMarks < m.passingMarks);
    const status: 'pass' | 'fail' = (hasFailedAny || percentage < 40) ? 'fail' : 'pass';

    const existingIdx = list.findIndex(r => r.tenantId === params.tenantId && r.examId === params.examId && r.studentId === params.studentId);
    const resultObj: StudentResult = {
      id: existingIdx !== -1 ? list[existingIdx].id : `res-${Date.now()}`,
      tenantId: params.tenantId,
      examId: params.examId,
      examTitle: params.examTitle,
      studentId: params.studentId,
      studentName: params.studentName,
      rollNo: params.rollNo,
      classId: params.classId,
      className: params.className,
      subjectsMarks: evaluatedMarks,
      totalMarks,
      totalObtained,
      percentage,
      grade,
      status,
      teacherRemarks: params.teacherRemarks || (status === 'pass' ? 'Good effort and overall academic progress.' : 'Needs significant focus in upcoming assessments.')
    };

    if (existingIdx !== -1) {
      list[existingIdx] = resultObj;
    } else {
      list.unshift(resultObj);
    }
    MockStorageAdapter.setResults(list);
    return resultObj;
  }
};

export const timetableService = {
  getAll(tenantId: string, classId?: string): TimetableEntry[] {
    let list = MockStorageAdapter.getTimetable().filter(t => t.tenantId === tenantId);
    if (classId) list = list.filter(t => t.classId === classId);
    return list;
  },
  create(data: Omit<TimetableEntry, 'id'>): TimetableEntry {
    const list = MockStorageAdapter.getTimetable();
    const created: TimetableEntry = {
      ...data,
      id: `tt-${Date.now()}`
    };
    list.push(created);
    MockStorageAdapter.setTimetable(list);
    return created;
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getTimetable().filter(t => t.id !== id);
    MockStorageAdapter.setTimetable(list);
  }
};

export const homeworkService = {
  getAll(tenantId: string, classId?: string): Homework[] {
    let list = MockStorageAdapter.getHomework().filter(h => h.tenantId === tenantId);
    if (classId) list = list.filter(h => h.classId === classId);
    return list;
  },
  create(data: Omit<Homework, 'id'>): Homework {
    const list = MockStorageAdapter.getHomework();
    const created: Homework = {
      ...data,
      id: `hw-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setHomework(list);
    return created;
  },
  update(id: string, updates: Partial<Homework>): Homework {
    const list = MockStorageAdapter.getHomework();
    const idx = list.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Homework not found');
    list[idx] = { ...list[idx], ...updates };
    MockStorageAdapter.setHomework(list);
    return list[idx];
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getHomework().filter(h => h.id !== id);
    MockStorageAdapter.setHomework(list);
  }
};

export const admissionService = {
  getAll(tenantId: string): AdmissionApplication[] {
    return MockStorageAdapter.getAdmissions().filter(a => a.tenantId === tenantId);
  },
  submitApplication(data: Omit<AdmissionApplication, 'id' | 'applicationNo' | 'submissionDate' | 'status'>): AdmissionApplication {
    const list = MockStorageAdapter.getAdmissions();
    const created: AdmissionApplication = {
      ...data,
      id: `adm-${Date.now()}`,
      applicationNo: `APP-26-${Math.floor(100 + Math.random() * 900)}`,
      submissionDate: new Date().toISOString().split('T')[0],
      status: 'new'
    };
    list.unshift(created);
    MockStorageAdapter.setAdmissions(list);
    return created;
  },
  updateStatus(id: string, status: AdmissionApplication['status']): AdmissionApplication {
    const list = MockStorageAdapter.getAdmissions();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Application not found');
    list[idx] = { ...list[idx], status };
    MockStorageAdapter.setAdmissions(list);
    return list[idx];
  },
  convertToStudent(applicationId: string, classId: string, sectionId: string, rollNo: string): Student {
    const app = MockStorageAdapter.getAdmissions().find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    const classes = MockStorageAdapter.getClasses();
    const cls = classes.find(c => c.id === classId) || classes[0];

    // Create or find mock parent
    const parents = MockStorageAdapter.getParents();
    let parent = parents.find(p => p.phone === app.phone && p.tenantId === app.tenantId);
    if (!parent) {
      parent = {
        id: `parent-${Date.now()}`,
        tenantId: app.tenantId,
        name: app.fatherName,
        phone: app.phone,
        whatsapp: app.whatsapp,
        email: app.email || '',
        occupation: 'Business/Service',
        address: app.address,
        cnic: '35202-0000000-1',
        childrenIds: []
      };
      parents.push(parent);
      MockStorageAdapter.setParents(parents);
    }

    const student = studentService.create({
      tenantId: app.tenantId,
      admissionNo: `BFS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      name: app.applicantName,
      fatherName: app.fatherName,
      gender: app.gender,
      dob: app.dob,
      admissionDate: new Date().toISOString().split('T')[0],
      classId: cls.id,
      className: cls.name,
      sectionId: sectionId || 'sec-a',
      sectionName: 'A',
      rollNo: rollNo || '01',
      parentContact: app.phone,
      address: app.address,
      bFormOrCnic: '35202-xxxxxxx-x',
      previousSchool: app.previousSchool,
      status: 'active',
      parentId: parent.id,
      monthlyFee: cls.monthlyTuitionFee
    });

    this.updateStatus(applicationId, 'approved');
    return student;
  }
};

export const announcementService = {
  getAll(tenantId: string): Announcement[] {
    return MockStorageAdapter.getAnnouncements().filter(a => a.tenantId === tenantId);
  },
  create(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
    const list = MockStorageAdapter.getAnnouncements();
    const created: Announcement = {
      ...data,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    list.unshift(created);
    MockStorageAdapter.setAnnouncements(list);
    return created;
  },
  delete(id: string): void {
    const list = MockStorageAdapter.getAnnouncements().filter(a => a.id !== id);
    MockStorageAdapter.setAnnouncements(list);
  }
};

export const eventService = {
  getAll(tenantId: string): SchoolEvent[] {
    return MockStorageAdapter.getEvents().filter(e => e.tenantId === tenantId);
  },
  create(data: Omit<SchoolEvent, 'id'>): SchoolEvent {
    const list = MockStorageAdapter.getEvents();
    const created: SchoolEvent = {
      ...data,
      id: `evt-${Date.now()}`
    };
    list.unshift(created);
    MockStorageAdapter.setEvents(list);
    return created;
  }
};

export const subscriptionService = {
  getPlans(): SubscriptionPlan[] {
    return MockStorageAdapter.getPlans();
  },
  getSubscriptions(): TenantSubscription[] {
    return MockStorageAdapter.getSubscriptions();
  },
  getByTenantId(tenantId: string): TenantSubscription | undefined {
    return MockStorageAdapter.getSubscriptions().find(s => s.tenantId === tenantId);
  },
  updatePlan(tenantId: string, planId: string): TenantSubscription {
    const plans = MockStorageAdapter.getPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    const subs = MockStorageAdapter.getSubscriptions();
    const idx = subs.findIndex(s => s.tenantId === tenantId);
    if (idx === -1) throw new Error('Subscription not found');

    subs[idx] = {
      ...subs[idx],
      planId: plan.id,
      planName: plan.name,
      amountPkr: subs[idx].billingCycle === 'monthly' ? plan.priceMonthlyPkr : plan.priceYearlyPkr
    };
    MockStorageAdapter.setSubscriptions(subs);

    // Update tenant limits
    const tenant = tenantService.getById(tenantId);
    if (tenant) {
      tenantService.update(tenantId, {
        planId: plan.id,
        studentLimit: plan.studentLimit,
        teacherLimit: plan.teacherLimit
      });
    }

    return subs[idx];
  }
};

export const auditLogService = {
  getAll(tenantId?: string): AuditLog[] {
    const list = MockStorageAdapter.getAuditLogs();
    if (tenantId) return list.filter(l => l.tenantId === tenantId);
    return list;
  },
  logAction(data: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const list = MockStorageAdapter.getAuditLogs();
    const item: AuditLog = {
      ...data,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    list.unshift(item);
    MockStorageAdapter.setAuditLogs(list);
  }
};

export const exportService = {
  downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
