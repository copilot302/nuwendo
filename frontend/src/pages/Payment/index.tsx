import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Calendar, Clock, Upload, CheckCircle, AlertCircle, ImageIcon } from 'lucide-react'
import { BASE_URL } from '@/config/api'

interface PaymentSettings {
  payment_qr_code: string
  payment_instructions: string
  payment_account_name: string
  payment_account_number: string
}

export default function Payment() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const signupEmail = sessionStorage.getItem('signupEmail') || ''
  const verificationCode = sessionStorage.getItem('verificationCode') || ''
  const patientEmail = sessionStorage.getItem('patientEmail') || localStorage.getItem('patientEmail') || ''
  const isAuthenticated =
    sessionStorage.getItem('isAuthenticated') === 'true' ||
    localStorage.getItem('isAuthenticated') === 'true' ||
    !!localStorage.getItem('authToken')
  const isValidUser = (signupEmail && verificationCode) || (patientEmail && isAuthenticated)
  
  const email = patientEmail || signupEmail
  
  const service = JSON.parse(sessionStorage.getItem('selectedService') || '{}')
  const bookingDate = sessionStorage.getItem('bookingDate') || ''
  const bookingTime = sessionStorage.getItem('bookingTime') || ''
  const appointmentType = sessionStorage.getItem('appointmentType') || 'on-site'
  const patientDetails = JSON.parse(sessionStorage.getItem('patientDetails') || '{}')
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [error, setError] = useState('')
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (!isValidUser || !service.id || !bookingDate || !bookingTime) {
      navigate('/signup')
      return
    }
    fetchPaymentSettings()
  }, [isValidUser, service, bookingDate, bookingTime, navigate])

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/booking/payment-settings`)
      const data = await response.json()
      if (data.success) {
        setPaymentSettings(data.settings)
      }
    } catch (err) {
      console.error('Failed to fetch payment settings:', err)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File must be less than 5MB')
        return
      }
      setError('')
      const reader = new FileReader()
      reader.onloadend = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const createBookingAndUploadReceipt = async () => {
    if (!receiptPreview) {
      setError('Please upload your payment receipt')
      return
    }
    setIsLoading(true)
    setError('')
    let createdBookingId: number | null = null
    try {
      const bookingRes = await fetch(`${BASE_URL}/api/booking/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, serviceId: service.id, bookingDate, bookingTime, appointmentType,
          firstName: patientDetails.firstName || 'Guest',
          lastName: patientDetails.lastName || 'User',
          phoneNumber: patientDetails.contactNumber || '09000000000',
          paymentMethod: 'qr_payment'
        }),
      })
      const bookingData = await bookingRes.json()
      if (!bookingRes.ok) throw new Error(bookingData.message || 'Failed to create booking')
      createdBookingId = bookingData.bookingId
      
      const receiptRes = await fetch(`${BASE_URL}/api/booking/${bookingData.bookingId}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptData: receiptPreview, email }),
      })
      const receiptData = await receiptRes.json()
      if (!receiptRes.ok) throw new Error(receiptData.message || 'Failed to upload receipt')
      
      setUploadSuccess(true)
      sessionStorage.setItem('bookingConfirmation', JSON.stringify({ bookingId: bookingData.bookingId, status: 'pending' }))
      setTimeout(() => navigate('/confirmation'), 2000)
    } catch (err) {
      if (createdBookingId) {
        try {
          await fetch(`${BASE_URL}/api/booking/${createdBookingId}/unpaid`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          })
        } catch (cleanupErr) {
          console.error('Failed to discard unpaid booking after receipt error:', cleanupErr)
        }

        setError('Receipt upload failed. Your booking was not saved. Please try again after fixing payment receipt upload.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: string) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(parseFloat(price))
  const formatTime = (time: string) => { const [h, m] = time.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}` }
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (isLoadingSettings) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="min-h-screen bg-white">
      <div className="flex flex-col px-6 sm:px-12 lg:px-20 py-12 max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => navigate('/choose-schedule')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /><span>Back</span></button>
          <img src="/logo-icon.svg" alt="Nuwendo" className="h-12 w-12" />
        </div>
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Complete payment</h1>
          <p className="text-lg text-gray-600">Scan the QR code to pay and upload your receipt</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-5 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Service</span><span className="font-medium">{service.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Type</span><span className={`px-2 py-1 rounded-full text-xs font-medium ${appointmentType === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-brand-100 text-brand'}`}>{appointmentType === 'online' ? 'Online' : 'On-Site'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Date</span><span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-gray-400" />{formatDate(bookingDate)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Time</span><span className="flex items-center gap-1"><Clock className="h-4 w-4 text-gray-400" />{formatTime(bookingTime)}</span></div>
            <div className="pt-3 border-t flex justify-between"><span className="font-semibold">Total</span><span className="font-bold text-xl text-brand">{formatPrice(service.price)}</span></div>
          </div>
        </div>
        {uploadSuccess && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 text-center"><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" /><h3 className="font-semibold text-green-800 mb-1">Receipt Uploaded!</h3><p className="text-green-600 text-sm">Pending approval.</p></motion.div>}
        {!uploadSuccess && <>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">Scan to Pay</h3>
            {paymentSettings?.payment_qr_code ? <div className="flex flex-col items-center"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4"><img src={paymentSettings.payment_qr_code} alt="QR" className="w-48 h-48 object-contain" /></div>{paymentSettings.payment_account_name && <p className="text-sm font-medium text-gray-900">{paymentSettings.payment_account_name}</p>}{paymentSettings.payment_account_number && <p className="text-sm text-gray-600">{paymentSettings.payment_account_number}</p>}</div> : <div className="flex flex-col items-center py-8 text-gray-400"><AlertCircle className="w-12 h-12 mb-2" /><p className="text-sm">QR code not available</p></div>}
            {paymentSettings?.payment_instructions && <div className="mt-4 p-4 bg-brand-50 rounded-xl"><p className="text-sm text-brand-700">{paymentSettings.payment_instructions}</p></div>}
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Payment Receipt</h3>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            {receiptPreview ? <div className="relative"><img src={receiptPreview} alt="Receipt" className="w-full max-h-64 object-contain rounded-xl border border-gray-200" /><button onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 bg-white/90 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white shadow-sm">Change</button></div> : <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center hover:border-brand hover:bg-brand-50/50"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3"><ImageIcon className="w-6 h-6 text-gray-400" /></div><p className="text-sm font-medium text-gray-700">Click to upload receipt</p><p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p></button>}
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6"><p className="text-sm text-red-600">{error}</p></div>}
          <Button onClick={createBookingAndUploadReceipt} className="w-full h-12 text-base bg-brand hover:bg-brand-600" disabled={isLoading || !receiptPreview}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Upload className="mr-2 h-4 w-4" />Submit Receipt</>}</Button>
          <p className="text-center text-sm text-gray-500 mt-4">Your appointment will be confirmed once payment is verified.</p>
        </>}
      </div>
    </motion.div>
  )
}
