import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  Search,
  Video,
  MapPin,
  User,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  CalendarClock,
  MoreHorizontal,
  Loader2,
  X,
  FileText,
  Target,
  Activity,
  Eye,
  Download,
} from 'lucide-react';
import { API_URL } from '@/config/api';

interface Booking {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  service_id: number;
  service_name: string;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  appointment_type: 'online' | 'in-person';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status?: string;
  business_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  time_status?: 'upcoming' | 'in_progress' | 'past';
  video_call_link?: string;
  notes?: string;
  admin_notes?: string;
  completed_at?: string;
  completed_by_name?: string;
  cancelled_at?: string;
  cancelled_by_type?: 'admin' | 'patient' | null;
  cancelled_by_name?: string | null;
  payment_receipt_url?: string | null;
  created_at: string;
  reschedule_count?: number;
  original_booking_date?: string;
  original_booking_time?: string;
  rescheduled_at?: string;
  rescheduled_by?: string;
}

interface PatientProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  medical_conditions: string;
  allergies: string;
  created_at: string;
  bookings: Array<{
    id: number;
    booking_date: string;
    booking_time: string;
    status: string;
  payment_status?: string;
    business_status?: string;
    cancelled_by_type?: 'admin' | 'patient' | null;
    service_name: string;
    amount_paid: number;
  }>;
}

interface ReceiptViewerState {
  url: string;
  title: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const businessStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
};

const timeStatusColors: Record<string, string> = {
  upcoming: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-purple-100 text-purple-800',
  past: 'bg-gray-200 text-gray-600',
};

// Status icons for future use
// const statusIcons: Record<string, React.ReactNode> = {
//   pending: <AlertCircle className="h-3 w-3" />,
//   confirmed: <CheckCircle className="h-3 w-3" />,
//   cancelled: <XCircle className="h-3 w-3" />,
//   completed: <CheckCircle className="h-3 w-3" />,
// };

// Calendar View Component
interface CalendarViewProps {
  bookings: Booking[];
  onDateClick: (date: Date, bookings: Booking[]) => void;
  onBookingClick: (booking: Booking) => void;
}

