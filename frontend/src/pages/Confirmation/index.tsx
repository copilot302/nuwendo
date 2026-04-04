import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, Clock, Mail, Download, Monitor, Building2, ClockIcon } from 'lucide-react'

export default function Confirmation() {
  const navigate = useNavigate()
  
  // Support both signup flow and logged-in patient flow
  const signupEmail = sessionStorage.getItem('signupEmail') || ''
  const patientEmail = sessionStorage.getItem('patientEmail') || localStorage.getItem('patientEmail') || ''
  const email = patientEmail || signupEmail
  const isValidUser = email !== ''
  
  const service = JSON.parse(sessionStorage.getItem('selectedService') || '{}')
  const bookingDate = sessionStorage.getItem('bookingDate') || ''
  const bookingTime = sessionStorage.getItem('bookingTime') || ''
  const appointmentType = sessionStorage.getItem('appointmentType') || 'on-site'
  const bookingConfirmation = JSON.parse(sessionStorage.getItem('bookingConfirmation') || '{}')
  const isPending = bookingConfirmation.status === 'pending'

  useEffect(() => {
    if (!isValidUser || !service.id || !bookingDate || !bookingTime) {
      navigate('/signup')
    }
  }, [isValidUser, service, bookingDate, bookingTime, navigate])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleDone = () => {
    const isLoggedIn =
      sessionStorage.getItem('isAuthenticated') === 'true' ||
      localStorage.getItem('isAuthenticated') === 'true' ||
      !!localStorage.getItem('authToken')
    
    // Clear booking-related data
    sessionStorage.removeItem('selectedService')
    sessionStorage.removeItem('bookingDate')
    sessionStorage.removeItem('bookingTime')
    sessionStorage.removeItem('appointmentType')
    sessionStorage.removeItem('bookingConfirmation')
    sessionStorage.removeItem('verificationCode')
    sessionStorage.removeItem('patientDetails')
    
    // For new signups, they have completed the booking flow successfully
    // Set them as authenticated so they can access their dashboard
    if (signupEmail && !isLoggedIn) {
      sessionStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('isAuthenticated', 'true')
      sessionStorage.setItem('patientEmail', signupEmail)
      localStorage.setItem('patientEmail', signupEmail)
      sessionStorage.removeItem('signupEmail')
      // ensure authToken is in localStorage as well (was stored in sessionStorage during VerifyCode)
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
      if (token) {
        sessionStorage.setItem('authToken', token)
        localStorage.setItem('authToken', token)
      }
      navigate('/dashboard')
    } else if (isLoggedIn) {
      navigate('/dashboard')
    } else {
      sessionStorage.clear()
      navigate('/')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white"
    >
      {/* Confirmation Details */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo-full.svg" alt="Nuwendo Metabolic Clinic" className="h-16" />
          </div>

          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-8"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              isPending ? 'bg-yellow-100' : 'bg-brand-100'
            }`}>
              {isPending ? (
                <ClockIcon className="w-10 h-10 text-yellow-600" />
              ) : (
                <CheckCircle className="w-10 h-10 text-brand" />
              )}
            </div>
          </motion.div>

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {isPending ? 'Booking Submitted!' : 'Booking Confirmed!'}
            </h1>
            <p className="text-lg text-gray-600">
              {isPending 
                ? 'Your appointment is pending payment verification'
                : 'Your appointment has been successfully booked'
              }
            </p>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-xl text-gray-900 mb-6">{service.name}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  {appointmentType === 'online' ? (
                    <Monitor className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-500">Appointment Type</div>
                  <div className="font-medium text-gray-900">
                    {appointmentType === 'online' ? 'Online (Video Call)' : 'On-Site (Clinic Visit)'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Date</div>
                  <div className="font-medium text-gray-900">{formatDate(bookingDate)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Time</div>
                  <div className="font-medium text-gray-900">{formatTime(bookingTime)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Confirmation sent to</div>
                  <div className="font-medium text-gray-900">{email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-base bg-brand hover:bg-brand-600"
              onClick={handleDone}
            >
              Done
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => {}}
            >
              <Download className="w-4 h-4 mr-2" />
              Add to Calendar
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isPending 
              ? 'Our team will verify your payment and confirm your appointment shortly.'
              : 'A confirmation email has been sent to your email address with all the details.'
            }
          </p>
        </div>
      </div>
    </motion.div>
  )
}
