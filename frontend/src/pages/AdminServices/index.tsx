import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
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
  DollarSign, 
  Clock, 
  Save,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Monitor
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/AdminLayout'

import { API_URL } from '@/config/api'

interface Service {
  id: number
  name: string
  description: string
  duration_minutes: number
  price: string
  category: string
  availability_type: 'online' | 'on-site' | 'both'
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_name: string | null
  updated_by_name: string | null
}

export function AdminServices() {
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: '',
    category: '',
    is_active: true
  })

  const defaultCategories = ['Services']
  
  // Get unique categories from existing services
  const existingCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)))
  
  // Combine default and existing categories
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories])).sort()

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/login')
      return
    }
    fetchServices()
  }, [navigate])

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/services`, {
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
        throw new Error(data.message || 'Failed to fetch services')
      }

      setServices(data.services)
    } catch (err: any) {
      setError(err.message || 'Failed to load services')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('adminToken')
      const url = editingService 
        ? `${API_URL}/admin/services/${editingService.id}`
        : `${API_URL}/admin/services`
      
      const method = editingService ? 'PUT' : 'POST'

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
        throw new Error(data.message || 'Failed to save service')
      }

      await fetchServices()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to save service')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/services/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete service')
      }

      await fetchServices()
    } catch (err: any) {
      setError(err.message || 'Failed to delete service')
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...service,
          is_active: !service.is_active
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update service')
      }

      await fetchServices()
    } catch (err: any) {
      setError(err.message || 'Failed to update service')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      price: '',
      category: '',
      is_active: true
    })
    setShowCustomCategory(false)
    setCustomCategory('')
    setEditingService(null)
    setShowForm(false)
  }

  const startEdit = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category,
      is_active: service.is_active
    })
    setEditingService(service)
    setShowForm(true)
  }

  const openCreateForm = () => {
    setEditingService(null)
    setShowCustomCategory(false)
    setCustomCategory('')
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      price: '',
      category: '',
      is_active: true
    })
    setShowForm(true)
  }

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(parseFloat(price))
  }

  // Filter services by category
  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory)

  // Get unique categories from services
  const activeCategories = Array.from(new Set(services.map(s => s.category))).sort()

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Services</h1>
            <p className="text-sm sm:text-base text-gray-500">Create and manage healthcare services</p>
          </div>
          <Button onClick={openCreateForm} disabled={showForm} className="w-full sm:w-auto bg-brand hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
        {error && (
          <div className="p-4 mb-6 text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Service Form Modal */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              <DialogDescription>
                {editingService ? 'Update service information' : 'Create a new healthcare service'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g. General Consultation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={formData.category === '__custom__' || !allCategories.includes(formData.category) && formData.category ? '__custom__' : formData.category}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setShowCustomCategory(true)
                        setFormData({...formData, category: ''})
                      } else {
                        setShowCustomCategory(false)
                        setCustomCategory('')
                        setFormData({...formData, category: e.target.value})
                      }
                    }}
                    required={!showCustomCategory}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {allCategories.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Add New Category</option>
                  </select>
                </div>

                {showCustomCategory && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="customCategory">New Category Name *</Label>
                    <Input
                      id="customCategory"
                      type="text"
                      value={customCategory}
                      onChange={(e) => {
                        setCustomCategory(e.target.value)
                        setFormData({...formData, category: e.target.value})
                      }}
                      required
                      placeholder="Enter new category name"
                    />
                    <p className="text-sm text-gray-500">This will create a new category</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <select
                    id="duration"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                    required
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (PHP) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                <Label className="text-sm">Availability</Label>
                <p className="text-sm text-gray-600">All services are available for both Online and On-Site appointments by default.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  placeholder="Describe the service..."
                  rows={3}
                />
              </div>

              {editingService && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_active">Active (available for booking)</Label>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand hover:bg-brand/90">
                  <Save className="h-4 w-4 mr-2" />
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap overflow-x-auto pb-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap"
            >
              All Services ({services.length})
            </Button>
            {activeCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category} ({services.filter(s => s.category === category).length})
              </Button>
            ))}
          </div>
        </div>

        {/* Services List */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <Card key={service.id} className={service.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg mb-1 break-words">{service.name}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {service.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-purple-500 text-purple-600 bg-purple-50">
                        <Monitor className="h-3 w-3 mr-1" />
                        Online & On-Site
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(service)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {service.is_active ? (
                      <ToggleRight className="h-6 w-6 text-brand" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4 break-words">{service.description}</p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{service.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-brand" />
                    <span className="font-semibold text-brand">
                      {formatPrice(service.price)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startEdit(service)}
                    disabled={showForm}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(service.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>

                {service.updated_by_name && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    Last updated by {service.updated_by_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredServices.length === 0 && !showForm && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {selectedCategory === 'all' 
                ? 'No services found' 
                : `No services found in ${selectedCategory} category`}
            </p>
            {selectedCategory !== 'all' && (
              <Button variant="outline" onClick={() => setSelectedCategory('all')} className="mr-2">
                Show All Services
              </Button>
            )}
            <Button onClick={openCreateForm} className="bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />
              Add First Service
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
