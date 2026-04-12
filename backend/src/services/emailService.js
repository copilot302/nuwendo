import { Resend } from 'resend';
import pool from '../config/database.js';

// Initialize Resend
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const getEmailFrom = () => {
  // Prefer explicit env configuration
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }

  // Production-safe fallback for Nuwendo
  return 'noreply@nuwendo.com';
};

const formatDateTimeForEmail = (bookingDate, bookingTime) => {
  try {
    const datePart = bookingDate instanceof Date
      ? bookingDate.toISOString().split('T')[0]
      : String(bookingDate).split('T')[0];

    const timePart = bookingTime ? String(bookingTime).substring(0, 8) : '00:00:00';
    const date = new Date(`${datePart}T${timePart}`);

    if (Number.isNaN(date.getTime())) {
      return `${datePart} ${timePart}`;
    }

    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return `${bookingDate || ''} ${bookingTime || ''}`.trim();
  }
};

const formatCurrencyPhp = (value) => {
  try {
    const amount = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `₱${value ?? 0}`;
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatReadableStatus = (value) => {
  if (!value) return 'N/A';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildTransactionReference = (orderId, createdAt) => {
  const date = new Date(createdAt || new Date());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const paddedId = String(orderId).padStart(6, '0');
  return `TXN-${y}${m}${d}-${paddedId}`;
};

const sendNotificationEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn(`⚠️ Email service not configured. Skipping notification email to: ${to}`);
    return { success: false, skipped: true, reason: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject,
      html
    });

    if (error) {
      console.error('❌ Notification email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Notification email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const parseEmailList = (rawValue) => {
  if (!rawValue) return [];

  return String(rawValue)
    .split(/[;,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeAdminRecipient = (email) => {
  const normalized = String(email || '').trim();
  if (!normalized) return '';

  if (normalized.toLowerCase() === 'nuwendomc@gmail.com') {
    return 'nuwendoph@gmail.com';
  }

  return normalized;
};

const resolveAdminNotificationRecipients = async () => {
  const envRecipients = [
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAILS),
    ...parseEmailList(process.env.ADMIN_EMAIL)
  ]
    .map(normalizeAdminRecipient)
    .filter(Boolean);

  if (envRecipients.length > 0) {
    return Array.from(new Set(envRecipients));
  }

  try {
    const adminResult = await pool.query(
      `SELECT email
       FROM admin_users
       WHERE is_active = true
         AND email IS NOT NULL
         AND email <> ''`
    );

    const dbRecipients = adminResult.rows
      .map((row) => normalizeAdminRecipient(row.email))
      .filter(Boolean);

    return Array.from(new Set(dbRecipients));
  } catch (error) {
    console.warn('⚠️ Unable to resolve admin notification recipients:', error.message);
    return [];
  }
};

const buildDetailRows = (details = {}) => {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `
      <p style="margin: 0 0 6px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>
    `)
    .join('');
};

export const sendAdminAlertEmail = async ({
  subject,
  title,
  body,
  details = {},
  ctaLabel,
  ctaUrl
}) => {
  const recipients = await resolveAdminNotificationRecipients();

  if (recipients.length === 0) {
    console.warn('⚠️ No admin notification recipients configured. Skipping admin alert email.');
    return { success: false, skipped: true, reason: 'No admin notification recipients configured' };
  }

  const detailRows = buildDetailRows(details);

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 22px;">${escapeHtml(title || 'Nuwendo Admin Alert')}</h2>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0;">${escapeHtml(body || 'A new event requires admin review.')}</p>
            ${detailRows ? `
              <div style="margin: 16px 0; padding: 14px; border-radius: 10px; background: #f3f4f6;">
                ${detailRows}
              </div>
            ` : ''}
            ${ctaLabel && ctaUrl ? `
              <p style="margin: 20px 0 0 0;">
                <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">${escapeHtml(ctaLabel)}</a>
              </p>
            ` : ''}
          </div>
        </div>
      </body>
    </html>
  `;

  return sendNotificationEmail({
    to: recipients,
    subject: subject || 'Nuwendo Admin Alert',
    html
  });
};

// Generate 6-digit verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, code) => {
  if (!resend) {
    console.error('❌ Resend API key not configured');
    throw new Error('Email service not configured');
  }

  try {
    console.log('📧 Sending verification email via Resend to:', email);
    
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: 'Verify Your Nuwendo Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Nuwendo</h1>
              <p style="margin: 10px 0 0 0;">Verify Your Email Address</p>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>Thank you for signing up with Nuwendo. To complete your registration, please use the verification code below:</p>
              
              <div class="code-box">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Your Verification Code</p>
                <div class="code">${code}</div>
              </div>
              
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p>If you didn't request this code, please ignore this email.</p>
              
              <div class="footer">
                <p>© 2026 Nuwendo. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Email sent successfully via Resend, ID:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw new Error('Failed to send verification email: ' + error.message);
  }
};

// Send password reset email (for future use)
export const sendPasswordResetEmail = async (email, resetLink) => {
  if (!resend) {
    console.error('❌ Resend API key not configured');
    throw new Error('Email service not configured');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: 'Reset Your Nuwendo Password',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to set a new password:</p>
            <p><a href="${resetLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw new Error('Failed to send password reset email: ' + error.message);
  }
};

export const sendBookingLifecycleEmail = async ({
  to,
  firstName,
  bookingId,
  serviceName,
  bookingDate,
  bookingTime,
  appointmentType,
  eventType,
  status,
  businessStatus,
  meetingLink,
  reason,
  oldDate,
  oldTime,
  newDate,
  newTime
}) => {
  const displayName = firstName || 'Patient';
  const when = formatDateTimeForEmail(bookingDate, bookingTime);
  const oldWhen = oldDate && oldTime ? formatDateTimeForEmail(oldDate, oldTime) : null;
  const newWhen = newDate && newTime ? formatDateTimeForEmail(newDate, newTime) : null;

  const eventMap = {
    approved: {
      subject: 'Your Nuwendo booking has been approved',
      title: 'Booking Approved ✅',
      body: `Your booking for <strong>${serviceName}</strong> is now confirmed for <strong>${when}</strong>.`
    },
    cancelled: {
      subject: 'Your Nuwendo booking has been cancelled',
      title: 'Booking Cancelled',
      body: `Your booking for <strong>${serviceName}</strong> scheduled on <strong>${when}</strong> has been cancelled.`
    },
    rescheduled: {
      subject: 'Your Nuwendo booking has been rescheduled',
      title: 'Booking Rescheduled 🔄',
      body: `Your booking for <strong>${serviceName}</strong> has been moved${oldWhen ? ` from <strong>${oldWhen}</strong>` : ''} to <strong>${newWhen || when}</strong>.`
    },
    completed: {
      subject: 'Your Nuwendo appointment is marked completed',
      title: 'Appointment Completed ✅',
      body: `Your appointment for <strong>${serviceName}</strong> at <strong>${when}</strong> has been marked as completed.`
    },
    no_show: {
      subject: 'Update on your Nuwendo appointment status',
      title: 'Appointment Marked as No Show',
      body: `Your appointment for <strong>${serviceName}</strong> at <strong>${when}</strong> has been marked as no show.`
    }
  };

  const selected = eventMap[eventType] || eventMap.approved;
  const bookingReference = bookingId ? `BK-${String(bookingId).padStart(6, '0')}` : 'N/A';
  const currentStatus = formatReadableStatus(status || eventType);
  const currentBusinessStatus = formatReadableStatus(businessStatus);

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 22px;">${selected.title}</h2>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Hi ${displayName},</p>
            <p>${selected.body}</p>
            <div style="margin: 16px 0; padding: 14px; border-radius: 10px; background: #f3f4f6;">
              <p style="margin: 0 0 6px 0;"><strong>Booking Reference:</strong> ${bookingReference}</p>
              <p style="margin: 0 0 6px 0;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 0 0 6px 0;"><strong>Appointment Type:</strong> ${appointmentType || 'N/A'}</p>
              <p style="margin: 0 0 6px 0;"><strong>Date & Time:</strong> ${newWhen || when}</p>
              <p style="margin: 0 0 6px 0;"><strong>Status:</strong> ${currentStatus}</p>
              <p style="margin: 0;"><strong>Appointment Lifecycle:</strong> ${currentBusinessStatus}</p>
            </div>
            ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank" rel="noopener noreferrer">${meetingLink}</a></p>` : ''}
            ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
            <p style="margin-bottom: 0; color: #6b7280;">If you have questions, please contact Nuwendo support.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendNotificationEmail({
    to,
    subject: selected.subject,
    html
  });
};

export const sendOrderLifecycleEmail = async ({
  to,
  firstName,
  orderId,
  createdAt,
  eventType,
  status,
  paymentVerified,
  totalAmount,
  items = [],
  recipientName,
  recipientPhone,
  deliveryAddress,
  paymentReceiptUrl
}) => {
  const displayName = firstName || 'Customer';
  const transactionRef = buildTransactionReference(orderId, createdAt);

  let subject = `Update for your Nuwendo order ${transactionRef}`;
  let title = 'Order Update';
  let body = `There is an update for your order <strong>${transactionRef}</strong>.`;

  if (eventType === 'payment_verified') {
    subject = `Payment approved for ${transactionRef}`;
    title = 'Payment Approved ✅';
    body = `Your payment for order <strong>${transactionRef}</strong> has been approved by our admin team.`;
  } else if (status === 'cancelled') {
    subject = `Order ${transactionRef} has been cancelled`;
    title = 'Order Cancelled';
    body = `Your order <strong>${transactionRef}</strong> has been cancelled.`;
  } else if (status) {
    subject = `Order ${transactionRef} status: ${status}`;
    title = `Order Status Updated: ${status}`;
    body = `Your order <strong>${transactionRef}</strong> status is now <strong>${status}</strong>.`;
  } else if (paymentVerified === true) {
    // Backward-compatible fallback when legacy callers only pass paymentVerified.
    subject = `Payment approved for ${transactionRef}`;
    title = 'Payment Approved ✅';
    body = `Your payment for order <strong>${transactionRef}</strong> has been approved by our admin team.`;
  }

  const normalizedItems = Array.isArray(items) ? items : [];
  const itemRows = normalizedItems.length
    ? normalizedItems.map((item) => {
      const quantity = Number(item?.quantity || 0);
      const unitPrice = Number(item?.price_at_purchase || 0);
      const lineTotal = quantity * unitPrice;
      const itemName = escapeHtml(item?.item_name || 'Item');
      const variantName = item?.variant_name ? ` (${escapeHtml(item.variant_name)})` : '';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${itemName}${variantName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrencyPhp(unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrencyPhp(lineTotal)}</td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="4" style="padding: 10px; color: #6b7280; text-align: center;">No item details available for this update.</td></tr>';

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 22px;">${title}</h2>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Hi ${displayName},</p>
            <p>${body}</p>
            <div style="margin: 16px 0; padding: 14px; border-radius: 10px; background: #f3f4f6;">
              <p style="margin: 0 0 6px 0;"><strong>Transaction Reference:</strong> ${transactionRef}</p>
              <p style="margin: 0 0 6px 0;"><strong>Order Status:</strong> ${formatReadableStatus(status || 'pending')}</p>
              <p style="margin: 0 0 6px 0;"><strong>Payment Verification:</strong> ${paymentVerified === true ? 'Verified' : 'Pending/Not Verified'}</p>
              ${typeof totalAmount !== 'undefined' ? `<p style="margin: 0;"><strong>Total:</strong> ${formatCurrencyPhp(totalAmount)}</p>` : ''}
            </div>
            <div style="margin: 16px 0; padding: 14px; border-radius: 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0;"><strong>Delivery Details</strong></p>
              <p style="margin: 0 0 4px 0;"><strong>Recipient:</strong> ${escapeHtml(recipientName || displayName)}</p>
              <p style="margin: 0 0 4px 0;"><strong>Phone:</strong> ${escapeHtml(recipientPhone || 'N/A')}</p>
              <p style="margin: 0;"><strong>Address:</strong> ${escapeHtml(deliveryAddress || 'N/A')}</p>
            </div>
            <div style="margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Items Ordered</strong></p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; font-size: 14px;">
                <thead style="background: #f3f4f6;">
                  <tr>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Item</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">Qty</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Unit Price</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </div>
            ${paymentReceiptUrl ? `<p><strong>Payment Receipt:</strong> <a href="${paymentReceiptUrl}" target="_blank" rel="noopener noreferrer">View uploaded receipt</a></p>` : ''}
            <p style="margin-bottom: 0; color: #6b7280;">Thank you for shopping with Nuwendo.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendNotificationEmail({
    to,
    subject,
    html
  });
};
