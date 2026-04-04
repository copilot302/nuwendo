import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
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

function App() {
  const hasAdminSession = !!localStorage.getItem('adminToken')

  // Avoid redirect loops: only treat patient session as valid when both token and identity exist.
  const patientToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  const patientEmail = localStorage.getItem('patientEmail') || sessionStorage.getItem('patientEmail')
  const hasPatientSession = !!patientToken && !!patientEmail

  return (
    <BrowserRouter>
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
        <Route path="/dashboard" element={<PatientDashboard />} />
        
        {/* Admin Routes - login redirects to /login */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/services" element={<AdminServices />} />
        <Route path="/admin/shop" element={<AdminShop />} />
        <Route path="/admin/schedule" element={<AdminSchedule />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLog />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
