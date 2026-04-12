import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendAdminAlertEmail } from '../services/emailService.js';

const router = express.Router();

// Get payment QR code settings (public, for checkout)
router.get('/payment-settings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value 
       FROM system_settings 
       WHERE setting_key IN ('payment_qr_code', 'payment_instructions', 'payment_account_name', 'payment_account_number')`
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment settings' });
  }
});

// Check shop access by email (public endpoint for legacy sessions)
router.get('/access/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Get user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        hasAccess: false 
      });
    }

    const userId = userResult.rows[0].id;

    // Check shop access
    const accessResult = await pool.query(
      'SELECT has_access FROM patient_shop_access WHERE user_id = $1',
      [userId]
    );
    
    const hasAccess = accessResult.rows.length > 0 ? accessResult.rows[0].has_access : false;
    
    res.json({ 
      success: true, 
      hasAccess 
    });
  } catch (error) {
    console.error('Error checking shop access by email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check shop access' 
    });
  }
});

// Check if patient has shop access
router.get('/access', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT has_access FROM patient_shop_access WHERE user_id = $1',
      [req.user.userId]
    );
    
    const hasAccess = result.rows.length > 0 ? result.rows[0].has_access : false;
    
    res.json({ 
      success: true, 
      hasAccess 
    });
  } catch (error) {
    console.error('Error checking shop access:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check shop access' 
    });
  }
});

// Get shop items by email (public endpoint for legacy sessions)
router.get('/items/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Get user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userId = userResult.rows[0].id;

    // Check if patient has access
    const accessResult = await pool.query(
      'SELECT has_access FROM patient_shop_access WHERE user_id = $1',
      [userId]
    );
    
    const hasAccess = accessResult.rows.length > 0 ? accessResult.rows[0].has_access : false;
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to the shop' 
      });
    }

    // Fetch shop items with variants
    const result = await pool.query(`
      SELECT 
        si.id,
        si.name,
        si.description,
        si.category,
        si.image_url,
        si.is_active,
        COALESCE(
          json_agg(
            json_build_object(
              'id', siv.id,
              'name', siv.name,
              'price', siv.price,
              'is_active', siv.is_active,
              'sort_order', siv.sort_order
            ) ORDER BY siv.sort_order, siv.id
          ) FILTER (WHERE siv.id IS NOT NULL AND siv.is_active = true),
          '[]'
        ) as variants
      FROM shop_items si
      LEFT JOIN shop_item_variants siv ON siv.shop_item_id = si.id
      WHERE si.is_active = true
      GROUP BY si.id
      ORDER BY si.category, si.name
    `);
    
    res.json({ 
      success: true, 
      items: result.rows 
    });
  } catch (error) {
    console.error('Error fetching shop items by email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch shop items' 
    });
  }
});

// Get all active shop items (only if patient has access)
router.get('/items', authMiddleware, async (req, res) => {
  try {
    // Check if patient has access
    const accessResult = await pool.query(
      'SELECT has_access FROM patient_shop_access WHERE user_id = $1',
      [req.user.userId]
    );
    
    const hasAccess = accessResult.rows.length > 0 ? accessResult.rows[0].has_access : false;
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to the shop' 
      });
    }

    const result = await pool.query(`
      SELECT 
        si.id,
        si.name,
        si.description,
        si.category,
        si.image_url,
        si.is_active,
        COALESCE(
          json_agg(
            json_build_object(
              'id', siv.id,
              'name', siv.name,
              'price', siv.price,
              'is_active', siv.is_active,
              'sort_order', siv.sort_order
            ) ORDER BY siv.sort_order, siv.id
          ) FILTER (WHERE siv.id IS NOT NULL AND siv.is_active = true),
          '[]'
        ) as variants
      FROM shop_items si
      LEFT JOIN shop_item_variants siv ON siv.shop_item_id = si.id
      WHERE si.is_active = true
      GROUP BY si.id
      ORDER BY si.category, si.name
    `);
    
    res.json({ 
      success: true, 
      items: result.rows 
    });
  } catch (error) {
    console.error('Error fetching shop items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch shop items' 
    });
  }
});

// Create shop order
router.post('/orders', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Check if patient has access
    const accessResult = await client.query(
      'SELECT has_access FROM patient_shop_access WHERE user_id = $1',
      [req.user.userId]
    );
    
    const hasAccess = accessResult.rows.length > 0 ? accessResult.rows[0].has_access : false;
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to the shop' 
      });
    }

  const { items, payment_receipt_url, notes, recipient_name, recipient_phone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must contain at least one item' 
      });
    }

    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE shop_orders
      ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(30)
    `);

    const profileResult = await client.query(
      `SELECT phone_number FROM patient_profiles WHERE user_id = $1 LIMIT 1`,
      [req.user.userId]
    );

    const normalizedRecipientName = typeof recipient_name === 'string' ? recipient_name.trim() : '';
    const normalizedRecipientPhone = typeof recipient_phone === 'string' ? recipient_phone.trim() : '';
    const fallbackPhone = profileResult.rows[0]?.phone_number || null;

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const itemResult = await client.query(
        'SELECT price, stock_quantity FROM shop_items WHERE id = $1 AND is_active = true',
        [item.shop_item_id]
      );
      
      if (itemResult.rows.length === 0) {
        throw new Error(`Item ${item.shop_item_id} not found or not available`);
      }
      
      const itemData = itemResult.rows[0];
      if (itemData.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for item ${item.shop_item_id}`);
      }
      
      totalAmount += parseFloat(itemData.price) * item.quantity;
    }

    // Create order
    const orderResult = await client.query(`
      INSERT INTO shop_orders (user_id, total_amount, payment_receipt_url, notes, recipient_name, recipient_phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      req.user.userId,
      totalAmount,
      payment_receipt_url,
      notes,
      normalizedRecipientName || null,
      normalizedRecipientPhone || fallbackPhone
    ]);

    const orderId = orderResult.rows[0].id;

    // Add order items
    for (const item of items) {
      const itemResult = await client.query(
        'SELECT price FROM shop_items WHERE id = $1',
        [item.shop_item_id]
      );
      
      await client.query(`
        INSERT INTO shop_order_items (order_id, shop_item_id, quantity, price_at_purchase)
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.shop_item_id, item.quantity, itemResult.rows[0].price]);

      // Update stock
      await client.query(
        'UPDATE shop_items SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.shop_item_id]
      );
    }

    await client.query('COMMIT');

    const userDetailsResult = await pool.query(
      'SELECT first_name, last_name, email FROM users WHERE id = $1 LIMIT 1',
      [req.user.userId]
    );

    const customer = userDetailsResult.rows[0] || {};
    const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || `User #${req.user.userId}`;

    const adminEmailResult = await sendAdminAlertEmail({
      subject: `Shop order pending approval: #${orderId}`,
      title: 'New Shop Order Pending Approval 🛒',
      body: 'A new shop order was placed and is awaiting admin payment verification.',
      details: {
        'Order ID': orderId,
        'Customer': customerName,
        'Customer Email': customer.email || 'N/A',
        'Total Amount': `PHP ${Number(totalAmount || 0).toLocaleString()}`,
        'Items': items.length,
        'Payment Status': 'Pending Verification'
      }
    });

    if (!adminEmailResult.success && !adminEmailResult.skipped) {
      console.warn(`⚠️ Admin shop-approval email failed for order #${orderId}:`, adminEmailResult.error);
    }

    res.status(201).json({ 
      success: true, 
      order: orderResult.rows[0],
      message: 'Order created successfully' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create order' 
    });
  } finally {
    client.release();
  }
});

// Get patient's orders
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'shop_item_id', oi.shop_item_id,
            'quantity', oi.quantity,
            'price_at_purchase', oi.price_at_purchase,
            'item_name', si.name,
            'variant_name', siv.name
          )
        ) as items
      FROM shop_orders o
      LEFT JOIN shop_order_items oi ON o.id = oi.order_id
      LEFT JOIN shop_items si ON oi.shop_item_id = si.id
      LEFT JOIN shop_item_variants siv ON oi.variant_id = siv.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.userId]);
    
    res.json({ 
      success: true, 
      orders: result.rows 
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
});

// Mark order as received by customer
router.patch('/orders/:id/received', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const orderResult = await pool.query(
      'SELECT id, status FROM shop_orders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await pool.query(
      `UPDATE shop_orders SET status = 'received', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Order marked as received' });
  } catch (error) {
    console.error('Error marking order as received:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

export default router;
