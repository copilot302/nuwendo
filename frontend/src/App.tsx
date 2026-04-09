import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import AboutUsPage from '@/pages/AboutUsPage'
import ServicesPage from '@/pages/ServicesPage'
import ServiceNuwendoStarterPage from '@/pages/ServiceNuwendoStarterPage'
import ServiceInitialConsultationPage from '@/pages/ServiceInitialConsultationPage'
import AddOnPage from '@/pages/AddOnPage'
import AddOnFollowUpPage from '@/pages/AddOnFollowUpPage'
import AddOnNutritionPlanPage from '@/pages/AddOnNutritionPlanPage'
import SignUp from '@/pages/SignUp'
import VerifyCode from '@/pages/VerifyCode'
import PatientDetails from '@/pages/PatientDetails'
import ChooseService from '@/pages/ChooseService'
import ChooseSchedule from '@/pages/ChooseSchedule'
import Payment from '@/pages/Payment'
import Confirmation from '@/pages/Confirmation'
import Login from '@/pages/Login'
import PatientDashboard from '@/pages/PatientDashboard'
import AdminDashboard from '@/pages/AdminDashboard'
import { AdminServices } from '@/pages/AdminServices'
import { AdminShop } from '@/pages/AdminShop'
import { AdminSchedule } from '@/pages/AdminSchedule'
import { AdminPayments } from '@/pages/AdminPayments'
import { AdminUsers } from '@/pages/AdminUsers'
import { AdminAuditLog } from '@/pages/AdminAuditTrail'
import AdminBookings from '@/pages/AdminBookings'
import AdminSettings from '@/pages/AdminSettings'
import { AdminOrders } from '@/pages/AdminOrders'
import AdminReports from '@/pages/AdminReports'

function AppRoutes() {
  // Force re-evaluation of auth/session guards on every route change.
  // This prevents stale localStorage-derived guards after login/logout
  // (e.g. needing manual refresh before admin dashboard appears).
  useLocation()

  const hasAdminSession = !!localStorage.getItem('adminToken')

  // Avoid redirect loops: only treat patient session as valid when both token and identity exist.
  const patientToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  const patientEmail = localStorage.getItem('patientEmail') || sessionStorage.getItem('patientEmail')
  const patientAuthFlag =
    localStorage.getItem('isAuthenticated') === 'true' ||
    sessionStorage.getItem('isAuthenticated') === 'true'
  const hasPatientSession = !!patientToken && !!patientEmail && patientAuthFlag

  return (
    <Routes>
        {/* Patient Booking Routes */}
        <Route
          path="/"
          element={
            hasAdminSession
              ? <Navigate to="/admin/dashboard" replace />
              : hasPatientSession
                ? <Navigate to="/dashboard" replace />
                : <LandingPage />
          }
        />
  <Route path="/about-us" element={<AboutUsPage />} />
  <Route path="/services" element={<ServicesPage />} />
  <Route path="/services/nuwendo-starter" element={<ServiceNuwendoStarterPage />} />
  <Route path="/services/initial-consultation" element={<ServiceInitialConsultationPage />} />
  <Route path="/add-on" element={<AddOnPage />} />
  <Route path="/add-on/follow-up" element={<AddOnFollowUpPage />} />
  <Route path="/add-on/nutrition-plan" element={<AddOnNutritionPlanPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/patient-details" element={<PatientDetails />} />
        <Route path="/choose-service" element={<ChooseService />} />
        <Route path="/choose-schedule" element={<ChooseSchedule />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/confirmation" element={<Confirmation />} />
        
        {/* Patient Login & Dashboard */}
        <Route
          path="/login"
          element={
            hasAdminSession
              ? <Navigate to="/admin/dashboard" replace />
              : hasPatientSession
                ? <Navigate to="/dashboard" replace />
                : <Login />
          }
        />
        <Route
          path="/dashboard"
          element={
            hasPatientSession
              ? <PatientDashboard />
              : <Navigate to="/login" replace />
          }
        />
        
        {/* Admin Routes - login redirects to /login */}
        <Route path="/admin" element={hasAdminSession ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/dashboard" element={hasAdminSession ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/services" element={hasAdminSession ? <AdminServices /> : <Navigate to="/login" replace />} />
        <Route path="/admin/shop" element={hasAdminSession ? <AdminShop /> : <Navigate to="/login" replace />} />
        <Route path="/admin/schedule" element={hasAdminSession ? <AdminSchedule /> : <Navigate to="/login" replace />} />
        <Route path="/admin/payments" element={hasAdminSession ? <AdminPayments /> : <Navigate to="/login" replace />} />
        <Route path="/admin/bookings" element={hasAdminSession ? <AdminBookings /> : <Navigate to="/login" replace />} />
        <Route path="/admin/users" element={hasAdminSession ? <AdminUsers /> : <Navigate to="/login" replace />} />
        <Route path="/admin/orders" element={hasAdminSession ? <AdminOrders /> : <Navigate to="/login" replace />} />
        <Route path="/admin/audit-logs" element={hasAdminSession ? <AdminAuditLog /> : <Navigate to="/login" replace />} />
  <Route path="/admin/reports" element={hasAdminSession ? <AdminReports /> : <Navigate to="/login" replace />} />
        <Route path="/admin/settings" element={hasAdminSession ? <AdminSettings /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
