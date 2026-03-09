import { BASE_URL } from '@/config/api'

export interface CartItem {
  id: number
  quantity: number
  item: {
    id: number
    name: string
    description: string
    category: string
    image_url?: string
  }
  variant: {
    id: number
    name: string
    price: number
  } | null
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

const getEmail = () => sessionStorage.getItem('patientEmail') || ''

const appendEmail = (url: string) => {
  const email = getEmail()
  if (!email) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}email=${encodeURIComponent(email)}`
}

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await fetch(appendEmail(`${BASE_URL}/api/cart`), {
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.cart
  },

  async addToCart(shopItemId: number, variantId: number | null, quantity: number = 1): Promise<void> {
    const email = getEmail()
    const response = await fetch(appendEmail(`${BASE_URL}/api/cart/add`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        shop_item_id: shopItemId,
        variant_id: variantId,
        quantity,
        email
      })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async updateQuantity(cartItemId: number, quantity: number): Promise<void> {
    const email = getEmail()
    const response = await fetch(appendEmail(`${BASE_URL}/api/cart/${cartItemId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity, email })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async removeItem(cartItemId: number): Promise<void> {
    const response = await fetch(appendEmail(`${BASE_URL}/api/cart/${cartItemId}`), {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async clearCart(): Promise<void> {
    const response = await fetch(appendEmail(`${BASE_URL}/api/cart`), {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async checkout(checkoutData: {
    notes?: string
    payment_receipt_url?: string
    payment_qr_reference?: string
    use_default_address: boolean
    delivery_province?: string
    delivery_city?: string
    delivery_barangay?: string
    delivery_street_address?: string
  }): Promise<any> {
    const email = getEmail()
    const response = await fetch(appendEmail(`${BASE_URL}/api/cart/checkout`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...checkoutData, email })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.order
  },

  async getOrders(): Promise<any[]> {
    const response = await fetch(appendEmail(`${BASE_URL}/api/shop/orders`), {
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.orders
  },

  async markOrderReceived(orderId: number): Promise<void> {
    const response = await fetch(appendEmail(`${BASE_URL}/api/shop/orders/${orderId}/received`), {
      method: 'PATCH',
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  }
}
