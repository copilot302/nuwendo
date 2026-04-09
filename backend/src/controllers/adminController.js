import pool from '../config/database.js';
import { createGoogleMeetLink } from '../services/googleCalendarService.js';

// Get all services for admin management
const getServices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              au1.full_name as created_by_name,
              au2.full_name as updated_by_name
       FROM services s
       LEFT JOIN admin_users au1 ON s.created_by = au1.id
       LEFT JOIN admin_users au2 ON s.updated_by = au2.id
       ORDER BY s.category, s.name`
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

// Create new service
const createService = async (req, res) => {
  try {
    const { name, description, duration_minutes, price, category, availability_type } = req.body;
    const adminId = req.admin.adminId;

    const result = await pool.query(
      `INSERT INTO services (name, description, duration_minutes, price, category, availability_type, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING *`,
      [name, description, duration_minutes, price, category, availability_type || 'both', adminId]
    );

    // Log the action
    await createAuditLog(adminId, 'Created service', 'services', result.rows[0].id, null, { name, description, duration_minutes, price, category, availability_type });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration_minutes, price, category, is_active, availability_type } = req.body;
    const adminId = req.admin.adminId;

    // Get old values for audit
    const oldResult = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    const oldValues = oldResult.rows[0];

    const result = await pool.query(
      `UPDATE services 
       SET name = $1, description = $2, duration_minutes = $3, price = $4, 
           category = $5, is_active = $6, availability_type = $7, updated_by = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, description, duration_minutes, price, category, is_active, availability_type || 'both', adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Log the action
    await createAuditLog(adminId, 'Updated service', 'services', parseInt(id), oldValues, { name, description, duration_minutes, price, category, is_active, availability_type });

    res.json({
      success: true,
      message: 'Service updated successfully',
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service has bookings
    const bookingsResult = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE service_id = $1',
      [id]
    );

    if (parseInt(bookingsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete service with existing bookings. Please deactivate instead.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM services WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all time slots (now availability windows)
const getTimeSlots = async (req, res) => {
  try {
    // Try availability_windows first, fallback to working_hours
    let result = await pool.query(
      `SELECT aw.*, 
              au1.full_name as created_by_name,
              au2.full_name as updated_by_name
       FROM availability_windows aw
       LEFT JOIN admin_users au1 ON aw.created_by = au1.id
       LEFT JOIN admin_users au2 ON aw.updated_by = au2.id
       ORDER BY aw.day_of_week, aw.appointment_type`
    );
    
    // If no availability_windows, try working_hours for backward compatibility
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT wh.*, 
                au1.full_name as created_by_name,
                au2.full_name as updated_by_name
         FROM working_hours wh
         LEFT JOIN admin_users au1 ON wh.created_by = au1.id
         LEFT JOIN admin_users au2 ON wh.updated_by = au2.id
         ORDER BY wh.day_of_week, wh.appointment_type`
      );
    }
    
    res.json({
      success: true,
      timeSlots: result.rows
    });
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update availability window for a day
const createTimeSlot = async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, appointment_type } = req.body;
    const adminId = req.admin.adminId;

    // Validate that appointment_type is required
    if (!appointment_type || !['online', 'on-site'].includes(appointment_type)) {
      return res.status(400).json({ 
        message: 'Appointment type is required and must be either "online" or "on-site"' 
      });
    }

    // Validate times
    if (start_time >= end_time) {
      return res.status(400).json({ 
        message: 'Start time must be before end time' 
      });
    }

    // Check if a different appointment type already exists for this day
    const existingDifferentType = await pool.query(
      `SELECT id, appointment_type FROM availability_windows 
       WHERE day_of_week = $1 
       AND appointment_type != $2
       AND is_active = true`,
      [day_of_week, appointment_type]
    );

    if (existingDifferentType.rows.length > 0) {
      return res.status(400).json({ 
        message: `This day already has ${existingDifferentType.rows[0].appointment_type} appointments. Each day can only have one appointment type.` 
      });
    }

    // Check if availability window already exists for this day/type combination
    const existingResult = await pool.query(
      `SELECT id FROM availability_windows 
       WHERE day_of_week = $1 
       AND appointment_type = $2`,
      [day_of_week, appointment_type]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing availability window
      result = await pool.query(
        `UPDATE availability_windows 
         SET start_time = $1, end_time = $2, 
             updated_by = $3, updated_at = CURRENT_TIMESTAMP, is_active = TRUE
         WHERE day_of_week = $4 AND appointment_type = $5
         RETURNING *`,
        [start_time, end_time, adminId, day_of_week, appointment_type]
      );
    } else {
      // Create new availability window
      result = await pool.query(
        `INSERT INTO availability_windows (day_of_week, start_time, end_time, appointment_type, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING *`,
        [day_of_week, start_time, end_time, appointment_type, adminId]
      );
    }

    // Also sync to working_hours for backward compatibility
    const existingWH = await pool.query(
      `SELECT id FROM working_hours WHERE day_of_week = $1 AND appointment_type = $2`,
      [day_of_week, appointment_type]
    );
    
    if (existingWH.rows.length > 0) {
      await pool.query(
        `UPDATE working_hours SET start_time = $1, end_time = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP, is_active = TRUE
         WHERE day_of_week = $4 AND appointment_type = $5`,
        [start_time, end_time, adminId, day_of_week, appointment_type]
      );
    } else {
      await pool.query(
        `INSERT INTO working_hours (day_of_week, start_time, end_time, appointment_type, slot_interval_minutes, created_by, updated_by)
         VALUES ($1, $2, $3, $4, 30, $5, $5)
         ON CONFLICT (day_of_week, appointment_type) DO UPDATE SET start_time = $2, end_time = $3, is_active = TRUE`,
        [day_of_week, start_time, end_time, appointment_type, adminId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Availability window saved successfully',
      timeSlot: result.rows[0]
    });
  } catch (error) {
    console.error('Create availability window error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update availability window
const updateTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, appointment_type, is_active } = req.body;
    const adminId = req.admin.adminId;

    // Validate appointment_type if provided
    if (appointment_type && !['online', 'on-site'].includes(appointment_type)) {
      return res.status(400).json({ 
        message: 'Appointment type must be either "online" or "on-site"' 
      });
    }

    // Validate times
    if (start_time && end_time && start_time >= end_time) {
      return res.status(400).json({ 
        message: 'Start time must be before end time' 
      });
    }

    const result = await pool.query(
      `UPDATE availability_windows 
       SET day_of_week = COALESCE($1, day_of_week), 
           start_time = COALESCE($2, start_time), 
           end_time = COALESCE($3, end_time), 
           appointment_type = COALESCE($4, appointment_type), 
           is_active = COALESCE($5, is_active), 
           updated_by = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [day_of_week, start_time, end_time, appointment_type, is_active, adminId, id]
    );

    if (result.rows.length === 0) {
      // Try working_hours for backward compatibility
      const whResult = await pool.query(
        `UPDATE working_hours 
         SET day_of_week = COALESCE($1, day_of_week), 
             start_time = COALESCE($2, start_time), 
             end_time = COALESCE($3, end_time), 
             appointment_type = COALESCE($4, appointment_type), 
             is_active = COALESCE($5, is_active), 
             updated_by = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [day_of_week, start_time, end_time, appointment_type, is_active, adminId, id]
      );
      
      if (whResult.rows.length === 0) {
        return res.status(404).json({ message: 'Availability window not found' });
      }
      
      return res.json({
        success: true,
        message: 'Availability window updated successfully',
        timeSlot: whResult.rows[0]
      });
    }

    res.json({
      success: true,
      message: 'Availability window updated successfully',
      timeSlot: result.rows[0]
    });
  } catch (error) {
    console.error('Update availability window error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete availability window
const deleteTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;

    // Try availability_windows first
    let result = await pool.query(
      'DELETE FROM availability_windows WHERE id = $1 RETURNING *',
      [id]
    );

    // Also delete from working_hours if exists (for backward compatibility)
    if (result.rows.length > 0) {
      await pool.query(
        'DELETE FROM working_hours WHERE day_of_week = $1 AND appointment_type = $2',
        [result.rows[0].day_of_week, result.rows[0].appointment_type]
      );
    } else {
      // Try working_hours if not found in availability_windows
      result = await pool.query(
        'DELETE FROM working_hours WHERE id = $1 RETURNING *',
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Availability window not found' });
    }

    res.json({
      success: true,
      message: 'Availability window deleted successfully'
    });
  } catch (error) {
    console.error('Delete working hours error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookings with pagination and filters
const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to, search } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`b.status = $${paramIndex++}`);
      queryParams.push(status);
    } else {
      // Default behavior: bookings page should show operational bookings only.
      // Keep payment-pending items in Admin Payments until approved/rejected.
      whereConditions.push(`b.status != $${paramIndex++}`);
      queryParams.push('pending');
    }

    if (date_from) {
      whereConditions.push(`b.booking_date >= $${paramIndex++}`);
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push(`b.booking_date <= $${paramIndex++}`);
      queryParams.push(date_to);
    }

    if (search) {
      whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);

    const result = await pool.query(
      `SELECT b.id, b.user_id, b.service_id, b.status, b.business_status, b.notes, 
              b.appointment_type, b.payment_status, b.payment_method, 
        b.payment_reference, b.payment_receipt_url, b.amount_paid, b.created_at, b.updated_at,
              b.video_call_link, b.admin_notes, b.completed_at, b.completed_by,
              b.cancelled_by_type, b.cancelled_by_admin_id, b.cancelled_at,
              b.booking_date as slot_date,
              b.booking_time as slot_time,
              b.phone_number as booking_phone,
              b.phone_number as patient_phone,
              b.reschedule_count, b.original_booking_date, b.original_booking_time,
              b.rescheduled_at, b.rescheduled_by, b.reschedule_reason,
              u.first_name, u.last_name, 
              u.email as patient_email,
              CONCAT(u.first_name, ' ', u.last_name) as patient_name,
              b.user_id as patient_id,
              s.name as service_name, s.duration_minutes, s.price,
              admin_user.full_name as completed_by_name,
              cancelled_admin.full_name as cancelled_by_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN services s ON b.service_id = s.id
       LEFT JOIN admin_users admin_user ON b.completed_by = admin_user.id
       LEFT JOIN admin_users cancelled_admin ON b.cancelled_by_admin_id = cancelled_admin.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Import getTimeStatus helper
    const { getTimeStatus } = await import('./bookingController.js');
    
    // Add time_status to each booking
    const bookingsWithTimeStatus = result.rows.map(booking => {
      const isTerminalStatus =
        booking.status === 'cancelled' ||
        booking.business_status === 'cancelled' ||
        booking.business_status === 'completed' ||
        booking.business_status === 'no_show';

      return {
        ...booking,
        time_status: isTerminalStatus ? null : getTimeStatus(booking.slot_date, booking.slot_time)
      };
    });

    res.json({
      success: true,
      bookings: bookingsWithTimeStatus,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_records: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.admin.adminId;

    // Get booking details including patient info and service details
    const oldResult = await pool.query(`
      SELECT b.id, b.status, b.user_id, b.appointment_type, b.booking_date, b.booking_time,
             u.email, u.first_name, u.last_name,
             s.name as service_name, s.duration_minutes
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN services s ON b.service_id = s.id
      WHERE b.id = $1
    `, [id]);
    
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = oldResult.rows[0];
    const oldStatus = booking.status;
    const isOnlineAppointment = booking.appointment_type === 'online';

    // Generate meeting link for online appointments when confirming
    let meetingLink = null;
    if (status === 'confirmed' && isOnlineAppointment) {
      try {
        // Create appointment date/time
        let appointmentDateTime;
        
        // Handle different date formats
        const dateStr = booking.booking_date instanceof Date 
          ? booking.booking_date.toISOString().split('T')[0]
          : String(booking.booking_date).split('T')[0]; // Handle both Date and string
        
        const timeStr = String(booking.booking_time).substring(0, 8); // Ensure HH:MM:SS format
        
        appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
        
        console.log('Creating Google Meet link for:', {
          dateStr,
          timeStr,
          appointmentDateTime: appointmentDateTime.toISOString()
        });
        
        // Validate the date
        if (isNaN(appointmentDateTime.getTime())) {
          throw new Error(`Invalid date/time: date=${dateStr}, time=${timeStr}`);
        }
        
        // Use Google Calendar service to create meet link
        const meetResult = await createGoogleMeetLink({
          summary: `${booking.service_name} - ${booking.first_name} ${booking.last_name}`,
          description: `Nuwendo Clinic - ${booking.service_name} consultation`,
          startDateTime: appointmentDateTime,
          durationMinutes: booking.duration_minutes || 30,
          attendeeEmail: booking.email
        });
        
        meetingLink = meetResult.meetLink;
        console.log('✅ Google Meet link created successfully:', meetingLink);
      } catch (error) {
        console.error('❌ Error creating Google Meet link:', error.message);
        console.error('Booking details:', {
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          service_name: booking.service_name
        });
        
        // Don't fail the entire request - just log the error and continue without meeting link
        // The admin can manually add a meeting link later
        console.warn('⚠️ Continuing without Google Meet link');
      }
    }

    // Build the update query based on status and appointment type
    let updateQuery;
    let queryParams;

    if (status === 'confirmed') {
      if (isOnlineAppointment && meetingLink) {
        // Confirming online appointment - include meeting link
        updateQuery = `UPDATE bookings 
          SET status = $1, payment_approved_by = $2, payment_approved_at = CURRENT_TIMESTAMP, 
              video_call_link = $3,
              cancelled_by_type = NULL,
              cancelled_by_admin_id = NULL,
              cancelled_at = NULL,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = $4 RETURNING *`;
        queryParams = [status, adminId, meetingLink, id];
      } else {
        // Confirming on-site appointment - no meeting link
        updateQuery = `UPDATE bookings 
          SET status = $1, payment_approved_by = $2, payment_approved_at = CURRENT_TIMESTAMP, 
              cancelled_by_type = NULL,
              cancelled_by_admin_id = NULL,
              cancelled_at = NULL,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = $3 RETURNING *`;
        queryParams = [status, adminId, id];
      }
    } else if (status === 'cancelled') {
      updateQuery = `UPDATE bookings 
        SET status = $1,
            business_status = 'cancelled',
            cancelled_by_type = 'admin',
            cancelled_by_admin_id = $2,
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 RETURNING *`;
      queryParams = [status, adminId, id];
    } else {
      // Other status changes (cancelled, completed, etc.)
      updateQuery = `UPDATE bookings 
        SET status = $1,
            cancelled_by_type = CASE WHEN $1 = 'cancelled' THEN cancelled_by_type ELSE NULL END,
            cancelled_by_admin_id = CASE WHEN $1 = 'cancelled' THEN cancelled_by_admin_id ELSE NULL END,
            cancelled_at = CASE WHEN $1 = 'cancelled' THEN cancelled_at ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 RETURNING *`;
      queryParams = [status, id];
    }

    const result = await pool.query(updateQuery, queryParams);

    // Log the action
    const auditNewValues = { status };
    if (meetingLink) {
      auditNewValues.video_call_link = meetingLink;
    }
    await createAuditLog(adminId, `Booking status changed: ${oldStatus} → ${status}${meetingLink ? ' (meeting link generated)' : ''}`, 'bookings', parseInt(id), { status: oldStatus }, auditNewValues);

    res.json({
      success: true,
      message: `Booking status updated successfully${meetingLink ? '. Meeting link generated for online appointment.' : ''}`,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update booking business status (completed, cancelled, no_show)
const updateBookingBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { business_status, admin_notes } = req.body;
    const adminId = req.admin.adminId;

    // Validate business_status
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(business_status)) {
      return res.status(400).json({ 
        message: `Invalid business status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Get current booking details
    const oldResult = await pool.query(`
      SELECT b.id, b.business_status, b.user_id,
             u.email, u.first_name, u.last_name,
             s.name as service_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN services s ON b.service_id = s.id
      WHERE b.id = $1
    `, [id]);
    
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = oldResult.rows[0];
    const oldBusinessStatus = booking.business_status;

    // Build update query
    let updateQuery;
    let queryParams;

    if (business_status === 'completed') {
      // Mark as completed with timestamp and admin who completed it
      updateQuery = `
        UPDATE bookings 
        SET business_status = $1, 
            status = 'confirmed',
            admin_notes = $2, 
            completed_at = CURRENT_TIMESTAMP,
            completed_by = $3,
            cancelled_by_type = NULL,
            cancelled_by_admin_id = NULL,
            cancelled_at = NULL,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING *`;
      queryParams = [business_status, admin_notes || null, adminId, id];
    } else if (business_status === 'cancelled') {
      updateQuery = `
        UPDATE bookings 
        SET business_status = $1,
            status = 'cancelled',
            admin_notes = $2,
            cancelled_by_type = 'admin',
            cancelled_by_admin_id = $3,
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *`;
      queryParams = [business_status, admin_notes || null, adminId, id];
    } else {
      // Other status changes
      updateQuery = `
        UPDATE bookings 
        SET business_status = $1, 
            status = CASE WHEN $1 = 'scheduled' THEN 'confirmed' ELSE status END,
            admin_notes = $2,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3 
        RETURNING *`;
      queryParams = [business_status, admin_notes || null, id];
    }

    const result = await pool.query(updateQuery, queryParams);

    // Log the action
    const auditNewValues = { 
      business_status,
      ...(admin_notes && { admin_notes })
    };
    
    await createAuditLog(
      adminId, 
      `Appointment status changed: ${oldBusinessStatus} → ${business_status}${admin_notes ? ` (Note: ${admin_notes})` : ''}`, 
      'bookings', 
      parseInt(id), 
      { business_status: oldBusinessStatus }, 
      auditNewValues
    );

    res.json({
      success: true,
      message: `Appointment marked as ${business_status}`,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update booking business status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment settings
const getPaymentSettings = async (req, res) => {
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

// Update payment settings (admin only)
const updatePaymentSettings = async (req, res) => {
  try {
    const { qr_code, instructions, account_name, account_number } = req.body;

    const updates = [
      { key: 'payment_qr_code', value: qr_code },
      { key: 'payment_instructions', value: instructions },
      { key: 'payment_account_name', value: account_name },
      { key: 'payment_account_number', value: account_number }
    ];

    for (const update of updates) {
      if (update.value !== undefined) {
        // First try to update existing setting
        const updateResult = await pool.query(
          `UPDATE system_settings 
           SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE setting_key = $2
           RETURNING id`,
          [update.value, update.key]
        );
        
        // If no row was updated, insert it
        if (updateResult.rows.length === 0) {
          await pool.query(
            `INSERT INTO system_settings (setting_key, setting_value, description)
             VALUES ($1, $2, $3)`,
            [update.key, update.value, `Payment setting: ${update.key}`]
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment settings updated successfully'
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending payments (bookings with receipt uploaded but not yet confirmed)
const getPendingPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, 
              u.first_name, u.last_name, u.email,
              s.name as service_name, s.duration_minutes, s.price
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN services s ON b.service_id = s.id
       WHERE b.status = 'pending' AND b.payment_receipt_url IS NOT NULL
       ORDER BY b.payment_receipt_uploaded_at ASC`
    );

    res.json({
      success: true,
      bookings: result.rows
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get patient profile by email
const getPatientProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);

    // Get user info
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.created_at,
              pp.phone_number, pp.date_of_birth, pp.gender, pp.address,
              pp.medical_conditions, pp.allergies, pp.blood_type
       FROM users u
       LEFT JOIN patient_profiles pp ON u.id = pp.user_id
       WHERE u.email = $1`,
      [decodedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patient = userResult.rows[0];

    // Get booking history
    const bookingsResult = await pool.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.status, b.business_status, b.amount_paid, b.appointment_type,
              b.cancelled_by_type, b.cancelled_at,
              b.completed_at,
              s.name as service_name,
              completed_admin.full_name as completed_by_name,
              cancelled_admin.full_name as cancelled_by_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN admin_users completed_admin ON b.completed_by = completed_admin.id
       LEFT JOIN admin_users cancelled_admin ON b.cancelled_by_admin_id = cancelled_admin.id
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC, b.booking_time DESC
       LIMIT 20`,
      [patient.id]
    );

    res.json({
      success: true,
      patient: {
        ...patient,
        bookings: bookingsResult.rows
      }
    });
  } catch (error) {
    console.error('Get patient profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  getServices,
  createService,
  updateService,
  deleteService,
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  getBookings,
  updateBookingStatus,
  updateBookingBusinessStatus,
  getPaymentSettings,
  updatePaymentSettings,
  getPendingPayments,
  getPatientProfile,
  getAllUsers,
  getAuditLogs,
  createAuditLog,
  getOrders,
  updateOrderStatus,
  verifyPayment,
  deleteUser
};

// Get all users (patients) with pagination and search
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      queryParams
    );

    // Create a copy for the main query with limit/offset
    const mainQueryParams = [...queryParams];
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    mainQueryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_verified, u.created_at, u.updated_at,
              pp.phone_number, pp.date_of_birth, pp.gender,
              (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) as booking_count,
              (SELECT MAX(b.booking_date) FROM bookings b WHERE b.user_id = u.id) as last_booking
       FROM users u
       LEFT JOIN patient_profiles pp ON u.id = pp.user_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      mainQueryParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_records: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get audit logs with pagination and filters
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, resource_type, admin_id, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (action) {
      whereConditions.push(`al.action ILIKE $${paramIndex++}`);
      queryParams.push(`%${action}%`);
    }

    if (resource_type) {
      whereConditions.push(`al.resource_type = $${paramIndex++}`);
      queryParams.push(resource_type);
    }

    if (admin_id) {
      whereConditions.push(`al.admin_id = $${paramIndex++}`);
      queryParams.push(admin_id);
    }

    if (date_from) {
      whereConditions.push(`al.created_at >= $${paramIndex++}`);
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push(`al.created_at <= $${paramIndex++}`);
      queryParams.push(date_to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM admin_audit_log al ${whereClause}`,
      queryParams
    );

    // Create a copy for the main query with limit/offset
    const mainQueryParams = [...queryParams];
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    mainQueryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT al.*, 
              au.full_name as admin_name, au.email as admin_email
       FROM admin_audit_log al
       LEFT JOIN admin_users au ON al.admin_id = au.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      mainQueryParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_records: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create audit log entry (for internal use)
const createAuditLog = async (adminId, action, resourceType, resourceId, oldValues = null, newValues = null) => {
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

// Get all shop orders for admin
const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_verified } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`so.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (payment_verified !== undefined) {
      whereConditions.push(`so.payment_verified = $${paramIndex++}`);
      queryParams.push(payment_verified === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM shop_orders so ${whereClause}`,
      queryParams
    );

    const mainQueryParams = [...queryParams];
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    mainQueryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT so.*, 
              u.email, u.first_name, u.last_name,
              au.full_name as verified_by_name,
              (SELECT COUNT(*) FROM shop_order_items soi WHERE soi.order_id = so.id) as item_count,
              (SELECT json_agg(json_build_object(
                'id', soi.id,
                'shop_item_id', soi.shop_item_id,
                'variant_id', soi.variant_id,
                'quantity', soi.quantity,
                'price_at_purchase', soi.price_at_purchase,
                'item_name', si.name,
                'variant_name', siv.name
              )) FROM shop_order_items soi
              LEFT JOIN shop_items si ON soi.shop_item_id = si.id
              LEFT JOIN shop_item_variants siv ON soi.variant_id = siv.id
              WHERE soi.order_id = so.id
              ) as items
       FROM shop_orders so
       JOIN users u ON so.user_id = u.id
       LEFT JOIN admin_users au ON so.payment_verified_by = au.id
       ${whereClause}
       ORDER BY so.created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      mainQueryParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_records: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.admin.adminId;

    // Get old status for audit log
    const oldResult = await pool.query('SELECT status FROM shop_orders WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const oldStatus = oldResult.rows[0].status;

    // Update status
    const result = await pool.query(
      `UPDATE shop_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // Log the action
    await createAuditLog(adminId, `Updated order status from ${oldStatus} to ${status}`, 'shop_orders', id, { status: oldStatus }, { status });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify payment for an order
const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_verified } = req.body;
    const adminId = req.admin.adminId;

    // Get old verification status for audit log
    const oldResult = await pool.query('SELECT payment_verified FROM shop_orders WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const oldVerified = oldResult.rows[0].payment_verified;

    // Update payment verification — payment_verified_by stores admin_users.id (no FK constraint after migration 023)
    const result = await pool.query(
      `UPDATE shop_orders 
       SET payment_verified = $1, 
           payment_verified_by = $2, 
           payment_verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 
       RETURNING *`,
      [payment_verified, adminId, id]
    );

    // Log the action
    await createAuditLog(adminId, payment_verified ? 'Verified order payment' : 'Unverified order payment', 'shop_orders', id, { payment_verified: oldVerified }, { payment_verified });

    res.json({
      success: true,
      message: payment_verified ? 'Payment verified successfully' : 'Payment verification removed',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    // If FK constraint still exists (migration not yet run), retry without payment_verified_by
    if (error.code === '23503') {
      try {
        const { id } = req.params;
        const { payment_verified } = req.body;
        const result = await pool.query(
          `UPDATE shop_orders 
           SET payment_verified = $1, 
               payment_verified_at = NOW(),
               updated_at = NOW()
           WHERE id = $2 
           RETURNING *`,
          [payment_verified, id]
        );
        return res.json({
          success: true,
          message: payment_verified ? 'Payment verified successfully' : 'Payment verification removed',
          order: result.rows[0]
        });
      } catch (retryErr) {
        console.error('Retry verify payment error:', retryErr);
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (hard delete)
const deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const adminId = req.admin.adminId;

    await client.query('BEGIN');

    // Get user info before deletion for audit log
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userResult.rows[0];

    // Delete user (CASCADE will handle related records)
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    // Log the action
    await createAuditLog(adminId, 'Deleted user', 'users', id, { email: user.email, first_name: user.first_name, last_name: user.last_name }, null);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'User deleted successfully. User can create a new account with the same email.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};