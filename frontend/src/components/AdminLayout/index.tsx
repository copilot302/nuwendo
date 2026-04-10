import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  Settings, 
  Users, 
  FileText, 
  LogOut, 
  Menu,
  X,
  Home,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  Wrench,
  Building2
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from '@/config/api'

interface AdminLayoutProps {
  children: React.ReactNode
  adminUser?: {
    full_name: string
    role: string
  } | null
}

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { path: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { path: '/admin/payments', label: 'Payments', icon: CreditCard },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
]

const operationsItems = [
  { path: '/admin/schedule', label: 'Schedule', icon: Clock },
  { path: '/admin/services', label: 'Services', icon: Settings },
  { path: '/admin/shop', label: 'Shop', icon: ShoppingBag },
]

const managementItems = [
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/audit-logs', label: 'Logs', icon: FileText },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOperationsOpen, setMobileOperationsOpen] = useState(false)
  const [mobileManagementOpen, setMobileManagementOpen] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(() => {
    const cached = localStorage.getItem('adminPendingApprovalsCount')
    const parsed = Number(cached)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  })

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const token = localStorage.getItem('adminToken')
        if (!token) {
          setPendingApprovalsCount(0)
          return
        }

        const [pendingBookingsRes, pendingOrdersRes] = await Promise.all([
          fetch(`${API_URL}/admin/pending-payments`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/admin/orders?status=pending&payment_verified=false&limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])

        let pendingBookingCount = 0
        let pendingOrderCount = 0

        if (pendingBookingsRes.ok) {
          const bookingData = await pendingBookingsRes.json()
          pendingBookingCount = Array.isArray(bookingData.bookings) ? bookingData.bookings.length : 0
        }

        if (pendingOrdersRes.ok) {
          const orderData = await pendingOrdersRes.json()
          pendingOrderCount = Number(orderData?.pagination?.total_records || 0)
        }

        const totalPending = pendingBookingCount + pendingOrderCount
        setPendingApprovalsCount(totalPending)
        localStorage.setItem('adminPendingApprovalsCount', String(totalPending))
      } catch {
        // Keep prior count on transient failures
      }
    }

    fetchPendingApprovals()
    const intervalId = setInterval(fetchPendingApprovals, 30000)
    return () => clearInterval(intervalId)
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (token) {
        await fetch(`${API_URL}/admin/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
    } catch {
      // Continue with logout even if API call fails
    }
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/admin/orders') {
      return location.pathname === '/admin/orders' || location.pathname.startsWith('/admin/orders/')
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const isGroupActive = (items: { path: string }[]) => {
    return items.some((item) => isActive(item.path))
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <img 
                src="/NUWENDO.svg" 
                alt="Nuwendo" 
                className="h-10 cursor-pointer" 
                onClick={() => navigate('/admin/dashboard')}
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`${
                    isActive(item.path)
                      ? 'bg-brand-50 text-brand border-b-2 border-brand rounded-b-none'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.path === '/admin/payments' && (
                    <span
                      className={`ml-2 inline-flex min-w-5 h-5 px-1 rounded-full text-[10px] leading-5 font-semibold text-center justify-center transition-opacity ${
                        pendingApprovalsCount > 0
                          ? 'bg-red-500 text-white opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      {pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount}
                    </span>
                  )}
                </Button>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${
                      isGroupActive(operationsItems)
                        ? 'bg-brand-50 text-brand border-b-2 border-brand rounded-b-none'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Operations
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {operationsItems.map((item) => (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${
                      isGroupActive(managementItems)
                        ? 'bg-brand-50 text-brand border-b-2 border-brand rounded-b-none'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Management
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {managementItems.map((item) => (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white py-2 px-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigate(item.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`justify-start ${
                    isActive(item.path)
                      ? 'bg-brand-50 text-brand'
                      : 'text-gray-600'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                  {item.path === '/admin/payments' && (
                    <span
                      className={`ml-2 inline-flex min-w-5 h-5 px-1 rounded-full text-[10px] leading-5 font-semibold text-center justify-center transition-opacity ${
                        pendingApprovalsCount > 0
                          ? 'bg-red-500 text-white opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      {pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount}
                    </span>
                  )}
                </Button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileOperationsOpen((v) => !v)}
                className={`justify-between ${isGroupActive(operationsItems) ? 'bg-brand-50 text-brand' : 'text-gray-600'}`}
              >
                <span className="flex items-center">
                  <Wrench className="h-4 w-4 mr-3" />
                  Operations
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileOperationsOpen ? 'rotate-180' : ''}`} />
              </Button>
              {mobileOperationsOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  {operationsItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigate(item.path)
                        setMobileMenuOpen(false)
                      }}
                      className={`justify-start ${isActive(item.path) ? 'bg-brand-50 text-brand' : 'text-gray-600'}`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileManagementOpen((v) => !v)}
                className={`justify-between ${isGroupActive(managementItems) ? 'bg-brand-50 text-brand' : 'text-gray-600'}`}
              >
                <span className="flex items-center">
                  <Building2 className="h-4 w-4 mr-3" />
                  Management
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileManagementOpen ? 'rotate-180' : ''}`} />
              </Button>
              {mobileManagementOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  {managementItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigate(item.path)
                        setMobileMenuOpen(false)
                      }}
                      className={`justify-start ${isActive(item.path) ? 'bg-brand-50 text-brand' : 'text-gray-600'}`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

    </div>
  )
}

export default AdminLayout
