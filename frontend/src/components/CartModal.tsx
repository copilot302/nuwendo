import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShoppingCart, Plus, Minus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { cartService, Cart as CartType } from '@/services/cartService'

interface CartModalProps {
  open: boolean
  onClose: () => void
  onCartUpdate?: () => void
}

export default function CartModal({ open, onClose, onCartUpdate }: CartModalProps) {
  const [cart, setCart] = useState<CartType | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<number | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadCart()
    }
  }, [open])

  const loadCart = async () => {
    try {
      setLoading(true)
      setError(null)
      const cartData = await cartService.getCart()
      setCart(cartData)
    } catch (err: any) {
      setError(err.message || 'Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return
    try {
      setUpdating(itemId)
      await cartService.updateQuantity(itemId, newQuantity)
      await loadCart()
      onCartUpdate?.()
    } catch (err: any) {
      setError(err.message || 'Failed to update quantity')
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    try {
      setUpdating(itemId)
      await cartService.removeItem(itemId)
      await loadCart()
      onCartUpdate?.()
    } catch (err: any) {
      setError(err.message || 'Failed to remove item')
    } finally {
      setUpdating(null)
    }
  }

  const handleCheckout = async () => {
    try {
      setCheckingOut(true)
      setError(null)
      await cartService.checkout(checkoutNotes)
      setSuccessMessage('Order placed successfully! Our team will contact you soon.')
      setShowCheckout(false)
      setCheckoutNotes('')
      await loadCart()
      onCartUpdate?.()
      setTimeout(() => {
        setSuccessMessage(null)
        onClose()
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to process checkout')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping Cart
            {cart && cart.itemCount > 0 && (
              <span className="text-sm text-gray-500">({cart.itemCount} items)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <p className="text-sm text-green-700">{successMessage}</p>
          </motion.div>
        )}

        {!showCheckout ? (
          <>
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
                <Button onClick={onClose} className="mt-4" variant="outline">
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {cart.items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex gap-4">
                          {item.item.image_url && (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={item.item.image_url}
                                alt={item.item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.item.name}</h4>
                            {item.variant && (
                              <p className="text-sm text-gray-600">
                                {item.variant.name} - ₱{item.variant.price.toLocaleString()}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center border rounded-lg">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  disabled={updating === item.id || item.quantity <= 1}
                                  className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 text-sm font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  disabled={updating === item.id}
                                  className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={updating === item.id}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              ₱{item.subtotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-brand">₱{cart.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={onClose} variant="outline" className="flex-1">
                    Continue Shopping
                  </Button>
                  <Button
                    onClick={() => setShowCheckout(true)}
                    className="flex-1 bg-brand hover:bg-brand/90"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="border-t border-b py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items ({cart?.itemCount}):</span>
                  <span className="font-medium">₱{cart?.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-brand">₱{cart?.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Our team will contact you to confirm your order and arrange payment and delivery.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowCheckout(false)}
                variant="outline"
                className="flex-1"
                disabled={checkingOut}
              >
                Back to Cart
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-brand hover:bg-brand/90"
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
