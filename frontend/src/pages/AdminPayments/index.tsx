import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Save,
  Check,
  X,
  Image as ImageIcon,
  Loader2,
  QrCode,
  CreditCard,
  Eye,
  Download,
  Calendar,
  Clock,
  Settings,
  Search,
  Package,
  User,
  Mail,
  CheckCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/AdminLayout'

import { API_URL } from '@/config/api'

interface PaymentSettings {
  payment_qr_code: string
  payment_instructions: string
  payment_account_name: string
  payment_account_number: string
}

interface PendingBooking {
  id: number
  booking_date: string
  booking_time: string
  status: string
  amount_paid: number
  first_name: string
  last_name: string
  email: string
  service_name: string
  duration_minutes: number
  price: string
  payment_receipt_url: string
  payment_receipt_uploaded_at: string
  appointment_type: string
  created_at: string
}

interface ShopOrder {
  id: number
  email: string
  first_name: string
  last_name: string
  total_amount: number
  status: string
  payment_verified: boolean
  payment_receipt_url: string | null
  created_at: string
  item_count: number
  items: {
    id: number
    item_name: string
    variant_name: string | null
    quantity: number
    price_at_purchase: number
  }[]
}

interface ReceiptViewerState {
  url: string
  title: string
}

const isValidGoogleMeetLink = (value: string) => {
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'https:' && parsed.hostname === 'meet.google.com' && parsed.pathname !== '/'
  } catch {
    return false
  }
}

