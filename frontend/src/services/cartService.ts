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
  const token = sessionStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await fetch(`${BASE_URL}/api/cart`, {
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.cart
  },

  async addToCart(shopItemId: number, variantId: number | null, quantity: number = 1): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/cart/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        shop_item_id: shopItemId,
        variant_id: variantId,
        quantity
      })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async updateQuantity(cartItemId: number, quantity: number): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/cart/${cartItemId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async removeItem(cartItemId: number): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async clearCart(): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/cart`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
  },

  async checkout(notes?: string, paymentReceiptUrl?: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/cart/checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        notes,
        payment_receipt_url: paymentReceiptUrl
      })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.order
  }
}
