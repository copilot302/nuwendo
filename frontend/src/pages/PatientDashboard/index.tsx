import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BASE_URL } from '@/config/api'
import { 
  Calendar, 
  LogOut, 
  ChevronRight,
  Phone,
  X,
  AlertCircle,
  Bell,
  Pencil,
  Check,
  Loader2,
  Video,
  ExternalLink,
  CalendarClock,
  ShoppingCart,
  Plus,
  Minus,
  ClipboardList,
  ArrowLeft
} from 'lucide-react'
import CartModal from '@/components/CartModal'
import { cartService } from '@/services/cartService'
import { addressService } from '@/services/addressService'

interface Appointment {
  id: number
  service_name: string
  booking_date: string
  booking_time: string
  appointment_type: string
  status: string
  first_name?: string
  last_name?: string
  phone_number?: string
  duration_minutes?: number
  video_call_link?: string
  reschedule_count?: number
  original_booking_date?: string
  original_booking_time?: string
  rescheduled_at?: string
  rescheduled_by?: string
}

interface PatientProfile {
  first_name: string
  last_name: string
  email: string
  phone: string
  age?: string
  cityAddress?: string
  region?: string
  province?: string
  city?: string
  barangay?: string
  street_address?: string
  height?: string
  weight?: string
  reasonForConsult?: string
  healthGoals?: string[]
}

