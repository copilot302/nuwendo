import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Clock, ChevronLeft, ChevronRight, Monitor, Building2 } from 'lucide-react'
import { BASE_URL } from '@/config/api'

interface TimeSlot {
  id: number
  start_time: string
  end_time: string
}

type AppointmentType = 'online' | 'on-site'

export default function ChooseSchedule() {
  const navigate = useNavigate()
  
  // Support both signup flow and logged-in patient flow
  const signupEmail = sessionStorage.getItem('signupEmail') || ''
  const verificationCode = sessionStorage.getItem('verificationCode') || ''
  const patientEmail = sessionStorage.getItem('patientEmail') || localStorage.getItem('patientEmail') || ''
  const isAuthenticated =
    sessionStorage.getItem('isAuthenticated') === 'true' ||
    localStorage.getItem('isAuthenticated') === 'true' ||
    !!localStorage.getItem('authToken')
  const isValidUser = (signupEmail && verificationCode) || (patientEmail && isAuthenticated)
  
  const service = JSON.parse(sessionStorage.getItem('selectedService') || '{}')
  const serviceId = service?.id
  const storedAppointmentType = sessionStorage.getItem('appointmentType')
  const appointmentType = storedAppointmentType === 'online' || storedAppointmentType === 'on-site'
    ? (storedAppointmentType as AppointmentType)
    : null
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timeFilter, setTimeFilter] = useState<'AM' | 'PM'>('AM')

  useEffect(() => {
    if (!isValidUser) {
      navigate('/signup')
      return
    }

    if (!serviceId || !appointmentType) {
      navigate('/choose-service')
      return
    }
  }, [appointmentType, isValidUser, navigate, serviceId])

  // Fetch time slots based on selected date (appointment type is preference only)
  useEffect(() => {
    if (!selectedDate || !appointmentType || !serviceId) return

    const fetchSlots = async () => {
      setIsLoading(true)
      try {
        // Format date as YYYY-MM-DD in local timezone (avoid UTC conversion)
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

  const response = await fetch(`${BASE_URL}/api/availability?date=${dateStr}&serviceId=${serviceId}`)
        const data = await response.json()
        setAvailableSlots(data.availableSlots || [])
        setSelectedSlot(null)

        // Auto-select AM or PM based on available slots
        const slots = data.availableSlots || []
        const hasAM = slots.some((slot: TimeSlot) => {
          const [hours] = slot.start_time.split(':')
          return parseInt(hours) < 12
        })
        const hasPM = slots.some((slot: TimeSlot) => {
          const [hours] = slot.start_time.split(':')
          return parseInt(hours) >= 12
        })

        if (hasAM) {
          setTimeFilter('AM')
        } else if (hasPM) {
          setTimeFilter('PM')
        }
      } catch {
        setAvailableSlots([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchSlots()
  }, [selectedDate, appointmentType, serviceId])

  const handleContinue = () => {
    if (selectedDate && selectedSlot && appointmentType) {
      // Format date as YYYY-MM-DD in local timezone (avoid UTC conversion)
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      sessionStorage.setItem('bookingDate', dateStr)
      sessionStorage.setItem('bookingTime', selectedSlot.start_time)
      sessionStorage.setItem('appointmentType', appointmentType)
      navigate('/payment')
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getTimePeriod = (time: string) => {
    const [hours] = time.split(':')
    const hour = parseInt(hours)
    return hour >= 12 ? 'PM' : 'AM'
  }

  const filteredSlots = availableSlots.filter(slot => 
    getTimePeriod(slot.start_time) === timeFilter
  )

  const amSlots = availableSlots.filter(slot => getTimePeriod(slot.start_time) === 'AM')
  const pmSlots = availableSlots.filter(slot => getTimePeriod(slot.start_time) === 'PM')

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  
  const isToday = (day: number) => {
    const today = new Date()
    return currentMonth.getFullYear() === today.getFullYear() &&
           currentMonth.getMonth() === today.getMonth() &&
           day === today.getDate()
  }
  
  const isPast = (day: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate < today
  }
  
  const isSelected = (day: number) => {
    return selectedDate &&
           selectedDate.getFullYear() === currentMonth.getFullYear() &&
           selectedDate.getMonth() === currentMonth.getMonth() &&
           selectedDate.getDate() === day
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const past = isPast(day)
      days.push(
        <button
          key={day}
          disabled={past}
          onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
          className={`h-10 w-10 rounded-full text-sm font-medium transition-all
            ${past ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-brand-100'}
            ${isToday(day) && !isSelected(day) ? 'ring-2 ring-brand ring-offset-2' : ''}
            ${isSelected(day) ? 'bg-brand text-white hover:bg-brand-600' : ''}
          `}
        >
          {day}
        </button>
      )
    }
    
    return days
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white"
    >
      {/* Full Width - Calendar */}
      <div className="flex flex-col px-6 sm:px-12 lg:px-20 py-12 max-w-5xl mx-auto">
        {/* Back Button & Logo */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/choose-service')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <img src="/9.svg" alt="Nuwendo" className="h-12 w-12" />
        </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">
              Pick a date & time
            </h1>
            <p className="text-lg text-gray-600">
              Select when you'd like your appointment
            </p>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
              {appointmentType === 'online' ? <Monitor className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              {appointmentType === 'online' ? 'Preferred type: Online' : 'Preferred type: On-site'}
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-semibold text-lg">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-xs text-gray-500 font-medium py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 justify-items-center">
              {renderCalendar()}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold text-gray-900">Available times</span>
                </div>
                
                {/* AM/PM Toggle */}
                {availableSlots.length > 0 && (
                  <div className="flex gap-2">
                    {amSlots.length > 0 && (
                      <button
                        onClick={() => {
                          setTimeFilter('AM')
                          // Clear selection if current slot is not in AM
                          if (selectedSlot && getTimePeriod(selectedSlot.start_time) !== 'AM') {
                            setSelectedSlot(null)
                          }
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          timeFilter === 'AM'
                            ? 'bg-brand text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        AM ({amSlots.length})
                      </button>
                    )}
                    {pmSlots.length > 0 && (
                      <button
                        onClick={() => {
                          setTimeFilter('PM')
                          // Clear selection if current slot is not in PM
                          if (selectedSlot && getTimePeriod(selectedSlot.start_time) !== 'PM') {
                            setSelectedSlot(null)
                          }
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          timeFilter === 'PM'
                            ? 'bg-brand text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        PM ({pmSlots.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl">
                  No available slots for this date
                </p>
              ) : filteredSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl">
                  No {timeFilter} slots available. Try {timeFilter === 'AM' ? 'PM' : 'AM'}.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredSlots.map((slot, index) => {
                    const isSelected = selectedSlot?.start_time === slot.start_time
                    return (
                      <button
                        key={slot.start_time || index}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 text-sm font-medium rounded-xl border-2 transition-all duration-150
                          ${isSelected
                            ? 'bg-brand border-brand text-white'
                            : 'bg-white border-brand text-brand hover:bg-brand hover:text-white'}
                        `}
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        <Button 
          className="w-full h-12 text-base bg-brand hover:bg-brand-600"
          disabled={!selectedDate || !selectedSlot || !appointmentType}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
