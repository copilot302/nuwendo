import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, Search, ChevronLeft, ChevronRight, X,
  Settings, Calendar, Clock, User, Edit, Trash2, Plus, Eye,
  CreditCard, CheckCircle, XCircle, RefreshCw, Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/AdminLayout'

import { API_URL } from '@/config/api'

interface AuditLog {
  id: number
  admin_id: number
  admin_name: string
  admin_email: string
  action: string
  table_name: string
  record_id: number
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

interface Pagination {
  current_page: number
  total_pages: number
  total_records: number
  per_page: number
}

const actionIcons: Record<string, React.ReactNode> = {
  'create': <Plus className="h-4 w-4" />,
  'update': <Edit className="h-4 w-4" />,
  'delete': <Trash2 className="h-4 w-4" />,
  'login': <User className="h-4 w-4" />,
  'logout': <User className="h-4 w-4" />,
  'view': <Eye className="h-4 w-4" />,
  'approve': <CheckCircle className="h-4 w-4" />,
  'reject': <XCircle className="h-4 w-4" />,
  'payment': <CreditCard className="h-4 w-4" />,
}

const actionColors: Record<string, string> = {
  'create': 'bg-green-100 text-green-700',
  'update': 'bg-blue-100 text-blue-700',
  'delete': 'bg-red-100 text-red-700',
  'login': 'bg-purple-100 text-purple-700',
  'logout': 'bg-gray-100 text-gray-700',
  'view': 'bg-gray-100 text-gray-600',
  'approve': 'bg-green-100 text-green-700',
  'reject': 'bg-red-100 text-red-700',
  'payment': 'bg-yellow-100 text-yellow-700',
}

const getActionType = (action: string): string => {
  const lowerAction = action.toLowerCase()
  if (lowerAction.includes('create') || lowerAction.includes('add') || lowerAction.includes('insert')) return 'create'
  if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('modify')) return 'update'
  if (lowerAction.includes('delete') || lowerAction.includes('remove')) return 'delete'
  if (lowerAction.includes('login')) return 'login'
  if (lowerAction.includes('logout')) return 'logout'
  if (lowerAction.includes('approve') || lowerAction.includes('confirm')) return 'approve'
  if (lowerAction.includes('reject') || lowerAction.includes('cancel')) return 'reject'
  if (lowerAction.includes('payment')) return 'payment'
  if (lowerAction.includes('view')) return 'view'
  return 'update'
}

export function AdminAuditLog() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/login')
      return
    }
    fetchLogs()
  }, [navigate])

  const fetchLogs = async (page = 1) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (searchQuery) params.append('action', searchQuery)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`${API_URL}/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login')
          return
        }
        throw new Error(data.message || 'Failed to fetch audit logs')
      }

      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs(1)
  }

  const formatDateTime = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (d: string) => {
    const now = new Date()
    const date = new Date(d)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDateTime(d)
  }

  if (isLoading && logs.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-500">
              {pagination ? `${pagination.total_records} total events` : 'Loading...'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination?.current_page || 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 mb-6 text-red-600 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
          </motion.div>
        )}

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-md">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                  placeholder="From"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                  placeholder="To"
                />
              </div>
              <Button type="submit" className="bg-brand hover:bg-brand-600">Filter</Button>
            </form>
          </CardContent>
        </Card>

        {/* Audit Log Timeline */}
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              Event Log
            </CardTitle>
            <CardDescription>System activity and admin actions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length > 0 ? (
              <div className="divide-y">
                {logs.map((log) => {
                  const actionType = getActionType(log.action)
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className={`p-2 rounded-lg ${actionColors[actionType] || 'bg-gray-100 text-gray-600'}`}>
                        {actionIcons[actionType] || <Settings className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 truncate">{log.action}</p>
                          {log.table_name && (
                            <Badge variant="outline" className="text-xs">
                              {log.table_name}
                            </Badge>
                          )}
                          {log.record_id && (
                            <span className="text-xs text-gray-400">#{log.record_id}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.admin_name || 'System'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(log.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatDateTime(log.created_at)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No audit logs found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-600">
              Showing page {pagination.current_page} of {pagination.total_pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page === 1}
                onClick={() => fetchLogs(pagination.current_page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page === pagination.total_pages}
                onClick={() => fetchLogs(pagination.current_page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-brand to-brand-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">{selectedLog.action}</h2>
                  <p className="text-white/80">
                    {formatDateTime(selectedLog.created_at)} by {selectedLog.admin_name || 'System'}
                  </p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Table</p>
                  <p className="font-medium">{selectedLog.table_name || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Record ID</p>
                  <p className="font-medium">{selectedLog.record_id || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Admin</p>
                  <p className="font-medium">{selectedLog.admin_name || 'System'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-medium">{selectedLog.admin_email || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Previous Values</h3>
                  <pre className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">New Values</h3>
                  <pre className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedLog.old_values && !selectedLog.new_values && (
                <p className="text-gray-500 text-center py-4">No additional details available</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AdminLayout>
  )
}
