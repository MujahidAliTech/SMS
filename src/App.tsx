import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Detect if running on GitHub Pages or static subfolder host where server-side rewrites aren't available
const isGitHubPagesOrSubpath = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') ||
  window.location.pathname.startsWith('/SMS') ||
  window.location.pathname.startsWith('/sms')
);

// Layouts
import { MarketingLayout } from './layouts/MarketingLayout';
import { SchoolAdminLayout } from './layouts/SchoolAdminLayout';
import { SuperAdminLayout } from './layouts/SuperAdminLayout';
import { PortalLayout } from './layouts/PortalLayout';
import { SchoolPublicLayout } from './layouts/SchoolPublicLayout';

// Marketing Pages
import { HomePage } from './pages/marketing/HomePage';
import { FeaturesPage } from './pages/marketing/FeaturesPage';
import { SolutionsPage } from './pages/marketing/SolutionsPage';
import { PricingPage } from './pages/marketing/PricingPage';
import { AboutPage, ContactPage } from './pages/marketing/AboutAndContactPages';
import { LoginPage } from './pages/marketing/LoginPage';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';
import { SchoolsListPage } from './pages/super-admin/SchoolsListPage';
import { 
  PlansListPage, 
  SubscriptionsListPage, 
  AuditLogsPage, 
  SuperAdminSettings 
} from './pages/super-admin/PlansAndSubsPages';

// School Admin Pages
import { SchoolDashboard } from './pages/school/SchoolDashboard';
import { StudentsListPage } from './pages/school/StudentsListPage';
import { ParentsListPage, TeachersStaffListPage } from './pages/school/ParentsAndStaffPages';
import { UserManagementPage } from './pages/school/UserManagementPage';
import { ClassesSectionsListPage, SubjectsListPage } from './pages/school/ClassesAndSubjectsPages';
import { AttendancePage } from './pages/school/AttendancePage';
import { FeeInvoicesListPage } from './pages/school/FeeInvoicesListPage';
import { ExamsListPage } from './pages/school/ExamsAndResultsPages';
import { TimetablePage, HomeworkPage } from './pages/school/TimetableAndHomeworkPages';
import { AdmissionsPage, AnnouncementsPage } from './pages/school/AdmissionsAndNoticesPages';
import { EventsPage, ReportsPage } from './pages/school/EventsAndReportsPages';
import { 
  SchoolSettingsPage, 
  WebsiteSettingsPage, 
  SubscriptionPage 
} from './pages/school/SettingsAndSubscriptionPages';

// Portals
import { TeacherPortal } from './pages/portals/TeacherPortal';
import { ParentPortal, StudentPortal } from './pages/portals/ParentAndStudentPortals';

// School Public Website
import { SchoolPublicHome, SchoolPublicAdmissions } from './pages/school-public/SchoolPublicPages';

export default function App() {
  const Router = isGitHubPagesOrSubpath ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <Routes>
          {/* SaaS Marketing Public Routes */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/demo" element={<LoginPage />} />
          </Route>

          {/* Platform Super Admin Routes */}
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="schools" element={<SchoolsListPage />} />
            <Route path="plans" element={<PlansListPage />} />
            <Route path="subscriptions" element={<SubscriptionsListPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SuperAdminSettings />} />
          </Route>

          {/* School Admin ERP Routes */}
          <Route path="/school" element={<SchoolAdminLayout />}>
            <Route index element={<Navigate to="/school/dashboard" replace />} />
            <Route path="dashboard" element={<SchoolDashboard />} />
            <Route path="students" element={<StudentsListPage />} />
            <Route path="parents" element={<ParentsListPage />} />
            <Route path="teachers" element={<TeachersStaffListPage />} />
            <Route path="classes" element={<ClassesSectionsListPage />} />
            <Route path="subjects" element={<SubjectsListPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="fees" element={<FeeInvoicesListPage />} />
            <Route path="exams" element={<ExamsListPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="homework" element={<HomeworkPage />} />
            <Route path="admissions" element={<AdmissionsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="website-settings" element={<WebsiteSettingsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="settings" element={<SchoolSettingsPage />} />
            <Route path="users" element={<UserManagementPage />} />
          </Route>

          {/* Teacher Portal */}
          <Route path="/teacher" element={<PortalLayout portalType="teacher" />}>
            <Route index element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="dashboard" element={<TeacherPortal />} />
            <Route path="attendance" element={<TeacherPortal />} />
            <Route path="homework" element={<TeacherPortal />} />
            <Route path="marks" element={<TeacherPortal />} />
            <Route path="timetable" element={<TeacherPortal />} />
          </Route>

          {/* Parent Portal */}
          <Route path="/parent" element={<PortalLayout portalType="parent" />}>
            <Route index element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="dashboard" element={<ParentPortal />} />
            <Route path="attendance" element={<ParentPortal />} />
            <Route path="fees" element={<ParentPortal />} />
            <Route path="results" element={<ParentPortal />} />
            <Route path="homework" element={<ParentPortal />} />
          </Route>

          {/* Student Portal */}
          <Route path="/student" element={<PortalLayout portalType="student" />}>
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentPortal />} />
            <Route path="attendance" element={<StudentPortal />} />
            <Route path="fees" element={<StudentPortal />} />
            <Route path="results" element={<StudentPortal />} />
            <Route path="homework" element={<StudentPortal />} />
            <Route path="timetable" element={<StudentPortal />} />
          </Route>

          {/* Individual School Public Website (Dynamic by Slug) */}
          <Route path="/s/:slug" element={<SchoolPublicLayout />}>
            <Route index element={<SchoolPublicHome />} />
            <Route path="about" element={<SchoolPublicHome />} />
            <Route path="classes" element={<SchoolPublicHome />} />
            <Route path="faculty" element={<SchoolPublicHome />} />
            <Route path="admissions" element={<SchoolPublicAdmissions />} />
            <Route path="announcements" element={<SchoolPublicHome />} />
            <Route path="contact" element={<SchoolPublicHome />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  </ErrorBoundary>
  );
}
