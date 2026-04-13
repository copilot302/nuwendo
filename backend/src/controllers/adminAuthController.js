import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

// Helper function to create audit log
const createAuditLog = async (adminId, action, resourceType = null, resourceId = null, oldValues = null, newValues = null) => {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, resource_type, resource_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, resourceType, resourceId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
    );
  } catch (error) {
    console.error('Create audit log error:', error);
  }
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get admin user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, full_name, role, is_active FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin.id, 
        username: admin.username, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Store session in database
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    await pool.query(
      'INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES ($1, $2, $3)',
      [admin.id, token, expiresAt]
    );

    // Log the login
    await createAuditLog(admin.id, 'Admin login', 'admin_sessions', null, null, { username: admin.username, email: admin.email });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.adminId;

    const result = await pool.query(
      'SELECT id, username, email, full_name, role, last_login FROM admin_users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      success: true,
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update admin account (email/password)
const updateAdminAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const adminId = req.admin.adminId;
    const { email, newPassword } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const shouldUpdateEmail = normalizedEmail.length > 0;
    const shouldUpdatePassword = typeof newPassword === 'string' && newPassword.length > 0;

    if (!shouldUpdateEmail && !shouldUpdatePassword) {
      return res.status(400).json({ success: false, message: 'Please provide a new email or new password' });
    }

    const adminResult = await pool.query(
      'SELECT id, username, email, full_name, role FROM admin_users WHERE id = $1 AND is_active = true',
      [adminId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const admin = adminResult.rows[0];

    if (shouldUpdateEmail) {
      const emailInUse = await pool.query(
        'SELECT id FROM admin_users WHERE LOWER(email) = LOWER($1) AND id <> $2',
        [normalizedEmail, adminId]
      );

      if (emailInUse.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email is already used by another admin account' });
      }
    }

    const updates = [];
    const values = [];

    if (shouldUpdateEmail) {
      values.push(normalizedEmail);
      updates.push(`email = $${values.length}`);
    }

    if (shouldUpdatePassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      values.push(hashedPassword);
      updates.push(`password_hash = $${values.length}`);
    }

    values.push(adminId);

    const updateResult = await pool.query(
      `UPDATE admin_users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING id, username, email, full_name, role, last_login`,
      values
    );

    const updatedAdmin = updateResult.rows[0];

    await createAuditLog(
      adminId,
      'Admin account updated',
      'admin_users',
      String(adminId),
      { email: admin.email },
      { email: updatedAdmin.email, passwordChanged: shouldUpdatePassword }
    );

    return res.json({
      success: true,
      message: 'Admin account updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Update admin account error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin logout
const adminLogout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const adminId = req.admin?.adminId;
    
    if (token) {
      // Remove session from database
      await pool.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    }

    // Log the logout
    if (adminId) {
      await createAuditLog(adminId, 'Admin logout', 'admin_sessions', null, null, null);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const manilaWindowResult = await pool.query(
      `SELECT (NOW() AT TIME ZONE 'Asia/Manila')::date AS today,
              date_trunc('week', NOW() AT TIME ZONE 'Asia/Manila')::date AS week_start,
              (date_trunc('week', NOW() AT TIME ZONE 'Asia/Manila')::date + INTERVAL '6 day')::date AS week_end`
    );

    const { today, week_start: weekStart, week_end: weekEnd } = manilaWindowResult.rows[0];

    // Total bookings
    const totalBookingsResult = await pool.query(
      `SELECT COUNT(*)::int as total
       FROM bookings
       WHERE status != 'pending'`
    );

    // Today's appointments
    const todayAppointmentsResult = await pool.query(
      `SELECT COUNT(*)::int as today
       FROM bookings
       WHERE status != 'pending'
         AND booking_date = $1`,
      [today]
    );

    const todayConfirmedCountResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM bookings
       WHERE status = 'confirmed'
         AND COALESCE(business_status, 'scheduled') = 'scheduled'
         AND booking_date = $1`,
      [today]
    );

    // This week's appointments
    const thisWeekResult = await pool.query(
      `SELECT COUNT(*)::int as week
       FROM bookings
       WHERE status != 'pending'
         AND booking_date BETWEEN $1 AND $2`,
      [weekStart, weekEnd]
    );

    // Pending payments (must match /admin/pending-payments criteria)
    const pendingPaymentsResult = await pool.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.status, b.amount_paid, b.payment_status, b.phone_number,
              u.first_name, u.last_name, u.email,
              s.name as service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.status = 'pending'
         AND b.payment_receipt_url IS NOT NULL
       ORDER BY b.booking_date ASC, b.booking_time ASC
       LIMIT 10`
    );

    // Total pending booking approvals (for counters/badges)
    const pendingBookingCountResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM bookings
       WHERE status = 'pending'
         AND payment_receipt_url IS NOT NULL`
    );

    // Total pending shop-order approvals (payment uploaded but not yet verified)
    const pendingShopCountResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM shop_orders
       WHERE payment_verified = false
         AND status != 'cancelled'
         AND payment_receipt_url IS NOT NULL`
    );

    // Calculate total pending amount
    const pendingAmountResult = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM bookings 
       WHERE status = 'pending'
         AND payment_receipt_url IS NOT NULL`
    );

    // Today's schedule
    const todayBookingsResult = await pool.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.status, b.business_status, b.cancelled_by_type, b.amount_paid, b.payment_status,
              u.first_name, u.last_name, u.email,
              s.name as service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.status != 'pending'
         AND b.booking_date = $1
       ORDER BY b.booking_time ASC
       LIMIT 20`,
      [today]
    );

    // Recent bookings
    const recentBookingsResult = await pool.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.status, b.business_status, b.cancelled_by_type, b.amount_paid, b.payment_status,
              u.first_name, u.last_name, u.email,
              s.name as service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.status != 'pending'
       ORDER BY b.created_at DESC
       LIMIT 10`
    );

    // Booking overview by appointment type (approved bookings only)
    const bookingOverviewResult = await pool.query(
      `SELECT LOWER(COALESCE(appointment_type, 'on-site')) AS appointment_type,
              COUNT(*)::int AS total
       FROM bookings
       WHERE status IN ('confirmed', 'completed')
       GROUP BY LOWER(COALESCE(appointment_type, 'on-site'))`
    );

    const bookingOverview = bookingOverviewResult.rows.reduce(
      (acc, row) => {
        const normalizedType = String(row.appointment_type || '').trim();
        if (normalizedType === 'online') {
          acc.online += Number(row.total) || 0;
        } else if (normalizedType === 'on-site' || normalizedType === 'onsite' || normalizedType === 'on_site') {
          acc.onSite += Number(row.total) || 0;
        }
        return acc;
      },
      { online: 0, onSite: 0 }
    );

    res.json({
      success: true,
      stats: {
        totalBookings: totalBookingsResult.rows[0].total,
        todayAppointments: todayAppointmentsResult.rows[0].today,
        todayConfirmedCount: todayConfirmedCountResult.rows[0].total,
        thisWeekAppointments: thisWeekResult.rows[0].week,
        pendingPayments: pendingPaymentsResult.rows,
        pendingBookingApprovalsCount: pendingBookingCountResult.rows[0].total,
        pendingShopApprovalsCount: pendingShopCountResult.rows[0].total,
        pendingApprovalsCount:
          pendingBookingCountResult.rows[0].total + pendingShopCountResult.rows[0].total,
        pendingPaymentsTotal: parseFloat(pendingAmountResult.rows[0].total),
        bookingOverview,
        todayBookings: todayBookingsResult.rows,
        recentBookings: recentBookingsResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  adminLogin,
  getAdminProfile,
  updateAdminAccount,
  adminLogout,
  getDashboardStats
};