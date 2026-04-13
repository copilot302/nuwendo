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
  Save,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Package,
  Users,
  X,
  ClipboardList
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminLayout } from '@/components/AdminLayout'
import { API_URL } from '@/config/api'

interface ShopVariant {
  id?: number
  name: string
  price: string | number
  is_active: boolean
}

interface ShopItem {
  id: number
  name: string
  description: string
  price: string
  category: string
  image_url: string
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_name: string | null
  variants: ShopVariant[]
}

interface Patient {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  has_shop_access: boolean
  granted_at: string | null
  granted_by_name: string | null
  notes: string | null
}

export function AdminShop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<ShopItem[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showItemForm, setShowItemForm] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    image_url: '',
    stock_quantity: 0,
    is_active: true
  })
  const [variants, setVariants] = useState<ShopVariant[]>([
    { name: '', price: '', is_active: true }
  ])

  const defaultCategories = ['Peptides', 'Supplements', 'Equipment']
  const existingCategories = Array.from(new Set(items.map(s => s.category).filter(Boolean)))
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories])).sort()

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/login')
      return
    }
    fetchData()
  }, [navigate])

  useEffect(() => {
    if (searchParams.get('view') === 'access') {
      setShowAccessModal(true)
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('view')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchItems(), fetchPatients()])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/shop`, {
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
        throw new Error(data.message || 'Failed to fetch items')
      }

      setItems(data.items)
    } catch (err: any) {
      setError(err.message || 'Failed to load shop items')
    }
  }

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/shop/access/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch patients')
      }

      setPatients(data.patients)
    } catch (err: any) {
      console.error('Error fetching patients:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('adminToken')
      const url = editingItem 
        ? `${API_URL}/admin/shop/${editingItem.id}`
        : `${API_URL}/admin/shop`
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, variants })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to save item')

      await fetchItems()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to save item')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/shop/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete item')
      }

      await fetchItems()
    } catch (err: any) {
      setError(err.message || 'Failed to delete item')
    }
  }

  const handleToggleActive = async (item: ShopItem) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/shop/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...item,
          is_active: !item.is_active
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update item')
      }

      await fetchItems()
    } catch (err: any) {
      setError(err.message || 'Failed to update item')
    }
  }

  const handleToggleAccess = async (userId: number, currentAccess: boolean) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${API_URL}/admin/shop/access/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          has_access: !currentAccess,
          notes: ''
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update access')
      }

      await fetchPatients()
    } catch (err: any) {
      setError(err.message || 'Failed to update access')
    }
  }

  const resetForm = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      image_url: '',
      stock_quantity: 0,
      is_active: true
    })
    setVariants([{ name: '', price: '', is_active: true }])
    setShowItemForm(false)
    setShowCustomCategory(false)
    setCustomCategory('')
  }

  const openAddItemForm = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      image_url: '',
      stock_quantity: 0,
      is_active: true
    })
    setVariants([{ name: '', price: '', is_active: true }])
    setShowCustomCategory(false)
    setCustomCategory('')
    setShowItemForm(true)
  }

  const handleItemFormOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
      return
    }

    setShowItemForm(true)
  }

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      image_url: item.image_url,
      stock_quantity: item.stock_quantity,
      is_active: item.is_active
    })
    setVariants(
      item.variants && item.variants.length > 0
        ? item.variants.map(v => ({ name: v.name, price: v.price, is_active: v.is_active }))
        : [{ name: '', price: '', is_active: true }]
    )
    setShowItemForm(true)
  }

  const addVariant = () => {
    setVariants([...variants, { name: '', price: '', is_active: true }])
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, field: keyof ShopVariant, value: string | number | boolean) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], [field]: value }
    setVariants(updated)
  }

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory)

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Shop Management</h1>
              <p className="text-sm sm:text-base text-gray-500">Manage shop items and patient access</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
            <Button 
              onClick={() => navigate('/admin/orders')} 
              variant="outline"
              className="w-full"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              View Orders
            </Button>
            <Button 
              onClick={() => setShowAccessModal(true)} 
              variant="outline"
              className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Access
            </Button>
            <Button onClick={openAddItemForm} disabled={showItemForm} className="w-full bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Item Form Modal */}
  <Dialog open={showItemForm} onOpenChange={handleItemFormOpenChange}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the shop item details' : 'Add a new item to the shop'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., BPC-157 Peptide"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Item description..."
                />
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <Label>Variants (e.g. 50mg, 30mg, Per Shot) *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="h-3 w-3 mr-1" /> Add Variant
                  </Button>
                </div>
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Input
                        placeholder="Name (e.g. 50mg)"
                        value={v.name}
                        onChange={e => updateVariant(i, 'name', e.target.value)}
                        required
                        className="flex-1"
                      />
                      <Input
                        placeholder="Price (PHP)"
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={e => updateVariant(i, 'price', e.target.value)}
                        required
                        className="w-full sm:w-36"
                      />
                      {variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(i)} className="self-end sm:self-center text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                {!showCustomCategory ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setShowCustomCategory(true)
                          setFormData({ ...formData, category: '' })
                        } else {
                          setFormData({ ...formData, category: e.target.value })
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      required
                    >
                      <option value="">Select category...</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="custom">+ Add new category</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={customCategory}
                      onChange={(e) => {
                        setCustomCategory(e.target.value)
                        setFormData({ ...formData, category: e.target.value })
                      }}
                      placeholder="Enter new category..."
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCustomCategory(false)
                        setCustomCategory('')
                        setFormData({ ...formData, category: '' })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active" className="!mb-0">Active (available for purchase)</Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-brand hover:bg-brand/90">
                  <Save className="h-4 w-4 mr-2" />
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Patient Access Modal */}
        <Dialog open={showAccessModal} onOpenChange={setShowAccessModal}>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Patient Shop Access</DialogTitle>
              <DialogDescription>
                Control which patients can access the shop
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              {patients.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No patients found</p>
              ) : (
                patients.map(patient => (
                  <div key={patient.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                      <p className="text-sm text-gray-500 break-all">{patient.email}</p>
                      {patient.has_shop_access && patient.granted_at && (
                        <p className="text-xs text-green-600 mt-1">
                          Access granted on {new Date(patient.granted_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={patient.has_shop_access ? 'destructive' : 'default'}
                      onClick={() => handleToggleAccess(patient.id, patient.has_shop_access)}
                      className={`w-full sm:w-auto ${!patient.has_shop_access ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      {patient.has_shop_access ? 'Revoke Access' : 'Grant Access'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-nowrap sm:flex-wrap overflow-x-auto pb-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap ${selectedCategory === 'all' ? 'bg-brand hover:bg-brand/90' : ''}`}
            >
              All Items ({items.length})
            </Button>
            {allCategories.map(category => {
              const count = items.filter(item => item.category === category).length
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap ${selectedCategory === category ? 'bg-brand hover:bg-brand/90' : ''}`}
                >
                  {category} ({count})
                </Button>
              )
            })}
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No items found</p>
            <Button 
              onClick={openAddItemForm} 
              variant="outline" 
              className="mt-4"
            >
              Add your first item
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className={`overflow-hidden ${!item.is_active && 'opacity-60'}`}>
                <CardContent className="p-0">
                  {item.image_url && (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <Badge variant="outline" className="mt-1">{item.category}</Badge>
                      </div>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {item.is_active ? (
                          <ToggleRight className="h-6 w-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Variants */}
                    {item.variants && item.variants.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {item.variants.map((v, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-600">{v.name}</span>
                            <span className="font-medium text-gray-900">₱{parseFloat(String(v.price)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
