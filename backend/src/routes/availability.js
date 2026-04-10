import express from 'express';
import pool from '../config/database.js';

const router = express.Router();
const CANONICAL_SCHEDULE_TYPE = 'on-site';

/**
 * Get which appointment types have working hours configured for a specific date.
 * Used by the booking UI to only show types that actually have slots available.
 */
router.get('/types', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required' });
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    // Use availability_windows as source of truth when it has canonical schedule data.
    const availabilityWindowsDataResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM availability_windows
       WHERE appointment_type = $1`,
      [CANONICAL_SCHEDULE_TYPE]
    );
    const hasAvailabilityWindowsData = availabilityWindowsDataResult.rows[0].total > 0;

    // Availability is now shared; if a day has active schedule, both types are selectable as preference.
    let result;
    if (hasAvailabilityWindowsData) {
      result = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM availability_windows
         WHERE day_of_week = $1 AND is_active = true AND appointment_type = $2`,
        [dayOfWeek, CANONICAL_SCHEDULE_TYPE]
      );
    } else {
      result = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM working_hours
         WHERE day_of_week = $1 AND is_active = true AND appointment_type = $2`,
        [dayOfWeek, CANONICAL_SCHEDULE_TYPE]
      );
    }

    const hasSchedule = result.rows[0].total > 0;

    res.json({
      success: true,
      date,
      dayOfWeek,
      availableTypes: hasSchedule ? ['online', 'on-site'] : []
    });
  } catch (error) {
    console.error('Error fetching availability types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability types' });
  }
});

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
};

// Helper function to convert minutes since midnight to time string
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Helper function to normalize time format (remove seconds if present)
const normalizeTime = (time) => {
  if (!time) return null;
  const parts = time.toString().split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

/**
 * Get available time slots for a specific date
 * 
 * This uses the dynamic availability window system:
 * 1. Get availability window for the day of week
 * 2. Get all existing bookings for that date
 * 3. Calculate valid start times where the service duration fits without overlap
 */
router.get('/', async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get service duration (required for proper slot calculation)
    let serviceDuration = 30; // Default 30 minutes
    if (serviceId) {
      const serviceResult = await pool.query(
        'SELECT duration_minutes FROM services WHERE id = $1',
        [serviceId]
      );
      if (serviceResult.rows.length > 0) {
        serviceDuration = serviceResult.rows[0].duration_minutes;
      }
    }
    
    // Get minimum advance hours setting from database (default 24)
    const settingsResult = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'min_advance_hours'`
    );
    const minAdvanceHours = settingsResult.rows.length > 0 
      ? parseInt(settingsResult.rows[0].setting_value) 
      : 24;
    
    // Check if requested date is at least minAdvanceHours in the future
    const requestedDate = new Date(date);
    const now = new Date();
    const minBookingDate = new Date(now.getTime() + (minAdvanceHours * 60 * 60 * 1000));
    
    if (requestedDate < minBookingDate) {
      return res.status(400).json({
        success: false,
        message: `Bookings must be made at least ${minAdvanceHours} hours in advance.`
      });
    }
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = requestedDate.getDay();

    // Use availability_windows as source of truth when it has canonical schedule data.
    const availabilityWindowsDataResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM availability_windows
       WHERE appointment_type = $1`,
      [CANONICAL_SCHEDULE_TYPE]
    );
    const hasAvailabilityWindowsData = availabilityWindowsDataResult.rows[0].total > 0;
    
    // Step 1: Get availability window for this day
    // First try new availability_windows table, fallback to working_hours
    let availabilityResult;
    if (hasAvailabilityWindowsData) {
      availabilityResult = await pool.query(
        `SELECT MIN(start_time) AS start_time, MAX(end_time) AS end_time
         FROM availability_windows 
         WHERE day_of_week = $1 
         AND is_active = true
         AND appointment_type = $2`,
        [dayOfWeek, CANONICAL_SCHEDULE_TYPE]
      );
    } else {
      availabilityResult = await pool.query(
        `SELECT MIN(start_time) AS start_time, MAX(end_time) AS end_time
         FROM working_hours 
         WHERE day_of_week = $1 
         AND is_active = true
         AND appointment_type = $2`,
        [dayOfWeek, CANONICAL_SCHEDULE_TYPE]
      );
    }
    
    // If no availability defined for this day, return empty
    if (!availabilityResult.rows[0]?.start_time || !availabilityResult.rows[0]?.end_time) {
      return res.json({
        success: true,
        date,
        dayOfWeek,
        serviceDuration,
        availableSlots: []
      });
    }
    
    const availability = availabilityResult.rows[0];
    const windowStart = timeToMinutes(normalizeTime(availability.start_time));
    const windowEnd = timeToMinutes(normalizeTime(availability.end_time));
    
    // Step 2: Get all existing bookings for this date
    const bookingsResult = await pool.query(
      `SELECT b.booking_time, b.end_time, s.duration_minutes
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.booking_date = $1 
       AND b.status NOT IN ('cancelled')`,
      [date]
    );
    
    // Convert bookings to time ranges (in minutes)
    const bookedRanges = bookingsResult.rows.map(row => {
      const startMinutes = timeToMinutes(normalizeTime(row.booking_time));
      // Use end_time if available, otherwise calculate from duration
      let endMinutes;
      if (row.end_time) {
        endMinutes = timeToMinutes(normalizeTime(row.end_time));
      } else {
        endMinutes = startMinutes + (row.duration_minutes || 30);
      }
      return { start: startMinutes, end: endMinutes };
    });
    
    // Step 3: Calculate valid start times
    // Base interval is always 15 minutes for maximum precision
    // All time calculations use 15-minute chunks to avoid wasted time
    
    const BASE_INTERVAL = 15; // Base unit: 15 minutes
    const allAvailableSlots = [];
    
    // Generate ALL possible 15-minute slots first
    for (let startMinutes = windowStart; startMinutes < windowEnd; startMinutes += BASE_INTERVAL) {
      const endMinutes = startMinutes + serviceDuration;
      
      // Check if the entire appointment fits within the availability window
      if (endMinutes > windowEnd) {
        continue; // This start time doesn't work - appointment would extend past availability
      }
      
      // Check if this slot overlaps with any existing booking
      let hasOverlap = false;
      for (const booking of bookedRanges) {
        // Overlap occurs if: new_start < existing_end AND new_end > existing_start
        if (startMinutes < booking.end && endMinutes > booking.start) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
        allAvailableSlots.push({
          start_time: minutesToTime(startMinutes),
          end_time: minutesToTime(endMinutes),
          startMinutes: startMinutes // Keep for display interval filtering
        });
      }
    }
    
    // Step 4: Filter slots for display based on service duration
    // Display interval adapts to service duration for better UX
    let displayInterval;
    if (serviceDuration <= 15) {
      displayInterval = 15; // Show every 15 minutes for 15-min services
    } else if (serviceDuration <= 30) {
      displayInterval = 30; // Show every 30 minutes for 30-min services
    } else {
      displayInterval = 30; // Show every 30 minutes for 60-min+ services
    }
    
    const availableSlots = allAvailableSlots.filter(slot => 
      slot.startMinutes % displayInterval === 0
    ).map(slot => ({
      start_time: slot.start_time,
      end_time: slot.end_time
    }));
    
    res.json({
      success: true,
      date,
      dayOfWeek,
      serviceDuration,
      availableSlots
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability'
    });
  }
});

export default router;
