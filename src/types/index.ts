export type UserRole = 
  | 'super_admin' 
  | 'school_admin' 
  | 'principal' 
  | 'teacher' 
  | 'accountant' 
  | 'parent' 
  | 'student';

export interface TenantBranding {
  schoolName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  province: string;
  principalName: string;
  academicSession: string; // e.g. "2026-2027"
  affiliationBoard: string; // e.g. "BISE Lahore", "Federal Board", "Cambridge"
  aboutText: string;
  heroHeadline: string;
  heroSubheadline: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  type: 'school' | 'academy' | 'tuition_center';
  status: 'active' | 'suspended' | 'trial';
  planId: string;
  branding: TenantBranding;
  studentLimit: number;
  teacherLimit: number;
  activeStudentCount: number;
  activeTeacherCount: number;
  createdAt: string;
  subscriptionEndDate: string;
}

export interface User {
  id: string;
  tenantId?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  linkedEntityId?: string; // studentId, teacherId, or parentId
}

export interface Student {
  id: string;
  tenantId: string;
  admissionNo: string;
  name: string;
  fatherName: string;
  motherName?: string;
  gender: 'Male' | 'Female';
  dob: string; // YYYY-MM-DD
  admissionDate: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  rollNo: string;
  parentContact: string;
  emergencyContact?: string;
  address: string;
  bFormOrCnic: string;
  previousSchool?: string;
  status: 'active' | 'inactive' | 'alumni' | 'struck_off';
  photoUrl?: string;
  photoKey?: string;
  parentId: string;
  monthlyFee: number;
}

export interface Parent {
  id: string;
  tenantId: string;
  name: string;
  fatherOrHusbandName?: string;
  cnic: string;
  phone: string;
  whatsapp: string;
  email: string;
  occupation: string;
  address: string;
  childrenIds: string[];
}

export interface TeacherStaff {
  id: string;
  tenantId: string;
  teacherCode?: string; // e.g. TCH-01
  name: string;
  role: 'teacher' | 'principal' | 'accountant' | 'staff';
  designation: string;
  qualification: string;
  subjects: string[];
  assignedClasses: string[];
  joiningDate: string;
  phone: string;
  email: string;
  cnic: string;
  employmentStatus: 'active' | 'leave' | 'resigned';
  salaryMonthly: number; // PKR
  photoUrl?: string;
  photoKey?: string;
}

export interface SchoolClass {
  id: string;
  tenantId: string;
  name: string; // e.g., "Class 9", "Class 10", "Matric Part 1", "O-Level Year 1"
  gradeNumeric: number;
  sections: string[]; // section names e.g. ["A", "B"]
  classTeacherName?: string;
  capacity: number;
  totalStudents: number;
  monthlyTuitionFee: number;
}

export interface Subject {
  id: string;
  tenantId: string;
  classId: string;
  name: string; // e.g. "Mathematics", "Urdu", "Islamiat", "Physics"
  code: string;
  teacherId?: string;
  teacherName?: string;
  totalMarks: number;
  passingMarks: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  classId: string;
  sectionId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface FeeInvoice {
  id: string;
  tenantId: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  className: string;
  feeMonth: string; // e.g., "October 2026"
  issueDate: string;
  dueDate: string;
  tuitionFee: number;
  examFee?: number;
  admissionFee?: number;
  otherCharges?: number;
  discount: number;
  lateFee: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  academicSession?: string;
  concessionType?: string;
  concessionReason?: string;
  concessionApprovedBy?: string;
  feeItems?: Array<{ headName: string; amount: number }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeePayment {
  id: string;
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'online';
  transactionRef?: string;
  receivedBy: string;
  isReversed?: boolean;
  reversalId?: string;
  createdAt?: string;
}

export interface FeeHeadItem {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  isRecurring: boolean;
  defaultAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureItem {
  id: string;
  tenantId: string;
  classId: string;
  className: string;
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
  academicSession: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeAuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  performedByUserId: string;
  performedByUserName: string;
  createdAt: string;
}

export interface Exam {
  id: string;
  tenantId: string;
  title: string;
  session: string;
  term: 'First Term' | 'Mid Term' | 'Pre-Board' | 'Final Term' | 'Monthly Test';
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'announced';
}

export interface SubjectMarks {
  subjectId: string;
  subjectName: string;
  totalMarks: number;
  obtainedMarks: number;
  passingMarks: number;
  grade: string;
  remarks?: string;
}

export interface StudentResult {
  id: string;
  tenantId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  className: string;
  subjectsMarks: SubjectMarks[];
  totalMarks: number;
  totalObtained: number;
  percentage: number;
  grade: string; // A+, A, B, C, D, F
  positionInClass?: number;
  status: 'pass' | 'fail';
  teacherRemarks: string;
}

export interface TimetableEntry {
  id: string;
  tenantId: string;
  classId: string;
  className: string;
  section: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  periodNo: number;
  startTime: string; // "08:00 AM"
  endTime: string;   // "08:45 AM"
  subjectName: string;
  teacherName: string;
  roomNo: string;
}

export interface Homework {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  section: string;
  subjectName: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  status: 'active' | 'closed';
  attachmentName?: string;
}

export interface AdmissionApplication {
  id: string;
  tenantId: string;
  applicationNo: string;
  applicantName: string;
  fatherName: string;
  classApplied: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: string;
  dob: string;
  gender: 'Male' | 'Female';
  previousSchool?: string;
  submissionDate: string;
  status: 'new' | 'under_review' | 'approved' | 'rejected';
  notes?: string;
}

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  targetAudience: 'everyone' | 'teachers' | 'parents' | 'students' | 'selected_class';
  targetClassName?: string;
  isUrdu?: boolean;
  status: 'draft' | 'published';
  authorName: string;
  createdAt: string;
}

export interface SchoolEvent {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  time: string;
  location: string;
  category: 'academic' | 'sports' | 'cultural' | 'holiday' | 'exam';
  audience: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthlyPkr: number;
  priceYearlyPkr: number;
  studentLimit: number;
  teacherLimit: number;
  features: string[];
  isPopular?: boolean;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  schoolName: string;
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'past_due' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  expiryDate: string;
  renewalDate: string;
  amountPkr: number;
  autoRenew: boolean;
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  schoolName?: string;
  actorName: string;
  role: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}
