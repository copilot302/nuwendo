import pool from '../config/database.js';
import { uploadBase64Image } from '../services/storageService.js';
import { sendAdminAlertEmail, sendBookingLifecycleEmail } from '../services/emailService.js';

const sanitizeForPath = (value, fallback = 'unknown') => {
  return String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
};

const getPathTimestamp = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
};

// Get all active services
const getServices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, duration_minutes, price, category 
       FROM services 
       WHERE is_active = true 
       ORDER BY category, name`
    );
    
    res.json({
      success: true,
      services: result.rows
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a booking
const createBooking = async (req, res) => {
  try {
    const { 
      email, 
      serviceId, 
      bookingDate, 
      bookingTime,
      appointmentType,
      firstName, 
      lastName, 
      phoneNumber, 
      notes,
      paymentMethod,
      paymentReference
    } = req.body;

    // Validate appointment type
    if (!['online', 'on-site'].includes(appointmentType)) {
      return res.status(400).json({ message: 'Invalid appointment type' });
    }

    // Get user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Update user name if provided
    if (firstName || lastName) {
      await pool.query(
        'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name) WHERE id = $3',
        [firstName, lastName, userId]
      );
    }

    // Get service price and duration
    const serviceResult = await pool.query(
      'SELECT name, price, duration_minutes FROM services WHERE id = $1',
      [serviceId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

  const serviceName = serviceResult.rows[0].name;
  const amountPaid = serviceResult.rows[0].price;
    const serviceDuration = serviceResult.rows[0].duration_minutes || 30;

    // Calculate end_time based on booking_time + duration
    // All times are calculated in 15-minute chunks for precision
    const [hours, minutes] = bookingTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + serviceDuration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    // Check for overlapping bookings using 15-minute precision
    // A new booking overlaps if: new_start < existing_end AND new_end > existing_start
    const overlapCheck = await pool.query(
      `SELECT b.id, b.booking_time, b.end_time, s.duration_minutes
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.booking_date = $1 
       AND b.status != 'cancelled'
       AND b.payment_receipt_url IS NOT NULL`,
      [bookingDate]
    );

    const newStartMinutes = hours * 60 + minutes;
    const newEndMinutes = endMinutes;

    for (const existing of overlapCheck.rows) {
      const [exHours, exMinutes] = existing.booking_time.split(':').map(Number);
      const existingStart = exHours * 60 + exMinutes;
      let existingEnd;
      if (existing.end_time) {
        const [exEndHours, exEndMinutes] = existing.end_time.split(':').map(Number);
        existingEnd = exEndHours * 60 + exEndMinutes;
      } else {
        existingEnd = existingStart + (existing.duration_minutes || 30);
      }

      // Check for overlap: new_start < existing_end AND new_end > existing_start
      if (newStartMinutes < existingEnd && newEndMinutes > existingStart) {
        return res.status(400).json({ 
          message: 'This time slot overlaps with an existing booking. Please select a different time.' 
        });
      }
    }

    // Create booking with end_time for proper overlap checking
    const result = await pool.query(
      `INSERT INTO bookings (
        user_id, service_id, booking_date, booking_time, end_time,
        appointment_type, phone_number, notes, payment_status, 
        payment_method, payment_reference, amount_paid, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId, 
        serviceId, 
        bookingDate, 
        bookingTime,
        endTime,
        appointmentType,
        phoneNumber, 
        notes,
        'pending', // Payment status is pending until receipt is verified
        paymentMethod,
        paymentReference,
        amountPaid,
        'pending' // Booking status is pending until admin confirms payment
      ]
    );

    const bookingId = result.rows[0].id;

    const adminEmailResult = await sendAdminAlertEmail({
      subject: `Incoming appointment: Booking #${bookingId}`,
      title: 'New Incoming Appointment 📅',
      body: 'A new booking has been created and may require admin review.',
      details: {
        'Booking ID': `BK-${String(bookingId).padStart(6, '0')}`,
        'Patient Name': `${firstName || ''} ${lastName || ''}`.trim() || email,
        'Patient Email': email,
        'Service': serviceName,
        'Appointment Type': appointmentType,
        'Date': bookingDate,
        'Time': bookingTime,
        'Payment Status': 'Pending',
        'Booking Status': 'Pending'
      }
    });

    if (!adminEmailResult.success && !adminEmailResult.skipped) {
      console.warn(`⚠️ Admin incoming-appointment email failed for booking #${bookingId}:`, adminEmailResult.error);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      bookingId
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking details
const getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*, s.name as service_name, s.description as service_description,
              s.duration_minutes, u.email, u.first_name, u.last_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      success: true,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get patient bookings by email
const getPatientBookings = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        bookings: []
      });
    }

    const userId = userResult.rows[0].id;

    // Get all bookings for this user
    const result = await pool.query(
      `SELECT b.*, s.name as service_name, s.description as service_description,
              s.price, s.duration_minutes,
              b.reschedule_count, b.original_booking_date, b.original_booking_time,
              b.rescheduled_at, b.rescheduled_by, b.reschedule_reason
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [userId]
    );

    res.json({
      success: true,
      bookings: result.rows
    });
  } catch (error) {
    console.error('Get patient bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel a booking (patient cancellation policy controlled by reschedule_settings)
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT b.*, u.email, u.first_name, s.name AS service_name 
       FROM bookings b 
       JOIN users u ON b.user_id = u.id 
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Verify the email matches the booking owner
    if (booking.email !== email) {
      return res.status(403).json({ message: 'You are not authorized to cancel this booking' });
    }

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'This booking is already cancelled' });
    }

    // Get cancellation settings (shared table with reschedule policy)
    const settingsResult = await pool.query(
      'SELECT * FROM reschedule_settings ORDER BY id DESC LIMIT 1'
    );

    const settings = settingsResult.rows[0] || {};
    const allowPatientCancellation = settings.allow_patient_cancellation ?? true;
    const patientCancelMinHours = Number(settings.patient_cancel_min_hours_before ?? 24);

    if (!allowPatientCancellation) {
      return res.status(403).json({
        message: 'Patient cancellations are currently disabled. Please contact the clinic.'
      });
    }

    // Check if cancellation is allowed based on minimum hours
    const appointmentDateTime = new Date(`${booking.booking_date.toISOString().split('T')[0]}T${booking.booking_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < patientCancelMinHours) {
      return res.status(400).json({ 
        message: `Cancellations must be made at least ${patientCancelMinHours} hour(s) before the appointment time`,
        hoursRemaining: Math.round(hoursUntilAppointment)
      });
    }

    // Cancel the booking
    await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled',
           business_status = 'cancelled',
           cancelled_by_type = 'patient',
           cancelled_by_admin_id = NULL,
           cancelled_at = CURRENT_TIMESTAMP,
           cancellation_count = COALESCE(cancellation_count, 0) + 1,
           updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    const emailResult = await sendBookingLifecycleEmail({
      to: booking.email,
      firstName: booking.first_name,
      bookingId: booking.id,
      serviceName: booking.service_name,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      appointmentType: booking.appointment_type,
      eventType: 'cancelled',
      status: 'cancelled',
      businessStatus: 'cancelled'
    });

    if (!emailResult.success && !emailResult.skipped) {
      console.warn(`⚠️ Booking cancellation email failed for booking #${id}:`, emailResult.error);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public payment settings (QR code, instructions)
const getPublicPaymentSettings = async (req, res) => {
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

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload payment receipt for a booking
const uploadPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiptData, email } = req.body;

    if (!receiptData) {
      return res.status(400).json({ message: 'Receipt data is required' });
    }

    // Verify the booking belongs to this user
    const bookingResult = await pool.query(
      `SELECT b.id, b.status,
              u.first_name, u.last_name, u.email,
              s.name AS service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1 AND u.email = $2`,
      [id, email]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (bookingResult.rows[0].status !== 'pending') {
      return res.status(400).json({ message: 'Receipt can only be uploaded for pending bookings' });
    }

  // Build descriptive receipt folder:
  // receipts/{sender-name}-{service-name}-{sent-timestamp}
  const booking = bookingResult.rows[0];
  const senderName = `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || booking.email || `booking-${id}`;
  const senderSlug = sanitizeForPath(senderName, `booking-${id}`);
  const serviceSlug = sanitizeForPath(booking.service_name, 'service');
  const sentAtSlug = getPathTimestamp(new Date());
  const receiptFolder = `receipts/${senderSlug}-${serviceSlug}-${sentAtSlug}`;

  // Upload image to Supabase Storage
    console.log('Uploading receipt to Supabase Storage...');
  const { url } = await uploadBase64Image(receiptData, receiptFolder);
    console.log('Receipt uploaded successfully:', url);

    // Update booking with receipt URL (not the base64 data)
    await pool.query(
      `UPDATE bookings 
       SET payment_receipt_url = $1, 
           payment_receipt_uploaded_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [url, id]
    );

    const adminEmailResult = await sendAdminAlertEmail({
      subject: `Booking payment for approval: #${id}`,
      title: 'Booking Receipt Uploaded 💳',
      body: 'A booking payment receipt was uploaded and is waiting for admin approval.',
      details: {
        'Booking ID': `BK-${String(id).padStart(6, '0')}`,
        'Patient Name': `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || booking.email,
        'Patient Email': booking.email,
        'Service': booking.service_name,
        'Current Status': booking.status,
        'Receipt URL': url
      }
    });

    if (!adminEmailResult.success && !adminEmailResult.skipped) {
      console.warn(`⚠️ Admin booking-approval email failed for booking #${id}:`, adminEmailResult.error);
    }

    res.json({
      success: true,
      message: 'Payment receipt uploaded successfully. Waiting for admin approval.',
      receiptUrl: url
    });
  } catch (error) {
    console.error('Upload receipt error:', error);

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
        errorCode: 'INVALID_RECEIPT_FORMAT'
      });
    }

    if (error?.message?.toLowerCase().includes('failed to upload file')) {
      return res.status(502).json({
        message: 'Receipt upload service is temporarily unavailable. Please try again in a moment.',
        errorCode: 'RECEIPT_UPLOAD_UNAVAILABLE'
      });
    }

    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Discard a newly-created pending booking when receipt upload fails
const discardUnpaidBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const bookingResult = await pool.query(
      `SELECT b.id, b.status, b.payment_receipt_url
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND u.email = $2`,
      [id, email]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be discarded' });
    }

    if (booking.payment_receipt_url) {
      return res.status(400).json({ message: 'Cannot discard booking with uploaded receipt' });
    }

    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Unpaid booking discarded successfully'
    });
  } catch (error) {
    console.error('Discard unpaid booking error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Helper function: Get time-based status
const getTimeStatus = (bookingDate, bookingTime) => {
  try {
    const now = new Date();
    
    // Parse booking date and time
    const dateStr = bookingDate instanceof Date 
      ? bookingDate.toISOString().split('T')[0]
      : String(bookingDate).split('T')[0];
    
    const timeStr = String(bookingTime).substring(0, 8);
    const bookingDateTime = new Date(`${dateStr}T${timeStr}`);
    
    if (isNaN(bookingDateTime.getTime())) {
      return 'unknown';
    }
    
    const diffMs = bookingDateTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // If appointment is in the past (more than 30 minutes ago)
    if (diffMinutes < -30) {
      return 'past';
    }
    
    // If appointment is happening now (within 30 minutes before or after start time)
    if (diffMinutes >= -30 && diffMinutes <= 30) {
      return 'in_progress';
    }
    
    // If appointment is in the future
    return 'upcoming';
  } catch (error) {
    console.error('Error calculating time status:', error);
    return 'unknown';
  }
};

export {
  getServices,
  createBooking,
  getBooking,
  getPatientBookings,
  cancelBooking,
  getPublicPaymentSettings,
  uploadPaymentReceipt,
  discardUnpaidBooking,
  getTimeStatus
};
