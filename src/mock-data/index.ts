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

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    name: 'Taleem Starter',
    slug: 'starter',
    description: 'Perfect for small tuition centers and primary academies up to 150 students.',
    priceMonthlyPkr: 4500,
    priceYearlyPkr: 45000,
    studentLimit: 150,
    teacherLimit: 10,
    features: [
      'Student & Parent Directory',
      'Daily Attendance Marking',
      'Fee Invoicing & Manual Receipts',
      'Exam Result Cards',
      'SMS/WhatsApp Alert Formats',
      'Basic School Public Website',
      'Single User Admin Access'
    ]
  },
  {
    id: 'plan-standard',
    name: 'Taleem Standard',
    slug: 'standard',
    description: 'Designed for established private high schools up to 500 students with multi-role access.',
    priceMonthlyPkr: 9500,
    priceYearlyPkr: 95000,
    studentLimit: 500,
    teacherLimit: 30,
    isPopular: true,
    features: [
      'All Starter Features',
      'Teacher, Parent & Student Portals',
      'Accountant Role & Financial Reports',
      'Printable Thermal/A4 Fee Challans',
      'Timetable Scheduler & Clash Detection',
      'Online Admission Inquiries Portal',
      'Custom Domain & School Website Builder',
      'Export to Excel / CSV'
    ]
  },
  {
    id: 'plan-pro',
    name: 'Taleem Enterprise',
    slug: 'pro',
    description: 'For large educational institutions, multiple branches, and comprehensive college academies.',
    priceMonthlyPkr: 18000,
    priceYearlyPkr: 180000,
    studentLimit: 1500,
    teacherLimit: 75,
    features: [
      'All Standard Features',
      'Unlimited Classes & Sections',
      'Advanced BISE / Cambridge Grade Schemas',
      'Parent Mobile-First PWA Access',
      'Detailed Audit Logs & Activity Tracker',
      'Priority Support via WhatsApp & Phone',
      'Custom Urdu / English Language Branding',
      'Cloudflare R2 Secure Document Archive'
    ]
  }
];

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-bfs',
    slug: 'bright-future-school',
    name: 'Bright Future High School',
    type: 'school',
    status: 'active',
    planId: 'plan-standard',
    studentLimit: 500,
    teacherLimit: 30,
    activeStudentCount: 340,
    activeTeacherCount: 22,
    createdAt: '2024-03-15',
    subscriptionEndDate: '2027-03-15',
    branding: {
      schoolName: 'Bright Future High School',
      tagline: 'Illuminating Minds, Building Character Since 2008',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
      faviconUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=32&auto=format&fit=crop&q=80',
      primaryColor: '#1e3a8a', // Deep Royal Blue
      secondaryColor: '#0d9488', // Teal
      phone: '+92 42 35912345',
      whatsapp: '+92 300 8472910',
      email: 'info@brightfuture.edu.pk',
      address: 'Plot 42, Block C, Canal View Housing Scheme',
      city: 'Lahore',
      province: 'Punjab',
      principalName: 'Prof. Nasreen Akhtar',
      academicSession: '2026-2027',
      affiliationBoard: 'BISE Lahore (Reg # 84920)',
      aboutText: 'Bright Future High School is a premier educational institution committed to providing quality education with moral values, modern STEM laboratories, computer education, and comprehensive sports facilities in Lahore.',
      heroHeadline: 'Excellence in Matriculation & Pre-O Levels',
      heroSubheadline: 'Empowering students from Playgroup to Matriculation with certified faculty and modern computer labs.',
      facebookUrl: 'https://facebook.com/brightfuturelahore',
      youtubeUrl: 'https://youtube.com/@brightfuturelahore'
    }
  },
  {
    id: 'tenant-alnoor',
    slug: 'al-noor-academy',
    name: 'Al-Noor Islamic & Cambridge Academy',
    type: 'academy',
    status: 'active',
    planId: 'plan-pro',
    studentLimit: 1500,
    teacherLimit: 75,
    activeStudentCount: 420,
    activeTeacherCount: 35,
    createdAt: '2023-08-10',
    subscriptionEndDate: '2027-08-10',
    branding: {
      schoolName: 'Al-Noor Islamic & Cambridge Academy',
      tagline: 'Nurturing Intellect and Faith in Harmony',
      logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=120&auto=format&fit=crop&q=80',
      faviconUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=32&auto=format&fit=crop&q=80',
      primaryColor: '#065f46', // Deep Emerald Green
      secondaryColor: '#b45309', // Warm Amber
      phone: '+92 21 34987654',
      whatsapp: '+92 333 2187654',
      email: 'admissions@alnooracademy.edu.pk',
      address: 'Street 14, Block 6, Gulshan-e-Iqbal',
      city: 'Karachi',
      province: 'Sindh',
      principalName: 'Dr. Abdul Qudoos Hashmi',
      academicSession: '2026-2027',
      affiliationBoard: 'Cambridge Assessment & Sindh Board',
      aboutText: 'Al-Noor Academy harmonizes contemporary British curriculum education with Islamic ethics, Tajweed, Arabic language, and state-of-the-art robotic learning.',
      heroHeadline: 'Faith, Knowledge, and Character',
      heroSubheadline: 'Leading British Cambridge O/A-Levels alongside Hifz-ul-Quran programs for well-rounded leaders.',
      facebookUrl: 'https://facebook.com/alnooracademy'
    }
  },
  {
    id: 'tenant-kpt',
    slug: 'knowledge-point-tuition',
    name: 'Knowledge Point Science Academy',
    type: 'tuition_center',
    status: 'trial',
    planId: 'plan-starter',
    studentLimit: 150,
    teacherLimit: 10,
    activeStudentCount: 110,
    activeTeacherCount: 8,
    createdAt: '2026-09-01',
    subscriptionEndDate: '2026-11-01',
    branding: {
      schoolName: 'Knowledge Point Science Academy',
      tagline: 'Top Positions in BISE Rawalpindi & MDCAT Prep',
      logoUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=120&auto=format&fit=crop&q=80',
      faviconUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=32&auto=format&fit=crop&q=80',
      primaryColor: '#4f46e5', // Indigo
      secondaryColor: '#ea580c', // Orange
      phone: '+92 51 4455667',
      whatsapp: '+92 312 5599881',
      email: 'contact@knowledgepoint.pk',
      address: '2nd Floor, Rehman Plaza, Commercial Market, Satellite Town',
      city: 'Rawalpindi',
      province: 'Punjab',
      principalName: 'Engr. Zafar Iqbal Niazi',
      academicSession: '2026-2027',
      affiliationBoard: 'Rawalpindi Board & Federal Board Prep',
      aboutText: 'Specialized evening coaching center for Matric (Class 9-10), Intermediate (FSc Pre-Medical & Pre-Engineering), and entry test MDCAT / ECAT.',
      heroHeadline: 'Score 90%+ in Board Exams & Entry Tests',
      heroSubheadline: 'Small batches, daily chapter-wise MCQ tests, and past paper analysis under renowned college professors.',
      facebookUrl: 'https://facebook.com/knowledgepointpindi'
    }
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-super-1',
    name: 'Tariq Mahmood',
    email: 'tariq@taleemcloud.pk',
    phone: '+92 300 1234567',
    role: 'super_admin'
  },
  {
    id: 'user-admin-bfs',
    tenantId: 'tenant-bfs',
    name: 'Malik Asif',
    email: 'admin@brightfuture.edu.pk',
    phone: '+92 300 8472910',
    role: 'school_admin'
  },
  {
    id: 'user-principal-bfs',
    tenantId: 'tenant-bfs',
    name: 'Prof. Nasreen Akhtar',
    email: 'principal@brightfuture.edu.pk',
    phone: '+92 301 9988776',
    role: 'principal'
  },
  {
    id: 'user-teacher-bfs',
    tenantId: 'tenant-bfs',
    name: 'Sir Zeeshan Haider',
    email: 'zeeshan@brightfuture.edu.pk',
    phone: '+92 321 4455667',
    role: 'teacher',
    linkedEntityId: 'teacher-1'
  },
  {
    id: 'user-accountant-bfs',
    tenantId: 'tenant-bfs',
    name: 'Farooq Ahmed',
    email: 'accounts@brightfuture.edu.pk',
    phone: '+92 333 5566778',
    role: 'accountant',
    linkedEntityId: 'staff-acc-1'
  },
  {
    id: 'user-parent-bfs',
    tenantId: 'tenant-bfs',
    name: 'Mohammad Rizwan',
    email: 'rizwan.father@gmail.com',
    phone: '+92 300 5544332',
    role: 'parent',
    linkedEntityId: 'parent-1'
  },
  {
    id: 'user-student-bfs',
    tenantId: 'tenant-bfs',
    name: 'Hamza Rizwan',
    email: 'hamza.rizwan@student.pk',
    phone: '+92 300 5544332',
    role: 'student',
    linkedEntityId: 'student-1'
  }
];

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 'class-prep',
    tenantId: 'tenant-bfs',
    name: 'Prep',
    gradeNumeric: 0,
    sections: ['Rose', 'Tulip'],
    classTeacherName: 'Ms. Ayesha Siddiqa',
    capacity: 60,
    totalStudents: 48,
    monthlyTuitionFee: 3500
  },
  {
    id: 'class-1',
    tenantId: 'tenant-bfs',
    name: 'Class 1',
    gradeNumeric: 1,
    sections: ['A', 'B'],
    classTeacherName: 'Ms. Saima Bibi',
    capacity: 70,
    totalStudents: 52,
    monthlyTuitionFee: 4000
  },
  {
    id: 'class-5',
    tenantId: 'tenant-bfs',
    name: 'Class 5',
    gradeNumeric: 5,
    sections: ['A', 'B'],
    classTeacherName: 'Ms. Hina Qureshi',
    capacity: 70,
    totalStudents: 58,
    monthlyTuitionFee: 4500
  },
  {
    id: 'class-9',
    tenantId: 'tenant-bfs',
    name: 'Class 9 (Matric Part 1)',
    gradeNumeric: 9,
    sections: ['A (Science)', 'B (Computer)'],
    classTeacherName: 'Sir Zeeshan Haider',
    capacity: 80,
    totalStudents: 74,
    monthlyTuitionFee: 5500
  },
  {
    id: 'class-10',
    tenantId: 'tenant-bfs',
    name: 'Class 10 (Matric Part 2)',
    gradeNumeric: 10,
    sections: ['A (Science)', 'B (Arts)'],
    classTeacherName: 'Sir Bilal Tariq',
    capacity: 80,
    totalStudents: 68,
    monthlyTuitionFee: 6000
  }
];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-9-math',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    name: 'Mathematics',
    code: 'MATH-09',
    teacherId: 'teacher-1',
    teacherName: 'Sir Zeeshan Haider',
    totalMarks: 75,
    passingMarks: 25
  },
  {
    id: 'sub-9-phy',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    name: 'Physics',
    code: 'PHY-09',
    teacherId: 'teacher-1',
    teacherName: 'Sir Zeeshan Haider',
    totalMarks: 60,
    passingMarks: 20
  },
  {
    id: 'sub-9-chem',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    name: 'Chemistry',
    code: 'CHEM-09',
    teacherId: 'teacher-2',
    teacherName: 'Dr. Arshad Mehmood',
    totalMarks: 60,
    passingMarks: 20
  },
  {
    id: 'sub-9-eng',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    name: 'English Compulsory',
    code: 'ENG-09',
    teacherId: 'teacher-3',
    teacherName: 'Sir Nadeem Sarwar',
    totalMarks: 75,
    passingMarks: 25
  },
  {
    id: 'sub-9-urdu',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    name: 'Urdu Lazmi',
    code: 'URD-09',
    teacherId: 'teacher-4',
    teacherName: 'Qari Muhammad Aslam',
    totalMarks: 75,
    passingMarks: 25
  },
  {
    id: 'sub-9-islam',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    name: 'Islamiat Lazmi',
    code: 'ISL-09',
    teacherId: 'teacher-4',
    teacherName: 'Qari Muhammad Aslam',
    totalMarks: 50,
    passingMarks: 17
  }
];

