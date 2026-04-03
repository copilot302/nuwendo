import { Resend } from 'resend';

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