export function AdminPayments() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [settings, setSettings] = useState<PaymentSettings>({
    payment_qr_code: '',
    payment_instructions: '',
    payment_account_name: '',
    payment_account_number: ''
  })
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const [receiptViewer, setReceiptViewer] = useState<ReceiptViewerState | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [meetingLinks, setMeetingLinks] = useState<Record<number, string>>({})
  const [meetingLinkErrors, setMeetingLinkErrors] = useState<Record<number, string>>({})
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last7days' | 'last30days'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [shopDateFilter, setShopDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last7days' | 'last30days'>('all')
  const [shopSearchQuery, setShopSearchQuery] = useState('')
  
  // Shop order payment states
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([])
  const [shopVerifyingId, setShopVerifyingId] = useState<number | null>(null)
  const [shopRejectingId, setShopRejectingId] = useState<number | null>(null)
  const [activePaymentTab, setActivePaymentTab] = useState<'bookings' | 'orders'>('bookings')

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      navigate('/login')
      return
    }
    fetchData()
  }, [navigate])

  useEffect(() => {
    if (!receiptViewer) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReceiptViewer(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [receiptViewer])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchPaymentSettings(), fetchPendingPayments(), fetchShopOrders()])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPaymentSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
        if (data.settings.payment_qr_code) {
          setQrPreview(data.settings.payment_qr_code)
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error)
    }
  }

  const fetchPendingPayments = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/pending-payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setPendingBookings(data.bookings)
      }
    } catch (error) {
      console.error('Failed to fetch pending payments:', error)
    }
  }

  const fetchShopOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/orders?status=pending&payment_verified=false&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setShopOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch shop orders:', error)
    }
  }

  const handleApproveShopPayment = async (orderId: number) => {
    setShopVerifyingId(orderId)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/verify-payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_verified: true })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to approve payment')
      
      setShopOrders(prev => prev.filter(o => o.id !== orderId))
      setSuccess('Shop order payment approved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to approve payment')
    } finally {
      setShopVerifyingId(null)
    }
  }

  const handleRejectShopPayment = async (orderId: number) => {
    setShopRejectingId(orderId)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to reject payment')

      setShopOrders(prev => prev.filter(o => o.id !== orderId))
      setSuccess('Shop order payment rejected')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment')
    } finally {
      setShopRejectingId(null)
    }
  }

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('File size must be less than 2MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setQrPreview(base64)
        setSettings(prev => ({ ...prev, payment_qr_code: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/payment-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_code: settings.payment_qr_code,
          instructions: settings.payment_instructions,
          account_name: settings.payment_account_name,
          account_number: settings.payment_account_number
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('Payment settings saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error(data.message || 'Failed to save settings')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprovePayment = async (bookingId: number) => {
    const booking = pendingBookings.find(b => b.id === bookingId)
    const manualMeetingLink = (meetingLinks[bookingId] || '').trim()

    if (booking?.appointment_type === 'online' && !manualMeetingLink) {
      setMeetingLinkErrors(prev => ({
        ...prev,
        [bookingId]: 'Meeting link is required before approving this online booking.'
      }))
      setError('Please add the meeting link first.')
      return
    }

    if (booking?.appointment_type === 'online' && !isValidGoogleMeetLink(manualMeetingLink)) {
      setMeetingLinkErrors(prev => ({
        ...prev,
        [bookingId]: 'Enter a valid Google Meet link (https://meet.google.com/...) before approval.'
      }))
      setError('Invalid Google Meet link format.')
      return
    }

    setMeetingLinkErrors(prev => {
      const { [bookingId]: _removed, ...rest } = prev
      return rest
    })

    setApprovingId(bookingId)
    try {
      const token = localStorage.getItem('adminToken')

      const response = await fetch(`${API_URL}/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'confirmed',
          video_call_link: booking?.appointment_type === 'online' ? manualMeetingLink : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId))
        setMeetingLinks(prev => {
          const { [bookingId]: _removed, ...rest } = prev
          return rest
        })
        
        if (booking?.appointment_type === 'online') {
          setSuccess('Payment approved and booking confirmed with the meeting link.')
        } else {
          setSuccess('Payment approved and booking confirmed!')
        }
        setTimeout(() => setSuccess(''), 5000)
      } else {
        throw new Error(data.message || 'Failed to approve payment')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve payment')
    } finally {
      setApprovingId(null)
    }
  }

  const handleRejectPayment = async (bookingId: number) => {
    setRejectingId(bookingId)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      })

      const data = await response.json()
      if (data.success) {
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId))
        setSuccess('Booking rejected')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error(data.message || 'Failed to reject payment')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment')
    } finally {
      setRejectingId(null)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(typeof price === 'string' ? parseFloat(price) : price)
  }

  const formatOrderReference = (id: number, createdAt: string) => {
    const date = new Date(createdAt)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const paddedId = String(id).padStart(6, '0')
    return `TXN-${y}${m}${d}-${paddedId}`
  }

  // Helper function to check if a date matches the filter
  const matchesDateFilter = (createdAt: string, filter: 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days') => {
    if (filter === 'all') return true
    if (!createdAt) return false

    const bookingDate = new Date(createdAt)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  switch (filter) {
      case 'today':
        return bookingDate >= todayStart
      case 'yesterday':
        const yesterdayEnd = new Date(todayStart)
        return bookingDate >= yesterdayStart && bookingDate < yesterdayEnd
      case 'last7days':
        const sevenDaysAgo = new Date(todayStart)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return bookingDate >= sevenDaysAgo
      case 'last30days':
        const thirtyDaysAgo = new Date(todayStart)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return bookingDate >= thirtyDaysAgo
      default:
        return true
    }
  }

  // Filter pending bookings
  const filteredBookings = pendingBookings
    .filter(b => matchesDateFilter(b.created_at, dateFilter))
    .filter(b => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      const fullName = `${b.first_name} ${b.last_name}`.toLowerCase()
      return fullName.includes(query) || b.email.toLowerCase().includes(query)
    })

  const filteredShopOrders = shopOrders
    .filter(order => matchesDateFilter(order.created_at, shopDateFilter))
    .filter(order => {
      if (!shopSearchQuery.trim()) return true
      const query = shopSearchQuery.toLowerCase()
      const fullName = `${order.first_name} ${order.last_name}`.toLowerCase()
      const reference = formatOrderReference(order.id, order.created_at).toLowerCase()
      return (
        fullName.includes(query) ||
        order.email.toLowerCase().includes(query) ||
        reference.includes(query)
      )
    })

  const openReceiptViewer = (url: string, title: string) => {
    setReceiptViewer({ url, title })
  }

  const handleDownloadReceipt = async () => {
    if (!receiptViewer?.url) return

    try {
      const response = await fetch(receiptViewer.url)
      if (!response.ok) throw new Error('Failed to fetch receipt')

      const blob = await response.blob()
      const extension = blob.type.split('/')[1] || 'jpg'
      const safeTitle = receiptViewer.title.toLowerCase().replace(/\s+/g, '-')
      const fileName = `${safeTitle}-${Date.now()}.${extension}`

      const blobUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (downloadError) {
      // Fallback: still let admin access the file if browser blocks download
      window.open(receiptViewer.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-500">Review pending payments and configure settings</p>
          </div>
          <Button onClick={() => setShowSettingsModal(true)} variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            QR Code Settings
          </Button>
        </div>

        {error && (
          <div className="p-4 mb-6 text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 mb-6 text-green-600 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <Button
            variant={activePaymentTab === 'bookings' ? 'default' : 'outline'}
            onClick={() => setActivePaymentTab('bookings')}
            className={activePaymentTab === 'bookings' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Booking Payments
            {pendingBookings.length > 0 && (
              <Badge className="ml-2 bg-yellow-100 text-yellow-800">{pendingBookings.length}</Badge>
            )}
          </Button>
          <Button
            variant={activePaymentTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActivePaymentTab('orders')}
            className={activePaymentTab === 'orders' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <Package className="h-4 w-4 mr-2" />
            Shop Order Payments
            {shopOrders.length > 0 && (
              <Badge className="ml-2 bg-yellow-100 text-yellow-800">{shopOrders.length}</Badge>
            )}
          </Button>
        </div>

        {activePaymentTab === 'bookings' && (
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Pending Payments</CardTitle>
                {pendingBookings.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">{pendingBookings.length}</Badge>
                )}
              </div>

              <CardDescription>Review and approve payment receipts</CardDescription>

              <div className="flex flex-col lg:flex-row gap-3 pt-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={dateFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('all')}
                    className={dateFilter === 'all' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    All Time
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('today')}
                    className={dateFilter === 'today' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('yesterday')}
                    className={dateFilter === 'yesterday' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Yesterday
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'last7days' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('last7days')}
                    className={dateFilter === 'last7days' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'last30days' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('last30days')}
                    className={dateFilter === 'last30days' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Last 30 Days
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>
                    {searchQuery.trim()
                      ? `No payments found matching "${searchQuery}"`
                      : dateFilter !== 'all'
                      ? `No pending payments ${dateFilter === 'today' ? 'booked today' : dateFilter === 'yesterday' ? 'booked yesterday' : dateFilter === 'last7days' ? 'booked in the last 7 days' : 'booked in the last 30 days'}`
                      : 'No pending payments'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden xl:grid xl:grid-cols-[1.2fr_1.2fr_1.1fr_0.9fr_0.9fr_220px] gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Patient</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Service</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Date / Time</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Type</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Receipt / Price</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 text-right">Actions</p>
                  </div>

                  {filteredBookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:grid-cols-[1.2fr_1.2fr_1.1fr_0.9fr_0.9fr_220px] xl:items-center">
                        <div>
                          <p className="font-medium text-gray-900 truncate">{booking.first_name} {booking.last_name}</p>
                          <p className="text-xs text-gray-500 truncate">{booking.email}</p>
                        </div>

                        <div>
                          <p className="font-medium text-gray-900 truncate">{booking.service_name}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-700 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(booking.booking_date)}
                          </p>
                          <p className="text-sm text-gray-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(booking.booking_time)}
                          </p>
                          {booking.created_at && (
                            <p className="text-xs text-gray-400 mt-1">Booked: {formatDateTime(booking.created_at)}</p>
                          )}
                        </div>

                        <div>
                          <Badge
                            variant="outline"
                            className={
                              booking.appointment_type === 'online'
                                ? 'border-blue-200 text-blue-700 capitalize'
                                : 'border-purple-200 text-purple-700 capitalize'
                            }
                          >
                            {booking.appointment_type}
                          </Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-brand mb-1">{formatPrice(booking.price)}</p>
                          {booking.payment_receipt_url ? (
                            <button
                              onClick={() => openReceiptViewer(booking.payment_receipt_url, 'Booking Payment Receipt')}
                              className="inline-flex items-center gap-2 text-sm text-brand hover:underline"
                            >
                              <Eye className="w-4 h-4" />
                              View Receipt
                            </button>
                          ) : (
                            <p className="text-sm text-gray-400">No receipt</p>
                          )}

                          {booking.appointment_type === 'online' && (
                            <div className="mt-3 space-y-1">
                              <Label htmlFor={`meeting-link-${booking.id}`} className="text-xs text-gray-600">
                                Meeting Link (required)
                              </Label>
                              <Input
                                id={`meeting-link-${booking.id}`}
                                placeholder="https://meet.google.com/..."
                                value={meetingLinks[booking.id] || ''}
                                onChange={(e) =>
                                  {
                                    const value = e.target.value
                                    setMeetingLinks(prev => ({ ...prev, [booking.id]: value }))
                                    if (value.trim() && isValidGoogleMeetLink(value)) {
                                      setMeetingLinkErrors(prev => {
                                        const { [booking.id]: _removed, ...rest } = prev
                                        return rest
                                      })
                                    }
                                  }
                                }
                                className={`h-8 text-xs ${meetingLinkErrors[booking.id] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                              />
                              {meetingLinkErrors[booking.id] && (
                                <p className="text-xs text-red-600">{meetingLinkErrors[booking.id]}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row xl:flex-col gap-2 xl:items-stretch xl:justify-self-end xl:w-full">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprovePayment(booking.id)}
                            disabled={approvingId === booking.id || rejectingId === booking.id}
                          >
                            {approvingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectPayment(booking.id)}
                            disabled={approvingId === booking.id || rejectingId === booking.id}
                          >
                            {rejectingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activePaymentTab === 'orders' && (
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Unverified Shop Order Payments</CardTitle>
                {filteredShopOrders.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">{filteredShopOrders.length}</Badge>
                )}
              </div>
              <CardDescription>Review, approve, or reject payment receipts for shop orders</CardDescription>

              <div className="flex flex-col lg:flex-row gap-3 pt-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or reference..."
                    value={shopSearchQuery}
                    onChange={(e) => setShopSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={shopDateFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setShopDateFilter('all')}
                    className={shopDateFilter === 'all' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    All Time
                  </Button>
                  <Button
                    size="sm"
                    variant={shopDateFilter === 'today' ? 'default' : 'outline'}
                    onClick={() => setShopDateFilter('today')}
                    className={shopDateFilter === 'today' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={shopDateFilter === 'yesterday' ? 'default' : 'outline'}
                    onClick={() => setShopDateFilter('yesterday')}
                    className={shopDateFilter === 'yesterday' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Yesterday
                  </Button>
                  <Button
                    size="sm"
                    variant={shopDateFilter === 'last7days' ? 'default' : 'outline'}
                    onClick={() => setShopDateFilter('last7days')}
                    className={shopDateFilter === 'last7days' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    size="sm"
                    variant={shopDateFilter === 'last30days' ? 'default' : 'outline'}
                    onClick={() => setShopDateFilter('last30days')}
                    className={shopDateFilter === 'last30days' ? 'bg-brand hover:bg-brand/90' : ''}
                  >
                    Last 30 Days
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredShopOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>
                    {shopSearchQuery.trim()
                      ? `No shop payments found matching "${shopSearchQuery}"`
                      : shopDateFilter !== 'all'
                      ? `No shop payments ${shopDateFilter === 'today' ? 'created today' : shopDateFilter === 'yesterday' ? 'created yesterday' : shopDateFilter === 'last7days' ? 'created in the last 7 days' : 'created in the last 30 days'}`
                      : 'All shop order payments are verified'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden xl:grid xl:grid-cols-[1.2fr_0.9fr_1.1fr_1.6fr_0.9fr_220px] gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Customer</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Order</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Date</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Items</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">Receipt / Total</p>
                    <p className="text-xs font-semibold tracking-wide uppercase text-gray-500 text-right">Actions</p>
                  </div>

                  {filteredShopOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:grid-cols-[1.2fr_0.9fr_1.1fr_1.6fr_0.9fr_220px] xl:items-center">
                        <div>
                          <p className="text-sm text-gray-700 flex items-center gap-1 truncate">
                            <User className="w-3.5 h-3.5" />
                            {order.first_name} {order.last_name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <Mail className="w-3.5 h-3.5" />
                            {order.email}
                          </p>
                        </div>

                        <div>
                          <p className="font-medium text-gray-900">{formatOrderReference(order.id, order.created_at)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-700">{formatDateTime(order.created_at)}</p>
                        </div>

                        <div className="sm:col-span-2 xl:col-span-1">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {(order.items || [])
                              .map(item => `${item.item_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity}`)
                              .join(', ')}
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-brand">{formatPrice(order.total_amount)}</p>
                          {order.payment_receipt_url ? (
                            <button
                              onClick={() => order.payment_receipt_url && openReceiptViewer(order.payment_receipt_url, 'Shop Order Receipt')}
                              className="inline-flex items-center gap-2 text-sm text-brand hover:underline mt-1"
                            >
                              <Eye className="w-4 h-4" />
                              View Receipt
                            </button>
                          ) : (
                            <p className="text-sm text-gray-400 mt-1">No receipt</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 xl:justify-self-end xl:w-full">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveShopPayment(order.id)}
                            disabled={shopVerifyingId === order.id || shopRejectingId === order.id}
                          >
                            {shopVerifyingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectShopPayment(order.id)}
                            disabled={shopVerifyingId === order.id || shopRejectingId === order.id}
                          >
                            {shopRejectingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {receiptViewer && (
        <div
          className="fixed inset-0 z-50 bg-black/95"
          onClick={() => setReceiptViewer(null)}
        >
          <div className="absolute inset-x-0 top-0 z-10 p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg text-white">{receiptViewer.title}</h3>
                <p className="text-xs sm:text-sm text-white/75">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20">Esc</kbd> to close
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Receipt
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReceiptViewer(null)}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className="h-full w-full overflow-auto p-4 sm:p-10 lg:p-14 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={receiptViewer.url}
              alt={receiptViewer.title}
              className="max-h-[92vh] max-w-[96vw] w-auto h-auto object-contain rounded-xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Payment QR Code Settings
            </DialogTitle>
            <DialogDescription>
              Configure the QR code and payment details shown to patients
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Payment QR Code</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleQrUpload}
                accept="image/*"
                className="hidden"
              />

              {qrPreview ? (
                <div className="relative inline-block">
                  <img
                    src={qrPreview}
                    alt="QR Code Preview"
                    className="w-48 h-48 object-contain border border-gray-200 rounded-xl"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors shadow-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-brand hover:bg-brand-50/50 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Upload QR Code</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g., Nuwendo Clinic"
                value={settings.payment_account_name}
                onChange={(e) => setSettings(prev => ({ ...prev, payment_account_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number (GCash/Bank)</Label>
              <Input
                id="accountNumber"
                placeholder="e.g., 09123456789"
                value={settings.payment_account_number}
                onChange={(e) => setSettings(prev => ({ ...prev, payment_account_number: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Payment Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Instructions for patients..."
                value={settings.payment_instructions}
                onChange={(e) => setSettings(prev => ({ ...prev, payment_instructions: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleSaveSettings()
                  setShowSettingsModal(false)
                }}
                className="bg-brand hover:bg-brand-600"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminPayments
