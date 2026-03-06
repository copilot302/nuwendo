import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT 
        ci.id,
        ci.quantity,
        ci.created_at,
        si.id as item_id,
        si.name as item_name,
        si.description,
        si.category,
        si.image_url,
        siv.id as variant_id,
        siv.name as variant_name,
        siv.price as variant_price
      FROM cart_items ci
      JOIN shop_items si ON ci.shop_item_id = si.id
      LEFT JOIN shop_item_variants siv ON ci.variant_id = siv.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `, [userId]);

    const cartItems = result.rows.map(item => ({
      id: item.id,
      quantity: item.quantity,
      item: {
        id: item.item_id,
        name: item.item_name,
        description: item.description,
        category: item.category,
        image_url: item.image_url
      },
      variant: item.variant_id ? {
        id: item.variant_id,
        name: item.variant_name,
        price: parseFloat(item.variant_price)
      } : null,
      subtotal: item.quantity * parseFloat(item.variant_price || 0)
    }));

    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    res.json({
      success: true,
      cart: {
        items: cartItems,
        total,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

// Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shop_item_id, variant_id, quantity = 1 } = req.body;

    if (!shop_item_id) {
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    // Check if item already exists in cart
    const existingItem = await pool.query(
      `SELECT id, quantity FROM cart_items 
       WHERE user_id = $1 AND shop_item_id = $2 AND 
       (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
      [userId, shop_item_id, variant_id]
    );

    if (existingItem.rows.length > 0) {
      // Update quantity
      const newQuantity = existingItem.rows[0].quantity + quantity;
      await pool.query(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      // Insert new item
      await pool.query(
        `INSERT INTO cart_items (user_id, shop_item_id, variant_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [userId, shop_item_id, variant_id, quantity]
      );
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [quantity, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove item from cart
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
  }
});

// Clear entire cart
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

// Checkout - create order from cart
router.post('/checkout', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { notes, payment_receipt_url } = req.body;

    await client.query('BEGIN');

    // Get cart items
    const cartResult = await client.query(`
      SELECT 
        ci.id,
        ci.quantity,
        ci.shop_item_id,
        ci.variant_id,
        siv.price as variant_price
      FROM cart_items ci
      LEFT JOIN shop_item_variants siv ON ci.variant_id = siv.id
      WHERE ci.user_id = $1
    `, [userId]);

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Calculate total
    const total = cartResult.rows.reduce((sum, item) => {
      return sum + (item.quantity * parseFloat(item.variant_price || 0));
    }, 0);

    // Create order
    const orderResult = await client.query(
      `INSERT INTO shop_orders (user_id, total_amount, status, notes, payment_receipt_url)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING *`,
      [userId, total, notes, payment_receipt_url]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO shop_order_items (order_id, shop_item_id, variant_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.shop_item_id, item.variant_id, item.quantity, item.variant_price]
      );
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Order placed successfully',
      order: orderResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during checkout:', error);
    res.status(500).json({ success: false, message: 'Failed to process checkout' });
  } finally {
    client.release();
  }
});

export default router;
