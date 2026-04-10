import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Save,
  ToggleLeft,
  ToggleRight,
  Info,
  Loader2,
  Settings
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/AdminLayout'

import { API_URL } from '@/config/api'

interface AvailabilityWindow {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string | null
  created_by_name: string | null
  updated_by_name: string | null
}

export function AdminSchedule() {
  const navigate = useNavigate()
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingWindow, setEditingWindow] = useState<AvailabilityWindow | null>(null)
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '07:30',
    end_time: '17:30',
    is_active: true
  })
  
  // Reschedule settings state
  const [showRescheduleSettings, setShowRescheduleSettings] = useState(false)
  const [rescheduleSettings, setRescheduleSettings] = useState({
    patient_min_hours_before: 24,
    admin_min_hours_before: 1,
    max_reschedules_per_booking: 3,
    allow_patient_reschedule: true,
    allow_admin_reschedule: true,
    patient_cancel_min_hours_before: 24,
    admin_cancel_min_hours_before: 1,
    allow_patient_cancellation: true,
    allow_admin_cancellation: true
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/login')
      return
    }
    fetchAvailability()
    fetchRescheduleSettings()
  }, [navigate])

  const fetchAvailability = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/time-slots`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login')
          return
        }
        throw new Error(data.message || 'Failed to fetch availability')
      }

      setAvailabilityWindows(data.timeSlots)
    } catch (err: any) {
      setError(err.message || 'Failed to load availability')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRescheduleSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/reschedule/settings`)
      const data = await response.json()
      
      if (data.success && data.settings) {
        setRescheduleSettings({
          patient_min_hours_before: data.settings.patient_min_hours_before,
          admin_min_hours_before: data.settings.admin_min_hours_before,
          max_reschedules_per_booking: data.settings.max_reschedules_per_booking,
          allow_patient_reschedule: data.settings.allow_patient_reschedule,
          allow_admin_reschedule: data.settings.allow_admin_reschedule,
          patient_cancel_min_hours_before: data.settings.patient_cancel_min_hours_before ?? 24,
          admin_cancel_min_hours_before: data.settings.admin_cancel_min_hours_before ?? 1,
          allow_patient_cancellation: data.settings.allow_patient_cancellation ?? true,
          allow_admin_cancellation: data.settings.allow_admin_cancellation ?? true
        })
      }
    } catch (err: any) {
      console.error('Failed to load reschedule settings:', err)
    }
  }

  const handleSaveRescheduleSettings = async () => {
    setSavingSettings(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/reschedule/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rescheduleSettings)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update settings')
      }

      setShowRescheduleSettings(false)
      // Show success message
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate times
    if (formData.start_time >= formData.end_time) {
      setError('End time must be after start time')
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const url = editingWindow 
        ? `${API_URL}/admin/time-slots/${editingWindow.id}`
        : `${API_URL}/admin/time-slots`
      
      const method = editingWindow ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save availability')
      }

      await fetchAvailability()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to save availability')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this availability window?')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/time-slots/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete availability')
      }

      await fetchAvailability()
    } catch (err: any) {
      setError(err.message || 'Failed to delete availability')
    }
  }

  const handleToggleActive = async (window: AvailabilityWindow) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/time-slots/${window.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...window,
          is_active: !window.is_active
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update availability')
      }

      await fetchAvailability()
    } catch (err: any) {
      setError(err.message || 'Failed to update availability')
    }
  }

  const resetForm = () => {
    setFormData({
      day_of_week: 1,
      start_time: '07:30',
      end_time: '17:30',
      is_active: true
    })
    setEditingWindow(null)
    setShowForm(false)
  }

  const startEdit = (window: AvailabilityWindow) => {
    setFormData({
      day_of_week: window.day_of_week,
      start_time: window.start_time,
      end_time: window.end_time,
      is_active: window.is_active
    })
    setEditingWindow(window)
    setShowForm(true)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Calculate total hours available
  const calculateHours = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    
    const durationMinutes = endTotalMinutes - startTotalMinutes
    const hours = Math.floor(durationMinutes / 60)
    const mins = durationMinutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Group availability windows by day
  const windowsByDay = availabilityWindows.reduce((acc: Record<number, AvailabilityWindow[]>, window) => {
    if (!acc[window.day_of_week]) {
      acc[window.day_of_week] = []
    }
    acc[window.day_of_week].push(window)
    return acc
  }, {} as Record<number, AvailabilityWindow[]>)

  // Sort days to show Monday-Sunday
  const sortedDays = [1, 2, 3, 4, 5, 6, 0]

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
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Schedule</h1>
            <p className="text-gray-500">Set working hours for each day</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowRescheduleSettings(true)} 
              variant="outline"
              className="border-gray-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => setShowForm(true)} disabled={showForm} className="bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
          </div>
        </div>
        {error && (
          <div className="p-4 mb-6 text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Info banner */}
        <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">How it works:</p>
            <p>Set your available hours for each day. The system dynamically calculates available slots based on service duration and existing bookings.</p>
          </div>
        </div>

        {/* Form Modal */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWindow ? 'Edit Availability' : 'Add Availability'}</DialogTitle>
              <DialogDescription>
                {editingWindow ? 'Update availability for this day' : 'Set availability for a specific day'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="day">Day of Week *</Label>
                  <select
                    id="day"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                    required
                  >
                    {dayNames.map((name, index) => (
                      <option key={index} value={index}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available for {calculateHours(formData.start_time, formData.end_time)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand hover:bg-brand/90">
                  <Save className="h-4 w-4 mr-2" />
                  {editingWindow ? 'Update' : 'Create'} Availability
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Availability by Day */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDays.map((dayIndex) => {
            const dayWindows = windowsByDay[dayIndex] || []
            
            return (
              <Card key={dayIndex}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand" />
                    <CardTitle className="text-lg">{dayNames[dayIndex]}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dayWindows.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hours set</p>
                  ) : (
                    dayWindows.map((window: AvailabilityWindow) => (
                      <div
                        key={window.id}
                        className={`space-y-2 pb-4 border-b last:border-b-0 last:pb-0 ${
                          window.is_active ? '' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={window.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
                            {window.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="text-sm font-semibold text-gray-900">
                          {formatTime(window.start_time)} - {formatTime(window.end_time)}
                        </div>

                        <div className="text-xs text-gray-500">
                          {calculateHours(window.start_time, window.end_time)} available
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(window)}
                            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                            title={window.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {window.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(window)}
                            className="flex items-center gap-1 text-xs text-gray-600 hover:text-brand transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(window.id)}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Reschedule Settings Dialog */}
        <Dialog open={showRescheduleSettings} onOpenChange={setShowRescheduleSettings}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] p-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b bg-white shrink-0">
              <DialogTitle>Reschedule & Cancellation Settings</DialogTitle>
              <DialogDescription>
                Configure time restrictions and limits for rescheduling and cancelling appointments
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0">
              {/* Patient Restrictions */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Patient Restrictions</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="patient_hours">Minimum Hours Before Appointment</Label>
                  <Input
                    id="patient_hours"
                    type="number"
                    min="0"
                    value={rescheduleSettings.patient_min_hours_before}
                    onChange={(e) => setRescheduleSettings({
                      ...rescheduleSettings,
                      patient_min_hours_before: parseInt(e.target.value || '24')
                    })}
                  />
                  <p className="text-xs text-gray-500">
                    Patients cannot reschedule within this many hours before the appointment
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Patient Reschedule</Label>
                    <p className="text-xs text-gray-500">Enable patients to reschedule their appointments</p>
                  </div>
                  <button
                    onClick={() => setRescheduleSettings({
                      ...rescheduleSettings,
                      allow_patient_reschedule: !rescheduleSettings.allow_patient_reschedule
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rescheduleSettings.allow_patient_reschedule ? 'bg-brand' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rescheduleSettings.allow_patient_reschedule ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Admin Restrictions */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900">Admin Restrictions</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="admin_hours">Minimum Hours Before Appointment</Label>
                  <Input
                    id="admin_hours"
                    type="number"
                    min="0"
                    value={rescheduleSettings.admin_min_hours_before}
                    onChange={(e) => setRescheduleSettings({
                      ...rescheduleSettings,
                      admin_min_hours_before: parseInt(e.target.value || '1')
                    })}
                  />
                  <p className="text-xs text-gray-500">
                    Admins cannot reschedule within this many hours before the appointment
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Admin Reschedule</Label>
                    <p className="text-xs text-gray-500">Enable admins to reschedule appointments</p>
                  </div>
                  <button
                    onClick={() => setRescheduleSettings({
                      ...rescheduleSettings,
                      allow_admin_reschedule: !rescheduleSettings.allow_admin_reschedule
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rescheduleSettings.allow_admin_reschedule ? 'bg-brand' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rescheduleSettings.allow_admin_reschedule ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* General Restrictions */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900">General Limits</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="max_reschedules">Maximum Reschedules Per Booking</Label>
                  <Input
                    id="max_reschedules"
                    type="number"
                    min="1"
                    max="10"
                    value={rescheduleSettings.max_reschedules_per_booking}
                    onChange={(e) => setRescheduleSettings({
                      ...rescheduleSettings,
                      max_reschedules_per_booking: parseInt(e.target.value || '1')
                    })}
                  />
                  <p className="text-xs text-gray-500">
                    Maximum number of times a booking can be rescheduled
                  </p>
                </div>
              </div>

              {/* Cancellation Restrictions */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900">Cancellation Restrictions (Patient)</h3>

                <div className="space-y-2">
                  <Label htmlFor="patient_cancel_hours">Minimum Hours Before Appointment</Label>
                  <Input
                    id="patient_cancel_hours"
                    type="number"
                    min="0"
                    value={rescheduleSettings.patient_cancel_min_hours_before}
                    onChange={(e) => setRescheduleSettings({
                      ...rescheduleSettings,
                      patient_cancel_min_hours_before: parseInt(e.target.value || '0')
                    })}
                  />
                  <p className="text-xs text-gray-500">
                    Patients cannot cancel within this many hours before the appointment
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Patient Cancellation</Label>
                    <p className="text-xs text-gray-500">Enable patients to cancel their appointments</p>
                  </div>
                  <button
                    onClick={() => setRescheduleSettings({
                      ...rescheduleSettings,
                      allow_patient_cancellation: !rescheduleSettings.allow_patient_cancellation
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rescheduleSettings.allow_patient_cancellation ? 'bg-brand' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rescheduleSettings.allow_patient_cancellation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900">Cancellation Restrictions (Admin)</h3>

                <div className="space-y-2">
                  <Label htmlFor="admin_cancel_hours">Minimum Hours Before Appointment</Label>
                  <Input
                    id="admin_cancel_hours"
                    type="number"
                    min="0"
                    value={rescheduleSettings.admin_cancel_min_hours_before}
                    onChange={(e) => setRescheduleSettings({
                      ...rescheduleSettings,
                      admin_cancel_min_hours_before: parseInt(e.target.value || '0')
                    })}
                  />
                  <p className="text-xs text-gray-500">
                    Admins cannot cancel within this many hours before the appointment
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Admin Cancellation</Label>
                    <p className="text-xs text-gray-500">Enable admins to cancel appointments</p>
                  </div>
                  <button
                    onClick={() => setRescheduleSettings({
                      ...rescheduleSettings,
                      allow_admin_cancellation: !rescheduleSettings.allow_admin_cancellation
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rescheduleSettings.allow_admin_cancellation ? 'bg-brand' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rescheduleSettings.allow_admin_cancellation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleSettings(false)}
                disabled={savingSettings}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRescheduleSettings}
                disabled={savingSettings}
                className="bg-brand hover:bg-brand/90"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export default AdminSchedule