function CalendarView({ bookings, onDateClick, onBookingClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };
  
  const getBookingsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.slot_date === dateString);
  };
  
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button onClick={previousMonth} variant="outline" size="sm">
            ←
          </Button>
          <Button onClick={nextMonth} variant="outline" size="sm">
            →
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2 text-xs sm:text-sm">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = new Date(year, month, day);
          const dayBookings = getBookingsForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();
          
          return (
            <div
              key={day}
              className={`aspect-square border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                isToday ? 'border-brand bg-brand/5' : 'border-gray-200'
              }`}
              onClick={() => {
                if (dayBookings.length > 0) {
                  onDateClick(date, dayBookings);
                }
              }}
            >
              <div className="font-semibold text-sm mb-1">{day}</div>
              {dayBookings.length > 0 && (
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map(booking => (
                    <div
                      key={booking.id}
                      className={`text-xs px-1 py-0.5 rounded truncate ${
                        statusColors[booking.status]
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(booking);
                      }}
                    >
                      {booking.slot_time.substring(0, 5)} - {booking.patient_name}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode] = useState<'list' | 'calendar'>('list');
  const [_selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Reschedule states
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Business status update states
  const [showBusinessStatusDialog, setShowBusinessStatusDialog] = useState(false);
  const [updatingBusinessStatus, setUpdatingBusinessStatus] = useState(false);
  const [businessStatusForm, setBusinessStatusForm] = useState({
    business_status: '',
    admin_notes: ''
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: '',
    new_time: '',
    reason: ''
  });
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [selectedPatientProfile, setSelectedPatientProfile] = useState<PatientProfile | null>(null);
  const [isPatientProfileOpen, setIsPatientProfileOpen] = useState(false);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);
  const [patientProfileError, setPatientProfileError] = useState<string | null>(null);
  const [receiptViewer, setReceiptViewer] = useState<ReceiptViewerState | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Safety filter: pending-payment items belong to Admin Payments,
        // not Bookings list view.
        const visibleBookings = (data.bookings || []).filter((b: Booking) => b.status !== 'pending');
        setBookings(visibleBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (!receiptViewer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReceiptViewer(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [receiptViewer]);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.patient_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.business_status === statusFilter;
    const matchesType = typeFilter === 'all' || booking.appointment_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handlePatientProfileOpen = async (email: string) => {
    setIsPatientProfileOpen(true);
    setLoadingPatientProfile(true);
    setPatientProfileError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/admin/patients/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok || !data?.patient) {
        throw new Error(data?.message || 'Failed to load patient profile');
      }

      setSelectedPatientProfile(data.patient);
    } catch (error) {
      console.error('Error loading patient profile:', error);
      setPatientProfileError(error instanceof Error ? error.message : 'Failed to load patient profile');
    } finally {
      setLoadingPatientProfile(false);
    }
  };

  const handleRescheduleClick = () => {
    setRescheduleForm({
      new_date: '',
      new_time: '',
      reason: ''
    });
    setRescheduleError(null);
    setAvailableSlots([]);
    setShowRescheduleDialog(true);
    setIsModalOpen(false); // Close the booking details dialog
  };

  const fetchAvailableSlots = async (date: string) => {
    if (!date || !selectedBooking) return;
    
    setLoadingSlots(true);
    try {
      // Include appointment type from the selected booking
      const appointmentType = selectedBooking.appointment_type || 'on-site';
      const response = await fetch(`${API_URL}/reschedule/available-slots?date=${date}&appointment_type=${appointmentType}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableSlots(data.availableSlots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking || !rescheduleForm.new_date || !rescheduleForm.new_time) {
      setRescheduleError('Please select a new date and time');
      return;
    }

    setRescheduling(true);
    setRescheduleError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/reschedule/booking/${selectedBooking.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          new_date: rescheduleForm.new_date,
          new_time: rescheduleForm.new_time,
          reason: rescheduleForm.reason,
          user_type: 'admin'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowRescheduleDialog(false);
        setSelectedBooking(null);
        fetchBookings(); // Refresh bookings list
      } else {
        setRescheduleError(data.message || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      setRescheduleError('Failed to reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  };

  const handleBusinessStatusClick = (status: string) => {
    setBusinessStatusForm({
      business_status: status,
      admin_notes: ''
    });
    setShowBusinessStatusDialog(true);
    setIsModalOpen(false); // Close the booking details dialog
  };

  const handleBusinessStatusSubmit = async () => {
    if (!selectedBooking || !businessStatusForm.business_status) {
      return;
    }

    setUpdatingBusinessStatus(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/admin/bookings/${selectedBooking.id}/business-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(businessStatusForm)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowBusinessStatusDialog(false);
        setSelectedBooking(null);
        fetchBookings(); // Refresh bookings list
      } else {
        alert(data.message || 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating business status:', error);
      alert('Failed to update appointment status');
    } finally {
      setUpdatingBusinessStatus(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const hasAppointmentEnded = (bookingDate: string, bookingTime: string, durationMinutes: number) => {
    try {
      const now = new Date();
      
      // Parse booking date and time
      const dateStr = typeof bookingDate === 'string' && bookingDate.includes('T')
        ? bookingDate.split('T')[0]
        : String(bookingDate).split('T')[0];
      
      const timeStr = String(bookingTime).substring(0, 8);
      
      // Create appointment end time
      const appointmentStart = new Date(`${dateStr}T${timeStr}`);
      const appointmentEnd = new Date(appointmentStart.getTime() + (durationMinutes * 60 * 1000));
      
      // Return true if current time is after appointment end time
      return now > appointmentEnd;
    } catch (error) {
      console.error('Error checking if appointment ended:', error);
      return false; // Default to false to hide buttons if there's an error
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    try {
      const [hours, minutes] = startTime.split(':');
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const endMinutes = startMinutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    } catch {
      return startTime;
    }
  };

  const getCancelledByLabel = (booking: Booking) => {
    if (booking.cancelled_by_type === 'admin') {
      if (booking.payment_status === 'rejected') {
        return 'Rejected';
      }
      return booking.cancelled_by_name ? `Cancelled by ${booking.cancelled_by_name}` : 'Cancelled by admin';
    }
    if (booking.cancelled_by_type === 'patient') {
      return 'Cancelled by patient';
    }
    return null;
  };

  const getPatientBookingStatusInfo = (booking: PatientProfile['bookings'][number]) => {
    if (booking.business_status === 'completed' || booking.status === 'completed') {
      return { label: 'Completed', className: 'bg-blue-100 text-blue-700' };
    }

    if (booking.business_status === 'no_show') {
      return { label: 'No Show', className: 'bg-orange-100 text-orange-700' };
    }

    if (booking.business_status === 'cancelled' || booking.status === 'cancelled') {
      if (booking.cancelled_by_type === 'admin') {
        if (booking.payment_status === 'rejected') {
          return { label: 'Rejected', className: 'bg-red-100 text-red-700' };
        }
        return { label: 'Cancelled by Admin', className: 'bg-red-100 text-red-700' };
      }
      if (booking.cancelled_by_type === 'patient') {
        return { label: 'Cancelled by Patient', className: 'bg-red-100 text-red-700' };
      }
      return { label: 'Cancelled', className: 'bg-red-100 text-red-700' };
    }

    if (booking.status === 'confirmed') {
      return { label: 'Confirmed', className: 'bg-green-100 text-green-700' };
    }

    if (booking.status === 'pending') {
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
    }

    return { label: 'Scheduled', className: 'bg-gray-100 text-gray-700' };
  };

  const openReceiptViewer = (url: string, title: string) => {
    setReceiptViewer({ url, title });
  };

  const handleDownloadReceipt = async () => {
    if (!receiptViewer?.url) return;

    try {
      const response = await fetch(receiptViewer.url);
      if (!response.ok) throw new Error('Failed to fetch receipt');

      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'jpg';
      const safeTitle = receiptViewer.title.toLowerCase().replace(/\s+/g, '-');
      const fileName = `${safeTitle}-${Date.now()}.${extension}`;

      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(receiptViewer.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage all appointment bookings
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 w-full sm:w-auto">
            <Button onClick={fetchBookings} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by service, patient name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="in-person">In-Person</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'calendar' ? (
          <CalendarView 
            bookings={filteredBookings} 
            onDateClick={(date, dayBookings) => {
              setSelectedDate(date);
              // Open a dialog showing bookings for that day
              if (dayBookings.length > 0) {
                setSelectedBooking(dayBookings[0]);
                setIsModalOpen(true);
              }
            }}
            onBookingClick={(booking) => {
              setSelectedBooking(booking);
              setIsModalOpen(true);
            }}
          />
        ) : loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-[#2c4d5c]" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No bookings have been made yet'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="hidden xl:grid xl:grid-cols-12 gap-4 px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <div className="col-span-2">Patient</div>
              <div className="col-span-2">Service</div>
              <div className="col-span-2">Date / Time</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {filteredBookings.map((booking) => {
              const canStatusUpdate =
                booking.business_status !== 'completed' &&
                booking.business_status !== 'cancelled' &&
                hasAppointmentEnded(booking.slot_date, booking.slot_time, booking.duration_minutes);

              const canReschedule =
                (booking.status === 'pending' || booking.status === 'confirmed') &&
                booking.business_status !== 'cancelled' &&
                booking.business_status !== 'completed';

              return (
                <div
                  key={booking.id}
                  className="xl:grid xl:grid-cols-12 xl:items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="xl:col-span-2 min-w-0">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 xl:hidden mb-1">Patient</p>
                    <button
                      type="button"
                      onClick={() => handlePatientProfileOpen(booking.patient_email)}
                      className="font-semibold text-gray-900 truncate leading-tight text-left hover:text-blue-700 hover:underline"
                      title="View patient profile"
                    >
                      {booking.patient_name}
                    </button>
                    <p className="text-xs text-gray-500 truncate mt-1">{booking.patient_email}</p>
                  </div>

                  <div className="xl:col-span-2 min-w-0 mt-3 xl:mt-0">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 xl:hidden mb-1">Service</p>
                    <p className="text-sm text-gray-800 truncate leading-tight">{booking.service_name}</p>
                  </div>

                  <div className="xl:col-span-2 mt-3 xl:mt-0">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 xl:hidden mb-1">Date / Time</p>
                    <p className="text-sm text-gray-800">{formatDate(booking.slot_date)}</p>
                    <p className="text-xs text-gray-500">
                      {formatTime(booking.slot_time)} - {formatTime(calculateEndTime(booking.slot_time, booking.duration_minutes || 30))}
                    </p>
                    {(booking.reschedule_count ?? 0) > 0 && booking.original_booking_date && (
                      <p className="text-xs text-orange-600 mt-1">
                        ↻ Originally {formatDate(booking.original_booking_date)} {booking.original_booking_time ? `at ${formatTime(booking.original_booking_time)}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="xl:col-span-1 mt-3 xl:mt-0">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 xl:hidden mb-1">Type</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      {booking.appointment_type === 'online' ? (
                        <>
                          <Video className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-blue-700">Online</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-green-700">In-Person</span>
                        </>
                      )}
                    </div>
                    {booking.appointment_type === 'online' && booking.video_call_link && (
                      <a
                        href={booking.video_call_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        Join Meet <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="xl:col-span-2 mt-3 xl:mt-0">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 xl:hidden mb-1">Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`${businessStatusColors[booking.business_status]} text-xs`}>
                        {booking.business_status}
                      </Badge>
                      {booking.business_status === 'scheduled' && booking.time_status && (
                        <Badge className={`${timeStatusColors[booking.time_status]} text-xs`}>
                          {booking.time_status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    {booking.business_status === 'cancelled' && getCancelledByLabel(booking) && (
                      <p className="text-[11px] text-red-600 mt-1">{getCancelledByLabel(booking)}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-2">Booked: {formatDate(booking.created_at)}</p>
                  </div>

                  <div className="xl:col-span-3 mt-3 xl:mt-0 xl:justify-self-end">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 xl:hidden mb-1">Actions</p>
                    <div className="flex flex-wrap items-center xl:justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-full sm:w-auto"
                        onClick={() => handleBookingClick(booking)}
                      >
                        View
                      </Button>

                      {booking.payment_receipt_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => openReceiptViewer(booking.payment_receipt_url!, `Booking #${booking.id} Receipt`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Receipt
                        </Button>
                      )}

                      {(booking.business_status !== 'cancelled' && booking.business_status !== 'completed') || canStatusUpdate ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 px-2.5">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canReschedule && (
                              <DropdownMenuItem
                                className="text-blue-700 focus:text-blue-700"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setRescheduleForm({ new_date: '', new_time: '', reason: '' });
                                  setRescheduleError(null);
                                  setAvailableSlots([]);
                                  setShowRescheduleDialog(true);
                                }}
                              >
                                Reschedule Appointment
                              </DropdownMenuItem>
                            )}

                            {booking.business_status !== 'cancelled' && booking.business_status !== 'completed' && (
                              <DropdownMenuItem
                                className="text-red-700 focus:text-red-700"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setBusinessStatusForm({ business_status: 'cancelled', admin_notes: '' });
                                  setShowBusinessStatusDialog(true);
                                }}
                              >
                                Cancel Appointment
                              </DropdownMenuItem>
                            )}

                            {canStatusUpdate && (
                              <>
                                <DropdownMenuItem
                                  className="text-green-700 focus:text-green-700"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setBusinessStatusForm({ business_status: 'completed', admin_notes: '' });
                                    setShowBusinessStatusDialog(true);
                                  }}
                                >
                                  Mark as Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-orange-700 focus:text-orange-700"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setBusinessStatusForm({ business_status: 'no_show', admin_notes: '' });
                                    setShowBusinessStatusDialog(true);
                                  }}
                                >
                                  Mark as No Show
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          open={isPatientProfileOpen}
          onOpenChange={(open) => {
            setIsPatientProfileOpen(open);
            if (!open) {
              setSelectedPatientProfile(null);
              setPatientProfileError(null);
            }
          }}
        >
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 overflow-hidden [&>button]:hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Patient Profile</DialogTitle>
            </DialogHeader>

            {loadingPatientProfile ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading patient profile...</p>
              </div>
            ) : patientProfileError ? (
              <div className="p-6">
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                  {patientProfileError}
                </div>
              </div>
            ) : selectedPatientProfile ? (
              <>
                <div className="bg-gradient-to-r from-brand to-brand-600 p-6 text-white relative">
                  <button
                    type="button"
                    onClick={() => setIsPatientProfileOpen(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Close patient profile"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-4 pr-10">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {selectedPatientProfile.first_name} {selectedPatientProfile.last_name}
                      </h3>
                      <p className="text-white/85 text-sm">Patient since {formatDate(selectedPatientProfile.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[65vh]">
                  {(() => {
                    let details: { age?: string; height?: string; weight?: string; reasonForConsult?: string; healthGoals?: string[] } = {};
                    try {
                      if (selectedPatientProfile.medical_conditions) {
                        details = JSON.parse(selectedPatientProfile.medical_conditions);
                      }
                    } catch {
                      details = {};
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {details.age && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <User className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Age</p>
                              <p className="font-medium text-sm">{details.age} years old</p>
                            </div>
                          </div>
                        )}
                        {details.height && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Activity className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Height</p>
                              <p className="font-medium text-sm">{details.height} cm</p>
                            </div>
                          </div>
                        )}
                        {details.weight && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Activity className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Weight</p>
                              <p className="font-medium text-sm">{details.weight} kg</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="font-medium text-sm">{selectedPatientProfile.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="font-medium text-sm">{selectedPatientProfile.phone_number || 'Not provided'}</p>
                          </div>
                        </div>
                        {selectedPatientProfile.address && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl sm:col-span-2">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Address</p>
                              <p className="font-medium text-sm">{selectedPatientProfile.address}</p>
                            </div>
                          </div>
                        )}
                        {details.reasonForConsult && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl sm:col-span-2">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Reason for Consultation</p>
                              <p className="font-medium text-sm">{details.reasonForConsult}</p>
                            </div>
                          </div>
                        )}
                        {details.healthGoals && details.healthGoals.length > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl sm:col-span-2">
                            <Target className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Health Goals</p>
                              <p className="font-medium text-sm">{details.healthGoals.join(', ')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <h4 className="font-semibold text-gray-900 mb-3">Booking History</h4>
                  {selectedPatientProfile.bookings?.length ? (
                    <div className="space-y-2">
                      {selectedPatientProfile.bookings.map((profileBooking) => {
                        const statusInfo = getPatientBookingStatusInfo(profileBooking);
                        return (
                          <div key={profileBooking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="font-medium text-sm">{profileBooking.service_name}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(profileBooking.booking_date)} at {formatTime(profileBooking.booking_time)}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                              <p className="text-xs text-gray-500 mt-1">{formatPrice(profileBooking.amount_paid)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No booking history</p>
                  )}
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {selectedBooking.service_name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusColors[selectedBooking.status]}>
                      {selectedBooking.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        selectedBooking.appointment_type === 'online'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-green-500 text-green-600'
                      }
                    >
                      {selectedBooking.appointment_type === 'online' ? (
                        <Video className="h-3 w-3 mr-1" />
                      ) : (
                        <MapPin className="h-3 w-3 mr-1" />
                      )}
                      {selectedBooking.appointment_type === 'online'
                        ? 'Online'
                        : 'In-Person'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-5 w-5 text-[#2c4d5c]" />
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="font-medium">
                        {formatDate(selectedBooking.slot_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-5 w-5 text-[#2c4d5c]" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="font-medium">
                        {formatTime(selectedBooking.slot_time)} - {formatTime(calculateEndTime(selectedBooking.slot_time, selectedBooking.duration_minutes || 30))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reschedule Information */}
                {(selectedBooking.reschedule_count ?? 0) > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="bg-orange-100 rounded-full p-1">
                        <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900">
                          This appointment has been rescheduled {selectedBooking.reschedule_count} time(s)
                        </p>
                        {selectedBooking.original_booking_date && selectedBooking.original_booking_time && (
                          <p className="text-xs text-orange-700 mt-1">
                            Originally scheduled: {formatDate(selectedBooking.original_booking_date)} at {formatTime(selectedBooking.original_booking_time)}
                          </p>
                        )}
                        {selectedBooking.rescheduled_at && (
                          <p className="text-xs text-orange-600 mt-1">
                            Last rescheduled: {new Date(selectedBooking.rescheduled_at).toLocaleString()} by {selectedBooking.rescheduled_by || 'unknown'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">
                    Patient Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{selectedBooking.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedBooking.patient_email}</span>
                    </div>
                    {selectedBooking.patient_phone && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedBooking.patient_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBooking.appointment_type === 'online' &&
                  selectedBooking.video_call_link && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-3">
                        Video Call Link
                      </h4>
                      <a
                        href={selectedBooking.video_call_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full bg-blue-50 hover:bg-blue-100 rounded-lg p-3 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500 rounded-full p-2">
                            <Video className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-blue-700">
                              Join Google Meet
                            </p>
                            <p className="text-xs text-blue-500 truncate max-w-[200px]">
                              {selectedBooking.video_call_link}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
                      </a>
                    </div>
                  )}

                {selectedBooking.notes && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      Patient Notes
                    </h4>
                    <p className="text-gray-700 text-sm">{selectedBooking.notes}</p>
                  </div>
                )}

                {selectedBooking.admin_notes && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">
                      Admin Notes
                    </h4>
                    <p className="text-gray-700 text-sm">{selectedBooking.admin_notes}</p>
                  </div>
                )}

                {/* Business Status Management */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">
                    Appointment Status
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={businessStatusColors[selectedBooking.business_status]}>
                      Business: {selectedBooking.business_status}
                    </Badge>
                    {selectedBooking.business_status === 'scheduled' && selectedBooking.time_status && (
                      <Badge className={timeStatusColors[selectedBooking.time_status]}>
                        Time: {selectedBooking.time_status.replace('_', ' ')}
                      </Badge>
                    )}
                    <Badge className={statusColors[selectedBooking.status]}>
                      Payment: {selectedBooking.status}
                    </Badge>
                  </div>
                  
                  {selectedBooking.completed_at && (
                    <p className="text-xs text-gray-500 mb-3">
                      Completed on {formatDate(selectedBooking.completed_at)} 
                      {selectedBooking.completed_by_name && ` by ${selectedBooking.completed_by_name}`}
                    </p>
                  )}

                  {selectedBooking.business_status === 'cancelled' && getCancelledByLabel(selectedBooking) && (
                    <p className="text-xs text-red-600 mb-3">
                      {getCancelledByLabel(selectedBooking)}
                      {selectedBooking.cancelled_at ? ` on ${formatDate(selectedBooking.cancelled_at)}` : ''}
                    </p>
                  )}

                  {/* Only show action buttons if appointment has ended AND status is not completed/cancelled */}
                  {selectedBooking.business_status !== 'completed' && 
                   selectedBooking.business_status !== 'cancelled' && 
                   hasAppointmentEnded(selectedBooking.slot_date, selectedBooking.slot_time, selectedBooking.duration_minutes) && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleBusinessStatusClick('completed')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Completed
                      </Button>
                      <Button
                        onClick={() => handleBusinessStatusClick('no_show')}
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        No Show
                      </Button>
                    </div>
                  )}
                  
                  {/* Show message if appointment hasn't ended yet */}
                  {selectedBooking.business_status !== 'completed' && 
                   selectedBooking.business_status !== 'cancelled' && 
                   !hasAppointmentEnded(selectedBooking.slot_date, selectedBooking.slot_time, selectedBooking.duration_minutes) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700">
                        ⏰ Status actions will be available after the appointment ends
                      </p>
                    </div>
                  )}
                </div>

                {/* Reschedule button - only for pending/confirmed bookings */}
                {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                  <div className="border-t pt-4">
                    <Button
                      onClick={handleRescheduleClick}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <CalendarClock className="w-4 h-4 mr-2" />
                      Reschedule Appointment
                    </Button>
                  </div>
                )}

                <div className="border-t pt-4 text-xs text-gray-400">
                  <p>Booking ID: #{selectedBooking.id}</p>
                  <p>Created: {formatDate(selectedBooking.created_at)}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Service:</strong> {selectedBooking.service_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Patient:</strong> {selectedBooking.patient_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Current:</strong> {formatDate(selectedBooking.slot_date)} at {formatTime(selectedBooking.slot_time)}
                  </p>
                </div>

                {rescheduleError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
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
                        setRescheduleForm(prev => ({ ...prev, new_date: e.target.value, new_time: '' }));
                        fetchAvailableSlots(e.target.value);
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
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          ⚠️ No available time slots for this date. Please select a different date.
                        </p>
                      </div>
                    ) : (
                      <Input
                        type="time"
                        value={rescheduleForm.new_time}
                        onChange={(e) => setRescheduleForm(prev => ({ ...prev, new_time: e.target.value }))}
                        className="w-full"
                        disabled={!rescheduleForm.new_date}
                        placeholder="Select a date first"
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
                      placeholder="Reason for rescheduling"
                      rows={3}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRescheduleDialog(false);
                      setRescheduleError(null);
                      setIsModalOpen(true); // Reopen booking details
                    }}
                    disabled={rescheduling}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRescheduleSubmit}
                    disabled={rescheduling || !rescheduleForm.new_date || !rescheduleForm.new_time}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {rescheduling ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                    <span className="hidden sm:inline">Download Receipt</span>
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

        {/* Business Status Update Dialog */}
        <Dialog open={showBusinessStatusDialog} onOpenChange={setShowBusinessStatusDialog}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Update Appointment Status</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Service:</strong> {selectedBooking.service_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Patient:</strong> {selectedBooking.patient_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Date:</strong> {formatDate(selectedBooking.slot_date)} at {formatTime(selectedBooking.slot_time)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      New Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        className={`text-base py-2 px-4 cursor-pointer ${
                          businessStatusForm.business_status === 'completed' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-100 text-green-800'
                        }`}
                        onClick={() => setBusinessStatusForm(prev => ({ ...prev, business_status: 'completed' }))}
                      >
                        Completed
                      </Badge>
                      <Badge 
                        className={`text-base py-2 px-4 cursor-pointer ${
                          businessStatusForm.business_status === 'no_show' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-orange-100 text-orange-800'
                        }`}
                        onClick={() => setBusinessStatusForm(prev => ({ ...prev, business_status: 'no_show' }))}
                      >
                        No Show
                      </Badge>
                      <Badge 
                        className={`text-base py-2 px-4 cursor-pointer ${
                          businessStatusForm.business_status === 'cancelled' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-red-100 text-red-800'
                        }`}
                        onClick={() => setBusinessStatusForm(prev => ({ ...prev, business_status: 'cancelled' }))}
                      >
                        Cancelled
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-1">
                      Notes (Optional)
                    </label>
                    <Textarea
                      value={businessStatusForm.admin_notes}
                      onChange={(e) => setBusinessStatusForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                      placeholder="Add notes about this status change (e.g., completion notes, cancellation reason, no-show details)"
                      rows={3}
                      className="w-full"
                    />
                  </div>

                  {businessStatusForm.business_status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">
                        ✓ This will mark the appointment as successfully completed
                      </p>
                    </div>
                  )}

                  {businessStatusForm.business_status === 'no_show' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-700">
                        ⚠️ This will mark that the patient did not show up for their appointment
                      </p>
                    </div>
                  )}

                  {businessStatusForm.business_status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">
                        ✗ This will mark the appointment as cancelled
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBusinessStatusDialog(false);
                      setIsModalOpen(true); // Reopen booking details
                    }}
                    disabled={updatingBusinessStatus}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBusinessStatusSubmit}
                    disabled={updatingBusinessStatus || !businessStatusForm.business_status}
                    className={`flex-1 ${
                      businessStatusForm.business_status === 'completed' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : businessStatusForm.business_status === 'no_show'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {updatingBusinessStatus ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Update
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
