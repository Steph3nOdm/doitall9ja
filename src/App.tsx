import type { FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { NotificationsProvider } from '@/hooks/useNotifications';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth Pages
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import PaymentSuccess from '@/pages/PaymentSuccess';
import FAQPage from '@/pages/FAQPage';

// Dashboard Pages
import ClientDashboard from '@/pages/dashboard/ClientDashboard';
import ClientJobs from '@/pages/dashboard/ClientJobs';
import ClientBookings from '@/pages/dashboard/ClientBookings';
import ClientRequestService from '@/pages/dashboard/ClientRequestService';
import ClientHistoryPage from '@/pages/dashboard/ClientHistoryPage';
import TechnicianDashboard from '@/pages/dashboard/TechnicianDashboard';
import TechnicianEarningsPage from '@/pages/dashboard/TechnicianEarningsPage';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import AdminBookings from '@/pages/dashboard/AdminBookings';
import AllJobsPage from '@/pages/dashboard/AllJobsPage';
import AdminTechniciansPage from '@/pages/dashboard/AdminTechniciansPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import JobDetailsPage from '@/pages/dashboard/JobDetailsPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';
import SupportChatPage from '@/pages/dashboard/SupportChatPage';

// Landing Page
import LandingPage from '@/pages/LandingPage';
import TechniciansPage from '@/pages/TechniciansPage';

const App: FC = () => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/technicians" element={<TechniciansPage />} />
            <Route path="/faq" element={<FAQPage />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />

            {/* Client Dashboard Routes */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route path="/dashboard/client" element={<ClientDashboard />} />
              <Route path="/dashboard/client/jobs" element={<ClientJobs />} />
              <Route path="/dashboard/client/bookings" element={<ClientBookings />} />
              <Route path="/dashboard/client/jobs/:jobId" element={<JobDetailsPage dashboardRole="client" />} />
              <Route path="/dashboard/client/request" element={<ClientRequestService />} />
              <Route path="/dashboard/client/messages" element={<SupportChatPage dashboardRole="client" />} />
              <Route path="/dashboard/client/history" element={<ClientHistoryPage />} />
              <Route path="/dashboard/client/profile" element={<ProfilePage />} />
              <Route path="/dashboard/client/settings" element={<SettingsPage dashboardRole="client" />} />
            </Route>

            {/* Technician Dashboard Routes */}
            <Route element={<ProtectedRoute allowedRoles={['technician']} />}>
              <Route path="/dashboard/technician" element={<TechnicianDashboard />} />
              <Route path="/dashboard/technician/jobs" element={<AllJobsPage dashboardRole="technician" initialTab="available" />} />
              <Route path="/dashboard/technician/jobs/:jobId" element={<JobDetailsPage dashboardRole="technician" />} />
              <Route path="/dashboard/technician/my-jobs" element={<AllJobsPage dashboardRole="technician" initialTab="my" />} />
              <Route path="/dashboard/technician/messages" element={<SupportChatPage dashboardRole="technician" />} />
              <Route path="/dashboard/technician/earnings" element={<TechnicianEarningsPage />} />
              <Route path="/dashboard/technician/profile" element={<ProfilePage />} />
              <Route path="/dashboard/technician/settings" element={<SettingsPage dashboardRole="technician" />} />
            </Route>

            {/* Admin Dashboard Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'support']} />}>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/admin/bookings" element={<AdminBookings />} />
              <Route path="/dashboard/admin/jobs" element={<AllJobsPage dashboardRole="admin" initialTab="all" />} />
              <Route path="/dashboard/admin/jobs/:jobId" element={<JobDetailsPage dashboardRole="admin" />} />
              <Route path="/dashboard/admin/technicians" element={<AdminTechniciansPage />} />
              <Route path="/dashboard/admin/support" element={<SupportChatPage dashboardRole="admin" />} />
              <Route path="/dashboard/admin/settings" element={<SettingsPage dashboardRole="admin" />} />
            </Route>

            {/* Shared Dashboard Utility Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard/profile" element={<ProfilePage />} />
              <Route path="/dashboard/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NotificationsProvider>
    </AuthProvider>
  );
};

export default App;
