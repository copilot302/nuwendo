import express from 'express';
import { body, query } from 'express-validator';
import { adminAuth, requireRole } from '../middleware/adminAuth.js';
import {
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
  getOrders,
  updateOrderStatus,
  verifyPayment,
  deleteUser
} from '../controllers/adminController.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Users management
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('role').optional().isIn(['patient', 'admin']).withMessage('Invalid role')
], getAllUsers);

// Audit logs
router.get('/audit-logs', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('date_from').optional().isISO8601().withMessage('Invalid date format'),
  query('date_to').optional().isISO8601().withMessage('Invalid date format')
], getAuditLogs);

// Services management
router.get('/services', getServices);

router.post('/services', [
  body('name').notEmpty().withMessage('Service name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('duration_minutes').isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5-480 minutes'),
  body('price').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required')
], createService);

router.put('/services/:id', [
  body('name').notEmpty().withMessage('Service name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('duration_minutes').isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5-480 minutes'),
  body('price').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('is_active').isBoolean().withMessage('is_active must be boolean')
], updateService);

router.delete('/services/:id', requireRole(['super_admin']), deleteService);

// Time slots management
router.get('/time-slots', getTimeSlots);

router.post('/time-slots', [
  body('day_of_week').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:MM)')
], createTimeSlot);

router.put('/time-slots/:id', [
  body('day_of_week').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:MM)'),
  body('is_active').isBoolean().withMessage('is_active must be boolean')
], updateTimeSlot);

router.delete('/time-slots/:id', requireRole(['super_admin']), deleteTimeSlot);

// Bookings management
router.get('/bookings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('date_from').optional().isDate().withMessage('Invalid date format'),
  query('date_to').optional().isDate().withMessage('Invalid date format')
], getBookings);

router.patch('/bookings/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('video_call_link')
    .optional()
    .isString()
    .withMessage('video_call_link must be a string')
    .custom((value) => {
      try {
        const parsed = new URL(String(value).trim())
        return parsed.protocol === 'https:' && parsed.hostname === 'meet.google.com' && parsed.pathname !== '/'
      } catch {
        return false
      }
    })
    .withMessage('video_call_link must be a valid Google Meet URL (https://meet.google.com/...)')
], updateBookingStatus);

router.patch('/bookings/:id/business-status', [
  body('business_status').isIn(['scheduled', 'completed', 'cancelled', 'no_show']).withMessage('Invalid business status'),
  body('admin_notes').optional().isString().withMessage('Admin notes must be a string')
], updateBookingBusinessStatus);

// Payment settings management
router.get('/payment-settings', getPaymentSettings);

router.put('/payment-settings', [
  body('qr_code').optional(),
  body('instructions').optional(),
  body('account_name').optional(),
  body('account_number').optional()
], updatePaymentSettings);

// Pending payments (with receipts awaiting approval)
router.get('/pending-payments', getPendingPayments);

// Patient profile
router.get('/patients/:email', getPatientProfile);

// Shop orders management
router.get('/orders', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  query('payment_verified').optional().isBoolean().withMessage('payment_verified must be boolean')
], getOrders);

router.patch('/orders/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'shipped', 'delivered', 'received', 'cancelled']).withMessage('Invalid status')
], updateOrderStatus);

router.patch('/orders/:id/verify-payment', [
  body('payment_verified').isBoolean().withMessage('payment_verified must be boolean')
], verifyPayment);

// User deletion
router.delete('/users/:id', requireRole(['super_admin']), deleteUser);

export default router;