export const INITIAL_TEACHERS_STAFF: TeacherStaff[] = [
  {
    id: 'teacher-1',
    tenantId: 'tenant-bfs',
    name: 'Sir Zeeshan Haider',
    role: 'teacher',
    designation: 'Senior Science Master',
    qualification: 'M.Sc. Physics (Punjab University), B.Ed',
    subjects: ['Physics', 'Mathematics'],
    assignedClasses: ['Class 9 (Matric Part 1)', 'Class 10 (Matric Part 2)'],
    joiningDate: '2020-09-01',
    phone: '+92 321 4455667',
    email: 'zeeshan@brightfuture.edu.pk',
    cnic: '35202-1234567-1',
    employmentStatus: 'active',
    salaryMonthly: 55000,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'teacher-2',
    tenantId: 'tenant-bfs',
    name: 'Dr. Arshad Mehmood',
    role: 'teacher',
    designation: 'Head of Science Department',
    qualification: 'Ph.D. Chemistry (Quaid-e-Azam University)',
    subjects: ['Chemistry', 'General Science'],
    assignedClasses: ['Class 9 (Matric Part 1)', 'Class 10 (Matric Part 2)'],
    joiningDate: '2019-02-15',
    phone: '+92 333 4901234',
    email: 'arshad.chem@brightfuture.edu.pk',
    cnic: '35201-9876543-3',
    employmentStatus: 'active',
    salaryMonthly: 68000,
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'teacher-3',
    tenantId: 'tenant-bfs',
    name: 'Sir Nadeem Sarwar',
    role: 'teacher',
    designation: 'Lecturer English',
    qualification: 'M.A. English Literature (GCU Lahore)',
    subjects: ['English Compulsory', 'Grammar'],
    assignedClasses: ['Class 5', 'Class 9 (Matric Part 1)'],
    joiningDate: '2021-04-10',
    phone: '+92 301 7766554',
    email: 'nadeem.eng@brightfuture.edu.pk',
    cnic: '35202-7766554-9',
    employmentStatus: 'active',
    salaryMonthly: 50000,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'teacher-4',
    tenantId: 'tenant-bfs',
    name: 'Qari Muhammad Aslam',
    role: 'teacher',
    designation: 'Islamic Studies & Arabic Instructor',
    qualification: 'Dars-e-Nizami (Wifaq-ul-Madaris), M.A. Islamiat',
    subjects: ['Islamiat Lazmi', 'Urdu Lazmi', 'Nazra Quran'],
    assignedClasses: ['Class 1', 'Class 5', 'Class 9 (Matric Part 1)'],
    joiningDate: '2018-01-05',
    phone: '+92 345 8899001',
    email: 'qari.aslam@brightfuture.edu.pk',
    cnic: '35202-3344556-7',
    employmentStatus: 'active',
    salaryMonthly: 46000,
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'staff-acc-1',
    tenantId: 'tenant-bfs',
    name: 'Farooq Ahmed',
    role: 'accountant',
    designation: 'Accounts Officer & Bursar',
    qualification: 'B.Com / CMA Inter',
    subjects: [],
    assignedClasses: [],
    joiningDate: '2021-01-01',
    phone: '+92 333 5566778',
    email: 'accounts@brightfuture.edu.pk',
    cnic: '35202-4455667-5',
    employmentStatus: 'active',
    salaryMonthly: 48000,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_PARENTS: Parent[] = [
  {
    id: 'parent-1',
    tenantId: 'tenant-bfs',
    name: 'Mohammad Rizwan',
    fatherOrHusbandName: 'Haji Abdul Sattar',
    cnic: '35202-6543210-1',
    phone: '+92 300 5544332',
    whatsapp: '+92 300 5544332',
    email: 'rizwan.father@gmail.com',
    occupation: 'Wholesale Textile Businessman, Shah Alam Market',
    address: 'House # 12, Street 4, Canal View Housing Society, Lahore',
    childrenIds: ['student-1', 'student-2']
  },
  {
    id: 'parent-2',
    tenantId: 'tenant-bfs',
    name: 'Tariq Javed Butt',
    fatherOrHusbandName: 'Muhammad Din Butt',
    cnic: '35201-8899001-3',
    phone: '+92 301 2233445',
    whatsapp: '+92 301 2233445',
    email: 'tariq.butt@outlook.com',
    occupation: 'Government Officer (Audit & Accounts)',
    address: 'House # 88-A, Tech Society, Canal Road, Lahore',
    childrenIds: ['student-3']
  },
  {
    id: 'parent-3',
    tenantId: 'tenant-bfs',
    name: 'Dr. Shahbaz Khalid',
    fatherOrHusbandName: 'Khalid Hussain',
    cnic: '35202-1122334-5',
    phone: '+92 322 7788990',
    whatsapp: '+92 322 7788990',
    email: 'dr.shahbaz@hospital.pk',
    occupation: 'Senior Medical Officer, Jinnah Hospital Lahore',
    address: 'Flat 4B, Doctor Hostels, Allama Iqbal Medical College',
    childrenIds: ['student-4']
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student-1',
    tenantId: 'tenant-bfs',
    admissionNo: 'BFS-2022-094',
    name: 'Hamza Rizwan',
    fatherName: 'Mohammad Rizwan',
    motherName: 'Tahira Rizwan',
    gender: 'Male',
    dob: '2010-06-14',
    admissionDate: '2022-04-01',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    sectionId: 'sec-9a',
    sectionName: 'A (Science)',
    rollNo: '09-12',
    parentContact: '+92 300 5544332',
    emergencyContact: '+92 300 5544332',
    address: 'House # 12, Street 4, Canal View Housing Society, Lahore',
    bFormOrCnic: '35202-7711223-3',
    previousSchool: 'Crescent Model School Lahore',
    status: 'active',
    parentId: 'parent-1',
    monthlyFee: 5500,
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'student-2',
    tenantId: 'tenant-bfs',
    admissionNo: 'BFS-2024-118',
    name: 'Fatima Rizwan',
    fatherName: 'Mohammad Rizwan',
    motherName: 'Tahira Rizwan',
    gender: 'Female',
    dob: '2015-11-20',
    admissionDate: '2024-04-05',
    classId: 'class-5',
    className: 'Class 5',
    sectionId: 'sec-5a',
    sectionName: 'A',
    rollNo: '05-04',
    parentContact: '+92 300 5544332',
    emergencyContact: '+92 300 5544332',
    address: 'House # 12, Street 4, Canal View Housing Society, Lahore',
    bFormOrCnic: '35202-9988112-4',
    previousSchool: 'Beaconhouse School Early Years',
    status: 'active',
    parentId: 'parent-1',
    monthlyFee: 4500,
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'student-3',
    tenantId: 'tenant-bfs',
    admissionNo: 'BFS-2021-042',
    name: 'Abdullah Tariq Butt',
    fatherName: 'Tariq Javed Butt',
    motherName: 'Noreen Tariq',
    gender: 'Male',
    dob: '2009-04-18',
    admissionDate: '2021-03-20',
    classId: 'class-10',
    className: 'Class 10 (Matric Part 2)',
    sectionId: 'sec-10a',
    sectionName: 'A (Science)',
    rollNo: '10-01',
    parentContact: '+92 301 2233445',
    address: 'House # 88-A, Tech Society, Canal Road, Lahore',
    bFormOrCnic: '35201-4455661-1',
    previousSchool: 'Lahore Grammar School',
    status: 'active',
    parentId: 'parent-2',
    monthlyFee: 6000,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'student-4',
    tenantId: 'tenant-bfs',
    admissionNo: 'BFS-2023-088',
    name: 'Zainab Shahbaz',
    fatherName: 'Dr. Shahbaz Khalid',
    motherName: 'Dr. Sadia Shahbaz',
    gender: 'Female',
    dob: '2010-09-02',
    admissionDate: '2023-04-12',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    sectionId: 'sec-9a',
    sectionName: 'A (Science)',
    rollNo: '09-02',
    parentContact: '+92 322 7788990',
    address: 'Flat 4B, Doctor Hostels, AIMC Lahore',
    bFormOrCnic: '35202-5566778-2',
    status: 'active',
    parentId: 'parent-3',
    monthlyFee: 5500,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'student-5',
    tenantId: 'tenant-bfs',
    admissionNo: 'BFS-2022-051',
    name: 'Ali Hassan Gujjar',
    fatherName: 'Chaudhry Hassan Gujjar',
    gender: 'Male',
    dob: '2010-01-15',
    admissionDate: '2022-04-01',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    sectionId: 'sec-9a',
    sectionName: 'A (Science)',
    rollNo: '09-18',
    parentContact: '+92 300 9911223',
    address: 'Near Thokar Niaz Baig, Raiwind Road, Lahore',
    bFormOrCnic: '35202-8877665-9',
    status: 'active',
    parentId: 'parent-1', // attached for convenience
    monthlyFee: 5500
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    tenantId: 'tenant-bfs',
    date: '2026-10-12',
    studentId: 'student-1',
    studentName: 'Hamza Rizwan',
    classId: 'class-9',
    sectionId: 'sec-9a',
    status: 'present'
  },
  {
    id: 'att-2',
    tenantId: 'tenant-bfs',
    date: '2026-10-12',
    studentId: 'student-4',
    studentName: 'Zainab Shahbaz',
    classId: 'class-9',
    sectionId: 'sec-9a',
    status: 'present'
  },
  {
    id: 'att-3',
    tenantId: 'tenant-bfs',
    date: '2026-10-12',
    studentId: 'student-5',
    studentName: 'Ali Hassan Gujjar',
    classId: 'class-9',
    sectionId: 'sec-9a',
    status: 'late',
    remarks: 'Arrived at 08:20 AM due to traffic on Canal Road'
  },
  {
    id: 'att-4',
    tenantId: 'tenant-bfs',
    date: '2026-10-12',
    studentId: 'student-2',
    studentName: 'Fatima Rizwan',
    classId: 'class-5',
    sectionId: 'sec-5a',
    status: 'present'
  },
  {
    id: 'att-5',
    tenantId: 'tenant-bfs',
    date: '2026-10-12',
    studentId: 'student-3',
    studentName: 'Abdullah Tariq Butt',
    classId: 'class-10',
    sectionId: 'sec-10a',
    status: 'present'
  },
  // Previous day
  {
    id: 'att-6',
    tenantId: 'tenant-bfs',
    date: '2026-10-11',
    studentId: 'student-1',
    studentName: 'Hamza Rizwan',
    classId: 'class-9',
    sectionId: 'sec-9a',
    status: 'present'
  },
  {
    id: 'att-7',
    tenantId: 'tenant-bfs',
    date: '2026-10-11',
    studentId: 'student-4',
    studentName: 'Zainab Shahbaz',
    classId: 'class-9',
    sectionId: 'sec-9a',
    status: 'leave',
    remarks: 'Medical leave approved by Principal'
  }
];

export const INITIAL_INVOICES: FeeInvoice[] = [
  {
    id: 'inv-2026-10-01',
    tenantId: 'tenant-bfs',
    invoiceNo: 'INV-BFS-2610-001',
    studentId: 'student-1',
    studentName: 'Hamza Rizwan',
    admissionNo: 'BFS-2022-094',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    feeMonth: 'October 2026',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    tuitionFee: 5500,
    examFee: 500,
    discount: 500, // Sibling concession
    lateFee: 0,
    totalAmount: 5500,
    amountPaid: 5500,
    balance: 0,
    status: 'paid'
  },
  {
    id: 'inv-2026-10-02',
    tenantId: 'tenant-bfs',
    invoiceNo: 'INV-BFS-2610-002',
    studentId: 'student-2',
    studentName: 'Fatima Rizwan',
    admissionNo: 'BFS-2024-118',
    classId: 'class-5',
    className: 'Class 5',
    feeMonth: 'October 2026',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    tuitionFee: 4500,
    examFee: 0,
    discount: 500, // Sibling concession
    lateFee: 0,
    totalAmount: 4000,
    amountPaid: 0,
    balance: 4000,
    status: 'pending'
  },
  {
    id: 'inv-2026-10-03',
    tenantId: 'tenant-bfs',
    invoiceNo: 'INV-BFS-2610-003',
    studentId: 'student-3',
    studentName: 'Abdullah Tariq Butt',
    admissionNo: 'BFS-2021-042',
    classId: 'class-10',
    className: 'Class 10 (Matric Part 2)',
    feeMonth: 'October 2026',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    tuitionFee: 6000,
    examFee: 800,
    discount: 0,
    lateFee: 0,
    totalAmount: 6800,
    amountPaid: 6800,
    balance: 0,
    status: 'paid'
  },
  {
    id: 'inv-2026-09-04',
    tenantId: 'tenant-bfs',
    invoiceNo: 'INV-BFS-2609-018',
    studentId: 'student-5',
    studentName: 'Ali Hassan Gujjar',
    admissionNo: 'BFS-2022-051',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    feeMonth: 'September 2026',
    issueDate: '2026-09-01',
    dueDate: '2026-09-15',
    tuitionFee: 5500,
    examFee: 0,
    discount: 0,
    lateFee: 300,
    totalAmount: 5800,
    amountPaid: 2000,
    balance: 3800,
    status: 'partial'
  }
];

export const INITIAL_PAYMENTS: FeePayment[] = [
  {
    id: 'pay-001',
    tenantId: 'tenant-bfs',
    invoiceId: 'inv-2026-10-01',
    invoiceNo: 'INV-BFS-2610-001',
    receiptNo: 'REC-2026-1049',
    studentId: 'student-1',
    studentName: 'Hamza Rizwan',
    amount: 5500,
    paymentDate: '2026-10-05',
    paymentMethod: 'easypaisa',
    transactionRef: 'EP-998822144',
    receivedBy: 'Farooq Ahmed (Accountant)'
  },
  {
    id: 'pay-002',
    tenantId: 'tenant-bfs',
    invoiceId: 'inv-2026-10-03',
    invoiceNo: 'INV-BFS-2610-003',
    receiptNo: 'REC-2026-1050',
    studentId: 'student-3',
    studentName: 'Abdullah Tariq Butt',
    amount: 6800,
    paymentDate: '2026-10-06',
    paymentMethod: 'jazzcash',
    transactionRef: 'JC-881177652',
    receivedBy: 'Farooq Ahmed (Accountant)'
  },
  {
    id: 'pay-003',
    tenantId: 'tenant-bfs',
    invoiceId: 'inv-2026-09-04',
    invoiceNo: 'INV-BFS-2609-018',
    receiptNo: 'REC-2026-0988',
    studentId: 'student-5',
    studentName: 'Ali Hassan Gujjar',
    amount: 2000,
    paymentDate: '2026-09-22',
    paymentMethod: 'cash',
    receivedBy: 'Farooq Ahmed (Accountant)'
  }
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-mid-2026',
    tenantId: 'tenant-bfs',
    title: 'Mid-Term Examinations 2026',
    session: '2026-2027',
    term: 'Mid Term',
    startDate: '2026-11-15',
    endDate: '2026-11-28',
    status: 'upcoming'
  },
  {
    id: 'exam-first-2026',
    tenantId: 'tenant-bfs',
    title: 'First Term Assessment 2026',
    session: '2026-2027',
    term: 'First Term',
    startDate: '2026-09-10',
    endDate: '2026-09-20',
    status: 'announced'
  }
];

export const INITIAL_RESULTS: StudentResult[] = [
  {
    id: 'res-01',
    tenantId: 'tenant-bfs',
    examId: 'exam-first-2026',
    examTitle: 'First Term Assessment 2026',
    studentId: 'student-1',
    studentName: 'Hamza Rizwan',
    rollNo: '09-12',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    subjectsMarks: [
      { subjectId: 'sub-9-math', subjectName: 'Mathematics', totalMarks: 75, obtainedMarks: 68, passingMarks: 25, grade: 'A+' },
      { subjectId: 'sub-9-phy', subjectName: 'Physics', totalMarks: 60, obtainedMarks: 53, passingMarks: 20, grade: 'A+' },
      { subjectId: 'sub-9-chem', subjectName: 'Chemistry', totalMarks: 60, obtainedMarks: 49, passingMarks: 20, grade: 'A' },
      { subjectId: 'sub-9-eng', subjectName: 'English Compulsory', totalMarks: 75, obtainedMarks: 62, passingMarks: 25, grade: 'A' },
      { subjectId: 'sub-9-urdu', subjectName: 'Urdu Lazmi', totalMarks: 75, obtainedMarks: 65, passingMarks: 25, grade: 'A+' },
      { subjectId: 'sub-9-islam', subjectName: 'Islamiat Lazmi', totalMarks: 50, obtainedMarks: 46, passingMarks: 17, grade: 'A+' }
    ],
    totalMarks: 395,
    totalObtained: 343,
    percentage: 86.8,
    grade: 'A+',
    positionInClass: 2,
    status: 'pass',
    teacherRemarks: 'Excellent performance in Science subjects and analytical thinking. Keep up the high standard in upcoming Board exams.'
  },
  {
    id: 'res-02',
    tenantId: 'tenant-bfs',
    examId: 'exam-first-2026',
    examTitle: 'First Term Assessment 2026',
    studentId: 'student-4',
    studentName: 'Zainab Shahbaz',
    rollNo: '09-02',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    subjectsMarks: [
      { subjectId: 'sub-9-math', subjectName: 'Mathematics', totalMarks: 75, obtainedMarks: 73, passingMarks: 25, grade: 'A+' },
      { subjectId: 'sub-9-phy', subjectName: 'Physics', totalMarks: 60, obtainedMarks: 57, passingMarks: 20, grade: 'A+' },
      { subjectId: 'sub-9-chem', subjectName: 'Chemistry', totalMarks: 60, obtainedMarks: 56, passingMarks: 20, grade: 'A+' },
      { subjectId: 'sub-9-eng', subjectName: 'English Compulsory', totalMarks: 75, obtainedMarks: 70, passingMarks: 25, grade: 'A+' },
      { subjectId: 'sub-9-urdu', subjectName: 'Urdu Lazmi', totalMarks: 75, obtainedMarks: 68, passingMarks: 25, grade: 'A+' },
      { subjectId: 'sub-9-islam', subjectName: 'Islamiat Lazmi', totalMarks: 50, obtainedMarks: 48, passingMarks: 17, grade: 'A+' }
    ],
    totalMarks: 395,
    totalObtained: 372,
    percentage: 94.1,
    grade: 'A+',
    positionInClass: 1,
    status: 'pass',
    teacherRemarks: 'Outstanding top position in Class 9 Science. Highly disciplined and exemplary student.'
  }
];

export const INITIAL_TIMETABLE: TimetableEntry[] = [
  {
    id: 'tt-1',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A',
    day: 'Monday',
    periodNo: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectName: 'Mathematics',
    teacherName: 'Sir Zeeshan Haider',
    roomNo: 'Room 102'
  },
  {
    id: 'tt-2',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A',
    day: 'Monday',
    periodNo: 2,
    startTime: '08:45 AM',
    endTime: '09:30 AM',
    subjectName: 'Physics',
    teacherName: 'Sir Zeeshan Haider',
    roomNo: 'Science Lab 1'
  },
  {
    id: 'tt-3',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A',
    day: 'Monday',
    periodNo: 3,
    startTime: '09:30 AM',
    endTime: '10:15 AM',
    subjectName: 'Chemistry',
    teacherName: 'Dr. Arshad Mehmood',
    roomNo: 'Science Lab 2'
  },
  {
    id: 'tt-4',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A',
    day: 'Monday',
    periodNo: 4,
    startTime: '10:45 AM',
    endTime: '11:30 AM',
    subjectName: 'English Compulsory',
    teacherName: 'Sir Nadeem Sarwar',
    roomNo: 'Room 102'
  },
  {
    id: 'tt-5',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A',
    day: 'Tuesday',
    periodNo: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectName: 'Urdu Lazmi',
    teacherName: 'Qari Muhammad Aslam',
    roomNo: 'Room 102'
  },
  {
    id: 'tt-6',
    tenantId: 'tenant-bfs',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A',
    day: 'Tuesday',
    periodNo: 2,
    startTime: '08:45 AM',
    endTime: '09:30 AM',
    subjectName: 'Mathematics',
    teacherName: 'Sir Zeeshan Haider',
    roomNo: 'Room 102'
  }
];

export const INITIAL_HOMEWORK: Homework[] = [
  {
    id: 'hw-1',
    tenantId: 'tenant-bfs',
    title: 'Algebra: Quadratic Equations Ex 2.1 Q1 to Q8',
    description: 'Solve questions 1 through 8 in your neat homework register. Show all steps with standard discriminant formula.',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A (Science)',
    subjectName: 'Mathematics',
    teacherName: 'Sir Zeeshan Haider',
    assignedDate: '2026-10-12',
    dueDate: '2026-10-14',
    status: 'active',
    attachmentName: 'Ex_2.1_Important_Hints.pdf'
  },
  {
    id: 'hw-2',
    tenantId: 'tenant-bfs',
    title: 'Kinematics: Equations of Motion Numerical Problems',
    description: 'Calculate problems 2.1 to 2.5 using kinematic formulas. Include given data, required, and formula headers.',
    classId: 'class-9',
    className: 'Class 9 (Matric Part 1)',
    section: 'A (Science)',
    subjectName: 'Physics',
    teacherName: 'Sir Zeeshan Haider',
    assignedDate: '2026-10-11',
    dueDate: '2026-10-15',
    status: 'active'
  },
  {
    id: 'hw-3',
    tenantId: 'tenant-bfs',
    title: 'Essay: "My Aim in Life" (150 words)',
    description: 'Write an outline followed by a 3-paragraph essay with correct punctuation and verb tenses.',
    classId: 'class-5',
    className: 'Class 5',
    section: 'A',
    subjectName: 'English',
    teacherName: 'Sir Nadeem Sarwar',
    assignedDate: '2026-10-10',
    dueDate: '2026-10-13',
    status: 'active'
  }
];

export const INITIAL_ADMISSIONS: AdmissionApplication[] = [
  {
    id: 'adm-001',
    tenantId: 'tenant-bfs',
    applicationNo: 'APP-26-081',
    applicantName: 'Muhammad Bilal Khan',
    fatherName: 'Kamran Khan',
    classApplied: 'Class 9 (Matric Part 1)',
    phone: '+92 300 4433221',
    whatsapp: '+92 300 4433221',
    email: 'kamran.khan@gmail.com',
    address: 'House 45, Street 2, Falcon Complex, New Airport Road Lahore',
    dob: '2010-08-19',
    gender: 'Male',
    previousSchool: 'Army Public School (APS) Lahore Cantt',
    submissionDate: '2026-10-08',
    status: 'under_review',
    notes: 'Father transferred from Rawalpindi to Lahore. Transfer certificate attached.'
  },
  {
    id: 'adm-002',
    tenantId: 'tenant-bfs',
    applicationNo: 'APP-26-082',
    applicantName: 'Amina Faisal',
    fatherName: 'Faisal Mehmood',
    classApplied: 'Class 5',
    phone: '+92 321 8899776',
    whatsapp: '+92 321 8899776',
    address: 'Canal View Society, Block B, House 102',
    dob: '2015-03-12',
    gender: 'Female',
    previousSchool: 'The City School Ravi Campus',
    submissionDate: '2026-10-09',
    status: 'approved',
    notes: 'Cleared entrance test with 92% marks. Ready for student conversion.'
  },
  {
    id: 'adm-003',
    tenantId: 'tenant-bfs',
    applicationNo: 'APP-26-083',
    applicantName: 'Subhan Ahmad',
    fatherName: 'Dr. Ahmad Din',
    classApplied: 'Prep',
    phone: '+92 333 1122334',
    whatsapp: '+92 333 1122334',
    address: 'Johar Town Phase 2, Lahore',
    dob: '2021-05-10',
    gender: 'Male',
    submissionDate: '2026-10-11',
    status: 'new'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    tenantId: 'tenant-bfs',
    title: 'Mid-Term Exam Datesheet Announced for Session 2026-2027',
    content: 'All parents and students are hereby informed that the Mid-Term examinations will commence from 15th November 2026. Detailed subject-wise datesheets have been uploaded to the student and parent portals. Ensure all previous fee dues are cleared before 1st November to receive exam roll number slips.',
    targetAudience: 'everyone',
    status: 'published',
    authorName: 'Prof. Nasreen Akhtar (Principal)',
    createdAt: '2026-10-10'
  },
  {
    id: 'ann-2',
    tenantId: 'tenant-bfs',
    title: 'والدین کے لیے ضروری اطلاع: پیرنٹ ٹیچر میٹنگ',
    content: 'تمام معزز والدین کو مطلع کیا جاتا ہے کہ مورخہ 20 اکتوبر بروز ہفتہ صبح 9:00 بجے سے دوپہر 1:00 بجے تک سہ ماہی نتائج کے سلسلے میں پیرنٹ ٹیچر میٹنگ منعقد ہوگی۔ تشریف آوری لازمی ہے۔',
    targetAudience: 'parents',
    isUrdu: true,
    status: 'published',
    authorName: 'Malik Asif (Admin)',
    createdAt: '2026-10-08'
  },
  {
    id: 'ann-3',
    tenantId: 'tenant-bfs',
    title: 'Special Physics Practical Session for Class 9 Science',
    content: 'Students of Class 9 Section A must bring their practical journals on Thursday for Vernier Caliper and Screw Gauge hands-on laboratory assessment.',
    targetAudience: 'selected_class',
    targetClassName: 'Class 9 (Matric Part 1)',
    status: 'published',
    authorName: 'Sir Zeeshan Haider',
    createdAt: '2026-10-11'
  }
];

export const INITIAL_EVENTS: SchoolEvent[] = [
  {
    id: 'evt-1',
    tenantId: 'tenant-bfs',
    title: 'Annual Science & Robotics Exhibition 2026',
    description: 'Students from Class 6 to 10 will present live science working models, Arduino projects, and chemical reaction demonstrations for visitors and parents.',
    startDate: '2026-11-05',
    endDate: '2026-11-06',
    time: '09:00 AM - 02:00 PM',
    location: 'Main School Auditorium & Campus Lawns',
    category: 'academic',
    audience: 'All Students, Teachers, and Parents'
  },
  {
    id: 'evt-2',
    tenantId: 'tenant-bfs',
    title: 'Iqbal Day Commemoration & Speech Competition',
    description: 'Inter-house Urdu speech, bait-bazi, and kalam-e-Iqbal recitations in honor of Allama Muhammad Iqbal.',
    startDate: '2026-11-09',
    endDate: '2026-11-09',
    time: '10:00 AM - 12:30 PM',
    location: 'School Hall',
    category: 'cultural',
    audience: 'High School Classes'
  },
  {
    id: 'evt-3',
    tenantId: 'tenant-bfs',
    title: 'Winter Sports Gala & Cricket Tournament',
    description: 'Annual inter-house cricket, badminton, and athletics tournament.',
    startDate: '2026-12-18',
    endDate: '2026-12-21',
    time: '08:30 AM - 01:30 PM',
    location: 'Sports Grounds',
    category: 'sports',
    audience: 'All Classes'
  }
];

export const INITIAL_SUBSCRIPTIONS: TenantSubscription[] = [
  {
    id: 'sub-bfs',
    tenantId: 'tenant-bfs',
    schoolName: 'Bright Future High School',
    planId: 'plan-standard',
    planName: 'Taleem Standard',
    status: 'active',
    billingCycle: 'yearly',
    startDate: '2026-03-15',
    expiryDate: '2027-03-15',
    renewalDate: '2027-03-15',
    amountPkr: 95000,
    autoRenew: true
  },
  {
    id: 'sub-alnoor',
    tenantId: 'tenant-alnoor',
    schoolName: 'Al-Noor Islamic & Cambridge Academy',
    planId: 'plan-pro',
    planName: 'Taleem Enterprise',
    status: 'active',
    billingCycle: 'yearly',
    startDate: '2026-08-10',
    expiryDate: '2027-08-10',
    renewalDate: '2027-08-10',
    amountPkr: 180000,
    autoRenew: true
  },
  {
    id: 'sub-kpt',
    tenantId: 'tenant-kpt',
    schoolName: 'Knowledge Point Science Academy',
    planId: 'plan-starter',
    planName: 'Taleem Starter',
    status: 'trial',
    billingCycle: 'monthly',
    startDate: '2026-09-01',
    expiryDate: '2026-11-01',
    renewalDate: '2026-11-01',
    amountPkr: 4500,
    autoRenew: false
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    tenantId: 'tenant-bfs',
    schoolName: 'Bright Future High School',
    actorName: 'Malik Asif (Admin)',
    role: 'school_admin',
    action: 'Student Fee Invoices Generated',
    details: 'Generated October 2026 fee challans for 340 active students.',
    ipAddress: '182.185.120.44 (Lahore, PTCL)',
    timestamp: '2026-10-01 09:15:22'
  },
  {
    id: 'log-2',
    tenantId: 'tenant-bfs',
    schoolName: 'Bright Future High School',
    actorName: 'Farooq Ahmed (Accountant)',
    role: 'accountant',
    action: 'Fee Payment Recorded',
    details: 'Recorded PKR 5,500 via Easypaisa for Student Hamza Rizwan (REC-2026-1049).',
    ipAddress: '182.185.120.44 (Lahore, PTCL)',
    timestamp: '2026-10-05 11:42:10'
  },
  {
    id: 'log-3',
    tenantId: 'tenant-bfs',
    schoolName: 'Bright Future High School',
    actorName: 'Sir Zeeshan Haider',
    role: 'teacher',
    action: 'Attendance Marked',
    details: 'Class 9 Science daily attendance marked (72 present, 2 absent).',
    ipAddress: '39.40.88.19 (Lahore, Jazz)',
    timestamp: '2026-10-12 08:35:04'
  },
  {
    id: 'log-4',
    actorName: 'Tariq Mahmood (Super Admin)',
    role: 'super_admin',
    action: 'School Subscription Verified',
    details: 'Verified annual plan renewal for Al-Noor Academy.',
    ipAddress: '111.119.182.12 (Islamabad, Nayatel)',
    timestamp: '2026-10-10 14:20:00'
  }
];
