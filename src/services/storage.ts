import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS_STAFF,
  INITIAL_PARENTS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_EXAMS,
  INITIAL_RESULTS,
  INITIAL_TIMETABLE,
  INITIAL_HOMEWORK,
  INITIAL_ADMISSIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_EVENTS,
  INITIAL_PLANS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_AUDIT_LOGS
} from '../mock-data';

const STORAGE_KEYS = {
  TENANTS: 'tc_tenants_v1',
  CURRENT_TENANT_ID: 'tc_current_tenant_id_v1',
  CURRENT_USER: 'tc_current_user_v1',
  USERS: 'tc_users_v1',
  CLASSES: 'tc_classes_v1',
  SUBJECTS: 'tc_subjects_v1',
  TEACHERS: 'tc_teachers_v1',
  PARENTS: 'tc_parents_v1',
  STUDENTS: 'tc_students_v1',
  ATTENDANCE: 'tc_attendance_v1',
  INVOICES: 'tc_invoices_v1',
  PAYMENTS: 'tc_payments_v1',
  EXAMS: 'tc_exams_v1',
  RESULTS: 'tc_results_v1',
  TIMETABLE: 'tc_timetable_v1',
  HOMEWORK: 'tc_homework_v1',
  ADMISSIONS: 'tc_admissions_v1',
  ANNOUNCEMENTS: 'tc_announcements_v1',
  EVENTS: 'tc_events_v1',
  PLANS: 'tc_plans_v1',
  SUBSCRIPTIONS: 'tc_subscriptions_v1',
  AUDIT_LOGS: 'tc_audit_logs_v1'
};

function getItem<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to persist key ${key}:`, err);
  }
}

export const MockStorageAdapter = {
  keys: STORAGE_KEYS,

  getTenants() { return getItem(STORAGE_KEYS.TENANTS, INITIAL_TENANTS); },
  setTenants(data: typeof INITIAL_TENANTS) { setItem(STORAGE_KEYS.TENANTS, data); },

  getCurrentTenantId(): string {
    return getItem(STORAGE_KEYS.CURRENT_TENANT_ID, 'tenant-bfs');
  },
  setCurrentTenantId(id: string) {
    setItem(STORAGE_KEYS.CURRENT_TENANT_ID, id);
  },

  getCurrentUser() {
    return getItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[1]); // Default to School Admin
  },
  setCurrentUser(u: (typeof INITIAL_USERS)[0]) {
    setItem(STORAGE_KEYS.CURRENT_USER, u);
  },

  getUsers() { return getItem(STORAGE_KEYS.USERS, INITIAL_USERS); },
  setUsers(data: typeof INITIAL_USERS) { setItem(STORAGE_KEYS.USERS, data); },

  getClasses() { return getItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES); },
  setClasses(data: typeof INITIAL_CLASSES) { setItem(STORAGE_KEYS.CLASSES, data); },

  getSubjects() { return getItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS); },
  setSubjects(data: typeof INITIAL_SUBJECTS) { setItem(STORAGE_KEYS.SUBJECTS, data); },

  getTeachers() { return getItem(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS_STAFF); },
  setTeachers(data: typeof INITIAL_TEACHERS_STAFF) { setItem(STORAGE_KEYS.TEACHERS, data); },

  getParents() { return getItem(STORAGE_KEYS.PARENTS, INITIAL_PARENTS); },
  setParents(data: typeof INITIAL_PARENTS) { setItem(STORAGE_KEYS.PARENTS, data); },

  getStudents() { return getItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS); },
  setStudents(data: typeof INITIAL_STUDENTS) { setItem(STORAGE_KEYS.STUDENTS, data); },

  getAttendance() { return getItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE); },
  setAttendance(data: typeof INITIAL_ATTENDANCE) { setItem(STORAGE_KEYS.ATTENDANCE, data); },

  getInvoices() { return getItem(STORAGE_KEYS.INVOICES, INITIAL_INVOICES); },
  setInvoices(data: typeof INITIAL_INVOICES) { setItem(STORAGE_KEYS.INVOICES, data); },

  getPayments() { return getItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS); },
  setPayments(data: typeof INITIAL_PAYMENTS) { setItem(STORAGE_KEYS.PAYMENTS, data); },

  getExams() { return getItem(STORAGE_KEYS.EXAMS, INITIAL_EXAMS); },
  setExams(data: typeof INITIAL_EXAMS) { setItem(STORAGE_KEYS.EXAMS, data); },

  getResults() { return getItem(STORAGE_KEYS.RESULTS, INITIAL_RESULTS); },
  setResults(data: typeof INITIAL_RESULTS) { setItem(STORAGE_KEYS.RESULTS, data); },

  getTimetable() { return getItem(STORAGE_KEYS.TIMETABLE, INITIAL_TIMETABLE); },
  setTimetable(data: typeof INITIAL_TIMETABLE) { setItem(STORAGE_KEYS.TIMETABLE, data); },

  getHomework() { return getItem(STORAGE_KEYS.HOMEWORK, INITIAL_HOMEWORK); },
  setHomework(data: typeof INITIAL_HOMEWORK) { setItem(STORAGE_KEYS.HOMEWORK, data); },

  getAdmissions() { return getItem(STORAGE_KEYS.ADMISSIONS, INITIAL_ADMISSIONS); },
  setAdmissions(data: typeof INITIAL_ADMISSIONS) { setItem(STORAGE_KEYS.ADMISSIONS, data); },

  getAnnouncements() { return getItem(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS); },
  setAnnouncements(data: typeof INITIAL_ANNOUNCEMENTS) { setItem(STORAGE_KEYS.ANNOUNCEMENTS, data); },

  getEvents() { return getItem(STORAGE_KEYS.EVENTS, INITIAL_EVENTS); },
  setEvents(data: typeof INITIAL_EVENTS) { setItem(STORAGE_KEYS.EVENTS, data); },

  getPlans() { return getItem(STORAGE_KEYS.PLANS, INITIAL_PLANS); },
  setPlans(data: typeof INITIAL_PLANS) { setItem(STORAGE_KEYS.PLANS, data); },

  getSubscriptions() { return getItem(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS); },
  setSubscriptions(data: typeof INITIAL_SUBSCRIPTIONS) { setItem(STORAGE_KEYS.SUBSCRIPTIONS, data); },

  getAuditLogs() { return getItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS); },
  setAuditLogs(data: typeof INITIAL_AUDIT_LOGS) { setItem(STORAGE_KEYS.AUDIT_LOGS, data); },

  resetAll() {
    localStorage.clear();
    setItem(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    setItem(STORAGE_KEYS.CURRENT_TENANT_ID, 'tenant-bfs');
    setItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[1]);
    setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    setItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    setItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    setItem(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS_STAFF);
    setItem(STORAGE_KEYS.PARENTS, INITIAL_PARENTS);
    setItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    setItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    setItem(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    setItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    setItem(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
    setItem(STORAGE_KEYS.RESULTS, INITIAL_RESULTS);
    setItem(STORAGE_KEYS.TIMETABLE, INITIAL_TIMETABLE);
    setItem(STORAGE_KEYS.HOMEWORK, INITIAL_HOMEWORK);
    setItem(STORAGE_KEYS.ADMISSIONS, INITIAL_ADMISSIONS);
    setItem(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    setItem(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    setItem(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
    setItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }
};