type TabType = 'home' | 'services' | 'shop' | 'account'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [hasShopAccess, setHasShopAccess] = useState(false)
  const [shopItems, setShopItems] = useState<any[]>([])
  
  // Reschedule states
  const [reschedulingId, setReschedulingId] = useState<number | null>(null)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: '',
    new_time: '',
    reason: ''
  })
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    cityAddress: '',
    height: '',
    weight: '',
    reasonForConsult: ''
  })

  // Address editing states
  const [regions, setRegions] = useState<Array<{code: string, name: string}>>([])
  const [provinces, setProvinces] = useState<Array<{code: string, name: string}>>([])
  const [cities, setCities] = useState<Array<{code: string, name: string}>>([])
  const [barangays, setBarangays] = useState<Array<{code: string, name: string}>>([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('')
  const [selectedCityCode, setSelectedCityCode] = useState('')
  const [selectedBarangayName, setSelectedBarangayName] = useState('')
  const [streetAddress, setStreetAddress] = useState('')

  // Shopping cart states
  const [showCartModal, setShowCartModal] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [selectedShopItem, setSelectedShopItem] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [itemQuantity, setItemQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartMessage, setCartMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Order monitoring states
  const [showOrders, setShowOrders] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [markingReceived, setMarkingReceived] = useState<number | null>(null)

  useEffect(() => {
    const patientEmail = sessionStorage.getItem('patientEmail')
    
    if (!patientEmail) {
      navigate('/login')
      return
    }

    // Set email immediately so it never shows "-"
    setProfile(prev => (prev ? prev : { 
      first_name: '',
      last_name: '',
      email: patientEmail,
      phone: '',
      age: '',
      cityAddress: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
      street_address: '',
      height: '',
      weight: '',
      reasonForConsult: '',
      healthGoals: []
    }))

    fetchPatientProfile(patientEmail)
    fetchDashboardData(patientEmail)
    checkShopAccess()

    // Check shop access every 5 seconds
    const shopAccessInterval = setInterval(() => {
      checkShopAccess()
    }, 5000)

    // Also check when window/tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkShopAccess()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(shopAccessInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [navigate])

  // Load cart count when accessing shop
  useEffect(() => {
    if (activeTab === 'shop' && hasShopAccess) {
      loadCartCount()
    }
  }, [activeTab, hasShopAccess])

  const checkShopAccess = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      const email = sessionStorage.getItem('patientEmail')
      
      // If no token, use email-based endpoint (for legacy sessions)
      if (!token && email) {
        const response = await fetch(`${BASE_URL}/api/shop/access/by-email?email=${encodeURIComponent(email)}`)
        const data = await response.json()
        
        if (data.success) {
          setHasShopAccess(data.hasAccess)
          if (data.hasAccess) {
            fetchShopItems() // Now this will work for legacy sessions too!
          }
        }
        return
      }

      if (!token) {
        console.log('No auth token found')
        return
      }

      const response = await fetch(`${BASE_URL}/api/shop/access`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setHasShopAccess(data.hasAccess)
        if (data.hasAccess) {
          fetchShopItems()
        }
      }
    } catch (error) {
      console.error('Failed to check shop access:', error)
    }
  }

  const fetchShopItems = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      const email = sessionStorage.getItem('patientEmail')
      
      // If no token, use email-based endpoint (for legacy sessions)
      if (!token && email) {
        const response = await fetch(`${BASE_URL}/api/shop/items/by-email?email=${encodeURIComponent(email)}`)
        const data = await response.json()
        
        if (data.success) {
          setShopItems(data.items)
        }
        return
      }

      if (!token) return

      const response = await fetch(`${BASE_URL}/api/shop/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setShopItems(data.items)
      }
    } catch (error) {
      console.error('Failed to fetch shop items:', error)
    }
  }

  const fetchPatientProfile = async (email: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/patient/profile?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        const p = data.profile
        setProfile({
          first_name: p.firstName || '',
          last_name: p.lastName || '',
          email: email,
          phone: p.phone || '',
          age: p.age || '',
          cityAddress: p.address || '',
          region: p.region || '',
          province: p.province || '',
          city: p.city || '',
          barangay: p.barangay || '',
          street_address: p.street_address || '',
          height: p.height || '',
          weight: p.weight || '',
          reasonForConsult: p.reasonForConsult || '',
          healthGoals: p.healthGoals || []
        })
        // Also update edit form
        setEditForm({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          phone: p.phone || '',
          age: p.age || '',
          cityAddress: p.address || '',
          height: p.height || '',
          weight: p.weight || '',
          reasonForConsult: p.reasonForConsult || ''
        })
      } else {
        // API returned error - populate what we can from sessionStorage
        setProfile(prev => ({ ...prev!, email }))
        loadPatientDetailsFromSession()
      }
    } catch (error) {
      console.error('Failed to fetch patient profile:', error)
      // Fall back to session storage
      setProfile(prev => ({ ...prev!, email }))
      loadPatientDetailsFromSession()
    }
  }

  const loadPatientDetailsFromSession = () => {
    // Load patient details from sessionStorage
    const storedDetails = sessionStorage.getItem('patientDetails')
    if (storedDetails) {
      try {
        const details = JSON.parse(storedDetails)
        setProfile(prev => ({
          ...prev!,
          first_name: details.firstName || prev?.first_name || '',
          last_name: details.lastName || prev?.last_name || '',
          phone: details.contactNumber || prev?.phone || '',
          age: details.age || '',
          cityAddress: details.cityAddress || details.streetAddress || '',
          region: details.region || '',
          province: details.province || '',
          city: details.city || '',
          barangay: details.barangay || '',
          street_address: details.streetAddress || '',
          height: details.height || '',
          weight: details.weight || '',
          reasonForConsult: details.reasonForConsult || '',
          healthGoals: details.healthGoals || []
        }))
      } catch (e) {
        console.error('Error parsing patient details:', e)
      }
    }
  }

  const fetchDashboardData = async (email: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/booking/patient?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        const bookings = data.bookings || []
        setAppointments(bookings)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const email = sessionStorage.getItem('patientEmail')
      if (!email) return

      const response = await fetch(`${BASE_URL}/api/patient/profile/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phone,
          address: editForm.cityAddress,
          // Structured address fields
          region: selectedRegionCode,
          province: selectedProvinceCode,
          city: selectedCityCode,
          barangay: selectedBarangayName,
          street_address: streetAddress,
          age: editForm.age,
          height: editForm.height,
          weight: editForm.weight,
          reasonForConsult: editForm.reasonForConsult,
          healthGoals: profile?.healthGoals || []
        })
      })

      if (response.ok) {
        // Update local profile state
        setProfile(prev => ({
          ...prev!,
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          phone: editForm.phone,
          cityAddress: editForm.cityAddress,
          region: selectedRegionCode,
          province: selectedProvinceCode,
          city: selectedCityCode,
          barangay: selectedBarangayName,
          street_address: streetAddress,
          age: editForm.age,
          height: editForm.height,
          weight: editForm.weight,
          reasonForConsult: editForm.reasonForConsult
        }))
        setIsEditingProfile(false)
        setIsEditingAddress(false)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditingProfile = () => {
    setEditForm({
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      age: profile?.age || '',
      cityAddress: profile?.cityAddress || '',
      height: profile?.height || '',
      weight: profile?.weight || '',
      reasonForConsult: profile?.reasonForConsult || ''
    })
    setIsEditingProfile(true)
  }

  const startEditingAddress = async () => {
    // Pre-populate address fields from profile
    if (profile?.region) setSelectedRegionCode(profile.region)
    if (profile?.province) setSelectedProvinceCode(profile.province)
    if (profile?.city) setSelectedCityCode(profile.city)
    if (profile?.barangay) setSelectedBarangayName(profile.barangay)
    if (profile?.street_address) setStreetAddress(profile.street_address)
    
    setEditForm(prev => ({
      ...prev,
      cityAddress: profile?.cityAddress || ''
    }))
    setIsEditingAddress(true)
    
    // Load regions and any existing address data
    await loadRegions()
    if (profile?.region) {
      const provincesData = await addressService.getProvinces(profile.region)
      setProvinces(provincesData)
      
      if (profile?.province) {
        const citiesData = await addressService.getCities(profile.province)
        setCities(citiesData)
        
        if (profile?.city) {
          const barangaysData = await addressService.getBarangays(profile.city)
          setBarangays(barangaysData)
        }
      }
    }
  }

  const loadRegions = async () => {
    try {
      const regionsData = await addressService.getRegions()
      setRegions(regionsData)
    } catch (error) {
      console.error('Failed to load regions:', error)
    }
  }

  const handleRegionChange = async (regionCode: string) => {
    setSelectedRegionCode(regionCode)
    setSelectedProvinceCode('')
    setSelectedCityCode('')
    setSelectedBarangayName('')
    setProvinces([])
    setCities([])
    setBarangays([])

    try {
      const provincesData = await addressService.getProvinces(regionCode)
      setProvinces(provincesData)
    } catch (error) {
      console.error('Failed to load provinces:', error)
    }
  }

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode)
    setSelectedCityCode('')
    setSelectedBarangayName('')
    setCities([])
    setBarangays([])

    try {
      const citiesData = await addressService.getCities(provinceCode)
      setCities(citiesData)
    } catch (error) {
      console.error('Failed to load cities:', error)
    }
  }

  const handleCityChange = async (cityCode: string) => {
    setSelectedCityCode(cityCode)
    setSelectedBarangayName('')
    setBarangays([])

    try {
      const barangaysData = await addressService.getBarangays(cityCode)
      setBarangays(barangaysData)
    } catch (error) {
      console.error('Failed to load barangays:', error)
    }
  }

  const handleBarangayChange = (barangayName: string) => {
    setSelectedBarangayName(barangayName)
  }

  const handleLogout = () => {
    sessionStorage.clear()
    localStorage.removeItem('authToken')
    navigate('/')
  }

  // Check if appointment can be cancelled (24 hours before)
  const canCancelAppointment = (bookingDate: string, bookingTime: string) => {
    // Parse the date properly - booking_date comes as ISO string from DB
    const dateStr = bookingDate.split('T')[0] // Get just the date part (YYYY-MM-DD)
    const appointmentDateTime = new Date(`${dateStr}T${bookingTime}`)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    console.log('Cancellation check:', { dateStr, bookingTime, appointmentDateTime, now, hoursUntilAppointment })
    return hoursUntilAppointment >= 24
  }

  // Calculate end time based on start time and duration
  const getEndTime = (startTime: string, durationMinutes: number = 30) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMins = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
  }

  const handleCancelAppointment = async (appointmentId: number) => {
    setCancellingId(appointmentId)
    setCancelError(null)
    
    try {
      const response = await fetch(`${BASE_URL}/api/booking/${appointmentId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: profile?.email
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Refresh appointments
        const patientEmail = sessionStorage.getItem('patientEmail')
        if (patientEmail) {
          fetchDashboardData(patientEmail)
        }
      } else {
        setCancelError(data.message || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      setCancelError('Failed to cancel appointment')
    } finally {
      setCancellingId(null)
    }
  }

  // Function reserved for future use
  // const canRescheduleAppointment = (bookingDate: string, bookingTime: string) => {
  //   const dateStr = bookingDate.split('T')[0]
  //   const appointmentDateTime = new Date(`${dateStr}T${bookingTime}`)
  //   const now = new Date()
  //   const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  //   return hoursUntilAppointment >= 24 // Same as cancel - 24 hour restriction
  // }

  const fetchAvailableSlots = async (date: string) => {
    if (!date || !selectedAppointment) return
    
    setLoadingSlots(true)
    try {
      // Include appointment type from the selected appointment
      const appointmentType = selectedAppointment.appointment_type || 'on-site';
      const response = await fetch(`${BASE_URL}/api/reschedule/available-slots?date=${date}&appointment_type=${appointmentType}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        setAvailableSlots(data.availableSlots || [])
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleRescheduleClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setRescheduleForm({
      new_date: '',
      new_time: '',
      reason: ''
    })
    setRescheduleError(null)
    setAvailableSlots([])
    setShowRescheduleDialog(true)
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedAppointment || !rescheduleForm.new_date || !rescheduleForm.new_time) {
      setRescheduleError('Please select a new date and time')
      return
    }

    setReschedulingId(selectedAppointment.id)
    setRescheduleError(null)

    try {
      const response = await fetch(`${BASE_URL}/api/reschedule/booking/${selectedAppointment.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_date: rescheduleForm.new_date,
          new_time: rescheduleForm.new_time,
          reason: rescheduleForm.reason,
          user_type: 'patient',
          rescheduled_by_email: profile?.email
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowRescheduleDialog(false)
        setSelectedAppointment(null)
        // Refresh appointments
        const patientEmail = sessionStorage.getItem('patientEmail')
        if (patientEmail) {
          fetchDashboardData(patientEmail)
        }
      } else {
        setRescheduleError(data.message || 'Failed to reschedule appointment')
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      setRescheduleError('Failed to reschedule appointment')
    } finally {
      setReschedulingId(null)
    }
  }

  const handleNewAppointment = () => {
    if (profile) {
      const patientDetails = {
        firstName: profile.first_name,
        lastName: profile.last_name,
        contactNumber: profile.phone,
        age: '',
        cityAddress: '',
        height: '',
        weight: '',
        reasonForConsult: '',
        healthGoals: []
      }
      sessionStorage.setItem('patientDetails', JSON.stringify(patientDetails))
      sessionStorage.setItem('patientFirstName', profile.first_name)
      sessionStorage.setItem('patientLastName', profile.last_name)
      sessionStorage.setItem('patientPhone', profile.phone)
    }
    navigate('/choose-service')
  }

  // Cart functions
  const loadCartCount = async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    if (!token) return
    try {
      const cart = await cartService.getCart()
      setCartItemCount(cart.itemCount)
    } catch (err) {
      // silently ignore - user may not have cart access yet
    }
  }

  const handleItemClick = (item: any) => {
    setSelectedShopItem(item)
    setSelectedVariant(item.variants?.[0] || null)
    setItemQuantity(1)
    setCartMessage(null)
  }

  const handleAddToCart = async () => {
    if (!selectedShopItem || !selectedVariant) return
    
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    if (!token) {
      setCartMessage({ type: 'error', text: 'Your session has expired. Please log in again.' })
      return
    }

    try {
      setAddingToCart(true)
      await cartService.addToCart(selectedShopItem.id, selectedVariant.id, itemQuantity)
      setCartMessage({ type: 'success', text: 'Added to cart!' })
      loadCartCount()
      setTimeout(() => {
        setSelectedShopItem(null)
        setCartMessage(null)
      }, 1500)
    } catch (err: any) {
      setCartMessage({ type: 'error', text: err.message || 'Failed to add to cart' })
    } finally {
      setAddingToCart(false)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true)
      const data = await cartService.getOrders()
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleMarkReceived = async (orderId: number) => {
    try {
      setMarkingReceived(orderId)
      await cartService.markOrderReceived(orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'received' } : o))
    } catch (err) {
      console.error('Failed to mark order as received:', err)
    } finally {
      setMarkingReceived(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'received': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white flex flex-col"
    >
      {/* Header - Sticky like admin dashboard */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <img src="/logo-full.svg" alt="Nuwendo Metabolic Clinic" className="h-12" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-full p-1 my-4">
            {(['home', 'services', ...(hasShopAccess ? ['shop' as const] : []), 'account'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Welcome Message */}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}
              </h1>
            </div>

            {/* Explore Card */}
            <div 
              onClick={handleNewAppointment}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-800 to-brand-600 p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative z-10">
                <h2 className="text-xl font-semibold text-white mb-1">Explore your options</h2>
                <p className="text-white/80 text-sm mb-4">
                  See why thousands of Filipinos<br />
                  choose Nuwendo for their journey
                </p>
                <Button 
                  variant="secondary" 
                  className="bg-white text-gray-900 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNewAppointment()
                  }}
                >
                  Get Started
                </Button>
              </div>
              {/* Decorative image placeholder */}
              <div className="absolute right-4 bottom-0 w-32 h-32 opacity-50">
                <div className="w-full h-full bg-white/20 rounded-full" />
              </div>
            </div>

            {/* Recent Treatments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Treatments</h2>
                {appointments.length > 0 && (
                  <button 
                    onClick={() => setActiveTab('services')}
                    className="text-sm text-brand hover:underline"
                  >
                    View all
                  </button>
                )}
              </div>

              {appointments.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">No services booked yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-brand" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{apt.service_name}</h3>
                            {(apt.reschedule_count ?? 0) > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                ↻ Rescheduled
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(apt.booking_date)} at {formatTime(apt.booking_time)} - {formatTime(getEndTime(apt.booking_time, apt.duration_minutes || 30))}
                          </p>
                          {(apt.reschedule_count ?? 0) > 0 && apt.original_booking_date && (
                            <p className="text-xs text-orange-600 mt-1">
                              Originally: {formatDate(apt.original_booking_date)} at {formatTime(apt.original_booking_time || '')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          apt.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700' 
                            : apt.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {apt.status}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-gray-900">Your Services</h1>
            
            {cancelError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600">{cancelError}</p>
              </div>
            )}
            
            {appointments.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">No services booked yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => {
                  const isCancellable = apt.status !== 'cancelled' && canCancelAppointment(apt.booking_date, apt.booking_time)
                  const isCancelling = cancellingId === apt.id
                  
                  return (
                    <div
                      key={apt.id}
                      className="p-4 border border-gray-200 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-brand" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{apt.service_name}</h3>
                              {(apt.reschedule_count ?? 0) > 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                  ↻ Rescheduled ({apt.reschedule_count}x)
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDate(apt.booking_date)} at {formatTime(apt.booking_time)} - {formatTime(getEndTime(apt.booking_time, apt.duration_minutes || 30))}
                            </p>
                            {(apt.reschedule_count ?? 0) > 0 && apt.original_booking_date && (
                              <p className="text-xs text-orange-600 mt-1">
                                Originally scheduled: {formatDate(apt.original_booking_date)} at {formatTime(apt.original_booking_time || '')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            apt.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700' 
                              : apt.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : apt.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {apt.status}
                          </span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            apt.appointment_type === 'online'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {apt.appointment_type}
                          </span>
                        </div>
                      </div>
                      
                      {/* Meeting Link for confirmed online appointments */}
                      {apt.appointment_type === 'online' && apt.status === 'confirmed' && apt.video_call_link && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Video className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-1">Video Consultation Link</p>
                              <a
                                href={apt.video_call_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all flex items-center gap-1"
                              >
                                {apt.video_call_link}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Reschedule and Cancel buttons - only show if 24+ hours before */}
                      {apt.status !== 'cancelled' && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                          {isCancellable ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRescheduleClick(apt)}
                                disabled={isCancelling}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <CalendarClock className="w-4 h-4 mr-2" />
                                Reschedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelAppointment(apt.id)}
                                disabled={isCancelling}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                {isCancelling ? (
                                  <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    Cancelling...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel Appointment
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400">
                              Cancellation/Reschedule not available (less than 24 hours before appointment)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-6">
            {!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken')) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                <p className="text-yellow-800 text-sm font-medium">Your session needs to be refreshed to use the shop.</p>
                <button
                  onClick={() => { sessionStorage.clear(); localStorage.removeItem('authToken'); navigate('/login') }}
                  className="ml-4 px-4 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                >
                  Log in again
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Shop</h1>
                <p className="text-gray-600">Browse and purchase available products</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setShowOrders(!showOrders)
                    if (!showOrders && orders.length === 0) fetchOrders()
                  }}
                  variant={showOrders ? "default" : "outline"}
                  className={showOrders ? "bg-brand hover:bg-brand/90" : ""}
                >
                  <ClipboardList className="w-5 h-5 mr-2" />
                  My Orders
                </Button>
                <Button
                  onClick={() => setShowCartModal(true)}
                  variant="outline"
                  className="relative"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Cart
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-brand text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Orders View */}
            {showOrders ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowOrders(false)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Shop
                  </button>
                  <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loadingOrders}>
                    {loadingOrders ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                  </Button>
                </div>

                {loadingOrders && orders.length === 0 ? (
                  <div className="text-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                              {order.payment_verified ? (
                                <span className="text-xs text-green-600 font-medium">Payment Verified</span>
                              ) : (
                                <span className="text-xs text-yellow-600 font-medium">Payment Pending</span>
                              )}
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="space-y-2 mb-3">
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.item_name} {item.variant_name ? `(${item.variant_name})` : ''} x{item.quantity}
                                </span>
                                <span className="font-medium text-gray-900">
                                  ₱{(parseFloat(item.price_at_purchase) * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <span className="font-semibold text-gray-900">
                              Total: ₱{parseFloat(order.total_amount).toLocaleString()}
                            </span>
                            {(order.status === 'shipped' || order.status === 'delivered') && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkReceived(order.id)}
                                disabled={markingReceived === order.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {markingReceived === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <Check className="w-4 h-4 mr-1" />
                                )}
                                Order Received
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
            {shopItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">No items available at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {shopItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    <CardContent className="p-0 flex flex-col flex-1">
                      {item.image_url && (
                        <div className="h-48 bg-gray-100 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                        {item.category && (
                          <p className="text-xs text-brand mb-2">{item.category}</p>
                        )}
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* Variants pricing list */}
                        {item.variants && item.variants.length > 0 ? (
                          <div className="space-y-1.5 mb-4">
                            {item.variants.map((v: any) => (
                              <div key={v.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{v.name}</span>
                                <span className="font-semibold text-gray-900">
                                  ₱{parseFloat(v.price).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-auto">
                          <Button 
                            onClick={() => handleItemClick(item)}
                            className="w-full bg-brand hover:bg-brand/90"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Item Selection Modal */}
            {selectedShopItem && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl max-w-md w-full p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedShopItem.name}
                      </h3>
                      {selectedShopItem.category && (
                        <p className="text-sm text-brand">{selectedShopItem.category}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedShopItem(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {selectedShopItem.description && (
                    <p className="text-sm text-gray-600">{selectedShopItem.description}</p>
                  )}

                  {/* Variant Selection */}
                  {selectedShopItem.variants && selectedShopItem.variants.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Select Variant:</label>
                      <div className="space-y-2">
                        {selectedShopItem.variants.map((variant: any) => (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedVariant(variant)}
                            className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                              selectedVariant?.id === variant.id
                                ? 'border-brand bg-brand-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">{variant.name}</span>
                              <span className="font-semibold text-brand">
                                ₱{parseFloat(variant.price).toLocaleString()}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Quantity:</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                        disabled={itemQuantity <= 1}
                        className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">{itemQuantity}</span>
                      <button
                        onClick={() => setItemQuantity(itemQuantity + 1)}
                        className="p-2 border rounded-lg hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Total Price */}
                  {selectedVariant && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-gray-700">Total:</span>
                        <span className="font-bold text-brand">
                          ₱{(parseFloat(selectedVariant.price) * itemQuantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {cartMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        cartMessage.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {cartMessage.text}
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setSelectedShopItem(null)}
                      variant="outline"
                      className="flex-1"
                      disabled={addingToCart}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddToCart}
                      className="flex-1 bg-brand hover:bg-brand/90"
                      disabled={addingToCart || !selectedVariant}
                    >
                      {addingToCart ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
              </>
            )}

            {/* Cart Modal */}
            <CartModal
              open={showCartModal}
              onClose={() => setShowCartModal(false)}
              onCartUpdate={loadCartCount}
            />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* About You */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">About You</CardTitle>
                {!isEditingProfile ? (
                  <Button variant="outline" size="sm" onClick={startEditingProfile}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingProfile(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-brand hover:bg-brand-600"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">First Name</label>
                      <Input
                        value={editForm.firstName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Last Name</label>
                      <Input
                        value={editForm.lastName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Email</label>
                      <p className="text-brand mt-1">{profile?.email || '-'}</p>
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Phone</label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Age</label>
                      <Input
                        value={editForm.age}
                        onChange={(e) => setEditForm(prev => ({ ...prev, age: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">City / Address</label>
                      <Input
                        value={editForm.cityAddress}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cityAddress: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Height (cm)</label>
                      <Input
                        value={editForm.height}
                        onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Weight (kg)</label>
                      <Input
                        value={editForm.weight}
                        onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-gray-900">Reason for Consultation</label>
                      <Textarea
                        value={editForm.reasonForConsult}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reasonForConsult: e.target.value }))}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Name</label>
                        <p className="text-gray-600">
                          {profile?.first_name && profile?.last_name 
                            ? `${profile.first_name} ${profile.last_name}` 
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Email</label>
                        <p className="text-brand">{profile?.email || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Phone</label>
                        <p className="text-gray-600">{profile?.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Age</label>
                        <p className="text-gray-600">{profile?.age || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">City / Address</label>
                        <p className="text-gray-600">{profile?.cityAddress || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Height</label>
                        <p className="text-gray-600">{profile?.height ? `${profile.height} cm` : '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Weight</label>
                        <p className="text-gray-600">{profile?.weight ? `${profile.weight} kg` : '-'}</p>
                      </div>
                    </div>
                    {profile?.reasonForConsult && (
                      <div>
                        <label className="text-sm font-medium text-gray-900">Reason for Consultation</label>
                        <p className="text-gray-600">{profile.reasonForConsult}</p>
                      </div>
                    )}
                    {profile?.healthGoals && profile.healthGoals.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-900">Health Goals</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile.healthGoals.map((goal, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-sm"
                            >
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Default Address */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Default Address</CardTitle>
                {!isEditingAddress ? (
                  <Button variant="outline" size="sm" onClick={startEditingAddress}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingAddress(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-brand hover:bg-brand-600"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isEditingAddress ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Region */}
                      <div>
                        <Label htmlFor="region">Region</Label>
                        <Select value={selectedRegionCode} onValueChange={handleRegionChange}>
                          <SelectTrigger id="region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((region) => (
                              <SelectItem key={region.code} value={region.code}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Province */}
                      <div>
                        <Label htmlFor="province">Province</Label>
                        <Select 
                          value={selectedProvinceCode} 
                          onValueChange={handleProvinceChange}
                          disabled={!selectedRegionCode}
                        >
                          <SelectTrigger id="province">
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem key={province.code} value={province.code}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City */}
                      <div>
                        <Label htmlFor="city">City/Municipality</Label>
                        <Select 
                          value={selectedCityCode} 
                          onValueChange={handleCityChange}
                          disabled={!selectedProvinceCode}
                        >
                          <SelectTrigger id="city">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city.code} value={city.code}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Barangay */}
                      <div>
                        <Label htmlFor="barangay">Barangay</Label>
                        <Select 
                          value={selectedBarangayName} 
                          onValueChange={handleBarangayChange}
                          disabled={!selectedCityCode}
                        >
                          <SelectTrigger id="barangay">
                            <SelectValue placeholder="Select barangay" />
                          </SelectTrigger>
                          <SelectContent>
                            {barangays.map((barangay) => (
                              <SelectItem key={barangay.name} value={barangay.name}>
                                {barangay.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Street Address */}
                    <div>
                      <Label htmlFor="streetAddress">Street Address (House/Bldg No., Street Name)</Label>
                      <Input
                        id="streetAddress"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="e.g., 123 Main Street, Unit 4B"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-900">Address</label>
                    {profile?.region ? (
                      <div className="text-gray-600 mt-1 space-y-1">
                        <p>{profile.street_address}</p>
                        <p>{profile.barangay}, {profile.city}</p>
                        <p>{profile.province}, {profile.region}</p>
                      </div>
                    ) : (
                      <p className="text-gray-600 mt-1">{profile?.cityAddress || 'No address saved yet.'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logout Button */}
            <Button 
              onClick={handleLogout}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800"
            >
              Log out <LogOut className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div>
              <img src="/logo-full.svg" alt="Nuwendo" className="h-14 brightness-0 invert mb-4" />
            </div>
            <p className="text-lg text-white/90">Your health always comes first</p>
          </div>
          
          <div className="border-t border-gray-800 pt-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Pages</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-brand hover:text-brand-300">About Us</a></li>
                <li><a href="#" className="text-brand hover:text-brand-300">Health Club</a></li>
                <li><a href="#" className="text-brand hover:text-brand-300">FAQs</a></li>
                <li><a href="#" className="text-brand hover:text-brand-300">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Learn</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-brand hover:text-brand-300">Weight Loss</a></li>
                <li><a href="#" className="text-brand hover:text-brand-300">Metabolic Health</a></li>
                <li><a href="#" className="text-brand hover:text-brand-300">Nutrition</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-2 md:text-right">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Contact Us</h4>
              <p className="text-brand text-sm">hello@nuwendo.com</p>
              <p className="text-brand text-sm flex items-center md:justify-end gap-2 mt-2">
                <Phone className="w-4 h-4" />
                (02) 8888-NUWE
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <div className="flex gap-4 mb-4 md:mb-0">
              <a href="#">Terms & Conditions</a>
              <a href="#">Privacy Policy</a>
            </div>
            <p>© 2026 Nuwendo Metabolic Clinic. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Reschedule Dialog */}
      {showRescheduleDialog && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Reschedule Appointment
            </h3>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Current:</strong> {selectedAppointment.service_name}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(selectedAppointment.booking_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} at {selectedAppointment.booking_time}
              </p>
            </div>

            {rescheduleError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{rescheduleError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 block mb-1">
                  New Date
                </label>
                <Input
                  type="date"
                  value={rescheduleForm.new_date}
                  onChange={(e) => {
                    const newDate = e.target.value
                    setRescheduleForm(prev => ({ ...prev, new_date: newDate, new_time: '' }))
                    if (newDate) {
                      fetchAvailableSlots(newDate)
                    } else {
                      setAvailableSlots([])
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 block mb-1">
                  New Time {loadingSlots && <span className="text-xs text-gray-500">(Loading available slots...)</span>}
                </label>
                {rescheduleForm.new_date && availableSlots.length > 0 ? (
                  <select
                    value={rescheduleForm.new_time}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, new_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select available time slot</option>
                    {availableSlots.map((slot) => (
                      <option key={slot.id} value={slot.start_time}>
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </option>
                    ))}
                  </select>
                ) : rescheduleForm.new_date && !loadingSlots && availableSlots.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-orange-300 bg-orange-50 rounded-md text-sm text-orange-700">
                    ⚠️ No available time slots for this date. Please select a different date.
                  </div>
                ) : (
                  <Input
                    type="time"
                    value={rescheduleForm.new_time}
                    disabled
                    placeholder="Select a date first"
                    className="w-full"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 block mb-1">
                  Reason (Optional)
                </label>
                <Textarea
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Why are you rescheduling?"
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRescheduleDialog(false)
                  setSelectedAppointment(null)
                  setRescheduleError(null)
                }}
                disabled={reschedulingId !== null}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRescheduleSubmit}
                disabled={reschedulingId !== null || !rescheduleForm.new_date || !rescheduleForm.new_time}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {reschedulingId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  <>
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Confirm Reschedule
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
