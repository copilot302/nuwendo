import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Video,
  MapPin,
  Bell,
  Activity,
  CreditCard,
} from 'lucide-react';
import { API_URL } from '@/config/api';

interface Booking {
  id: number;
  booking_date: string;
  booking_time: string;
  status: string;
  amount_paid: number;
  payment_status?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  service_name: string;
}

interface DashboardStats {
  totalBookings: number;
  todayAppointments: number;
  thisWeekAppointments: number;
  monthlyRevenue: number;
  pendingBookingApprovalsCount?: number;
  pendingShopApprovalsCount?: number;
  pendingApprovalsCount?: number;
  recentBookings: Booking[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const authRetryAttemptedRef = useRef(false);

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/auth/dashboard/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // If unauthorized, retry once to avoid false logout on transient startup races
        if (response.status === 401) {
          if (!authRetryAttemptedRef.current) {
            authRetryAttemptedRef.current = true;
            setTimeout(fetchStats, 250);
            return;
          }

          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          navigate('/login');
          return;
        }

        // Reset retry flag on successful auth
        authRetryAttemptedRef.current = false;
        
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

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
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const todaysBookings = stats?.recentBookings.filter(
    (b) => b.booking_date === new Date().toISOString().split('T')[0]
  ) || [];

  const pendingApprovalsCount = stats?.pendingApprovalsCount ?? 0;
  const pendingBookingApprovalsCount = stats?.pendingBookingApprovalsCount ?? 0;
  const pendingShopApprovalsCount = stats?.pendingShopApprovalsCount ?? 0;
  const confirmedToday = todaysBookings.filter((b) => b.status === 'confirmed').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <AlertCircle className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
            <Button onClick={() => navigate('/admin/bookings')} size="sm" className="w-full bg-[#2c4d5c] hover:bg-[#234050]">
              <Calendar className="h-4 w-4 mr-2" />
              View All Bookings
            </Button>
            <Button onClick={() => navigate('/admin/schedule')} variant="outline" size="sm" className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              Manage Schedule
            </Button>
          </div>
        </div>

        {/* Urgent Alerts Section */}
        <div className="space-y-3">
          {/* Pending approvals (bookings + shop orders) */}
          {pendingApprovalsCount > 0 && (
            <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900">
                      {pendingApprovalsCount} Pending {pendingApprovalsCount === 1 ? 'Approval' : 'Approvals'}
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Action required: Review bookings ({pendingBookingApprovalsCount}) and shop orders ({pendingShopApprovalsCount})
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/admin/payments')} 
                    variant="outline" 
                    size="sm" 
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                  >
                    Review Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium text-gray-500">Total Bookings</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {loading ? '--' : stats?.totalBookings ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">All time bookings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium text-gray-500">Today's Appointments</CardTitle>
              <Calendar className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                {loading ? '--' : stats?.todayAppointments ?? 0}
              </div>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {confirmedToday} confirmed
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium text-gray-500">This Week</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {loading ? '--' : stats?.thisWeekAppointments ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Weekly appointments</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium text-gray-500">Monthly Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 break-words">
                {loading ? '--' : currencyFormatter.format(stats?.monthlyRevenue ?? 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Current month</p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle>Today's Schedule</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {todaysBookings.length} {todaysBookings.length === 1 ? 'appointment' : 'appointments'} scheduled
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="self-start sm:self-auto px-0 sm:px-3">
                <Link to="/admin/bookings">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading schedule...</div>
              ) : todaysBookings.length > 0 ? (
                <div className="space-y-3">
                  {todaysBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-[#2c4d5c] hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate('/admin/bookings')}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-50 rounded-lg">
                          <Clock className="h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">
                            {formatTime(booking.booking_time)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{booking.service_name}</p>
                          <p className="text-sm text-gray-500">
                            {booking.first_name} {booking.last_name}
                          </p>
                          <p className="text-xs text-gray-400 break-all">{booking.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 sm:pl-[68px]">
                        <Badge className={`${getStatusColor(booking.status)} flex items-center gap-1`}>
                          {getStatusIcon(booking.status)}
                          {booking.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No appointments today</h3>
                  <p className="text-gray-500 text-sm mt-1">Your schedule is clear for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Stats - Takes 1 column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => navigate('/admin/bookings')} 
                  variant="outline" 
                  className="w-full justify-start"
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Bookings
                </Button>
                <Button 
                  onClick={() => navigate('/admin/payments')} 
                  variant="outline" 
                  className="w-full justify-start"
                  size="sm"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Review Payments
                </Button>
                <Button 
                  onClick={() => navigate('/admin/services')} 
                  variant="outline" 
                  className="w-full justify-start"
                  size="sm"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Manage Services
                </Button>
                <Button 
                  onClick={() => navigate('/admin/schedule')} 
                  variant="outline" 
                  className="w-full justify-start"
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Set Availability
                </Button>
              </CardContent>
            </Card>

            {/* Appointment Types Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Booking Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Online</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {stats?.recentBookings.filter((b) => b.service_name.toLowerCase().includes('online')).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">In-Person</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {(stats?.recentBookings.length || 0) - (stats?.recentBookings.filter((b) => b.service_name.toLowerCase().includes('online')).length || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Latest booking activity</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="self-start sm:self-auto px-0 sm:px-3">
              <Link to="/admin/bookings">See All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading bookings...</div>
            ) : stats?.recentBookings?.length ? (
              <div className="space-y-3">
                {stats.recentBookings.slice(0, 6).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-100 rounded-lg hover:border-[#2c4d5c] hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => navigate('/admin/bookings')}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{booking.service_name}</p>
                      <p className="text-sm text-gray-500">
                        {booking.first_name} {booking.last_name}
                      </p>
                      <p className="text-xs text-gray-400 break-all">{booking.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(booking.booking_date)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(booking.booking_time)}
                      </div>
                      <Badge className={`${getStatusColor(booking.status)} flex items-center gap-1`}>
                        {getStatusIcon(booking.status)}
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No bookings yet</h3>
                <p className="text-gray-500 text-sm mt-1">Bookings will appear here once patients start booking</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
