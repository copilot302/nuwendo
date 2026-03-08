import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../config/database.js';
import { generateVerificationCode, sendVerificationEmail } from '../services/emailService.js';

// Generate JWT Token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Step 1: Send verification code to email
export const sendVerificationCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Check if user already exists and is verified (patient account)
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_verified = true',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'An account with this email already exists. Please log in instead.',
        shouldLogin: true
      });
    }

    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if email already has a pending verification
    const pendingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (pendingUser.rows.length > 0) {
      // Update existing record
      await pool.query(
        `UPDATE users 
         SET verification_code = $1, verification_code_expires = $2 
         WHERE email = $3`,
        [code, expiresAt, email]
      );
    } else {
      // Create new pending user
      await pool.query(
        `INSERT INTO users (email, verification_code, verification_code_expires) 
         VALUES ($1, $2, $3)`,
        [email, code, expiresAt]
      );
    }

    // Send verification email
    let emailSent = false;
    try {
      await sendVerificationEmail(email, code);
      emailSent = true;
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      console.log('⚠️ Code will be returned in response as fallback');
      console.log(`📧 VERIFICATION CODE for ${email}: ${code}`);
    }

    res.json({
      success: true,
      message: emailSent 
        ? 'Verification code sent to your email'
        : 'Email service temporarily unavailable. Code provided in response.',
      data: {
        email,
        expiresIn: 600, // seconds
        code: !emailSent ? code : undefined // Only return code if email fails
      }
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      success: false,
      message: 'Server error sending verification code',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Step 2: Verify code
export const verifyCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, code } = req.body;

    // Find user with matching email and code
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE email = $1 AND verification_code = $2`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    const user = result.rows[0];

    // Check if code expired
    if (new Date() > new Date(user.verification_code_expires)) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification code has expired. Please request a new one.' 
      });
    }

    // Mark user as verified (for patients who don't need passwords)
    await pool.query(
      `UPDATE users 
       SET is_verified = true, 
           verification_code = NULL, 
           verification_code_expires = NULL 
       WHERE id = $1`,
      [user.id]
    );

    // Issue a JWT so the session is fully authenticated from this point onward
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Code verified successfully',
      data: {
        email: user.email,
        token
      }
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error verifying code' 
    });
  }
};

// Step 3: Complete registration with password
export const completeRegistration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, code, password, firstName, lastName } = req.body;

    // Verify code again
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE email = $1 AND verification_code = $2`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    const user = result.rows[0];

    // Check if code expired
    if (new Date() > new Date(user.verification_code_expires)) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification code has expired' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update user with password and mark as verified
    const updatedUser = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           first_name = $2, 
           last_name = $3, 
           is_verified = TRUE,
           verification_code = NULL,
           verification_code_expires = NULL
       WHERE id = $4
       RETURNING id, email, first_name, last_name, created_at`,
      [passwordHash, firstName, lastName, user.id]
    );

    const completedUser = updatedUser.rows[0];

    // Generate token
    const token = generateToken(completedUser.id, completedUser.email);

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        token,
        user: {
          id: completedUser.id,
          email: completedUser.email,
          firstName: completedUser.first_name,
          lastName: completedUser.last_name,
          createdAt: completedUser.created_at
        }
      }
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error completing registration' 
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isVerified: user.is_verified,
          lastLogin: user.last_login
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, is_verified, created_at, last_login 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching profile' 
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2 
       WHERE id = $3 
       RETURNING id, email, first_name, last_name`,
      [firstName, lastName, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating profile' 
    });
  }
};

// Patient Login - Send verification code for existing user
export const patientLoginSendCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Check if this email belongs to an admin
    const adminCheck = await pool.query(
      'SELECT id FROM admin_users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (adminCheck.rows.length > 0) {
      return res.status(200).json({ 
        success: true,
        isAdmin: true,
        message: 'Admin account detected. Please use password to login.' 
      });
    }

    // Check if user exists and is verified
    const userResult = await pool.query(
      'SELECT id, email, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No account found with this email. Please sign up first.' 
      });
    }

    const user = userResult.rows[0];

    if (!user.is_verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Account not verified. Please complete the signup process.' 
      });
    }

    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new verification code
    await pool.query(
      `UPDATE users 
       SET verification_code = $1, verification_code_expires = $2 
       WHERE email = $3`,
      [code, expiresAt, email]
    );

    // Send verification email
    let emailSent = false;
    try {
      await sendVerificationEmail(email, code);
      emailSent = true;
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      console.log('⚠️ Code will be returned in response as fallback');
      console.log(`📧 VERIFICATION CODE for ${email}: ${code}`);
    }

    res.json({
      success: true,
      isAdmin: false,
      message: emailSent 
        ? 'Verification code sent to your email'
        : 'Email service temporarily unavailable. Code provided in response.',
      data: {
        email,
        expiresIn: 600, // seconds
        code: !emailSent ? code : undefined // Only return code if email fails
      }
    });
  } catch (error) {
    console.error('Patient login send code error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      success: false,
      message: 'Server error sending verification code',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin Login with Password (unified endpoint)
export const adminPasswordLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if admin exists
    const adminResult = await pool.query(
      'SELECT id, username, email, password_hash, full_name, role, is_active FROM admin_users WHERE email = $1',
      [email]
    );

    if (adminResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const admin = adminResult.rows[0];

    // Check if admin is active
    if (!admin.is_active) {
      return res.status(401).json({ 
        success: false,
        message: 'Admin account is inactive' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin.id, 
        username: admin.username,
        role: admin.role,
        email: admin.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Create session in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(
      `INSERT INTO admin_sessions (admin_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [admin.id, token, expiresAt]
    );

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.full_name,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during admin login' 
    });
  }
};

// Patient Login - Verify code and login
export const patientLoginVerifyCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, code } = req.body;

    // Find user with matching email and code
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, verification_code, verification_code_expires 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = result.rows[0];

    // Check if code matches
    if (user.verification_code !== code) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    // Check if code is expired
    if (new Date() > new Date(user.verification_code_expires)) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification code has expired. Please request a new one.' 
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      }
    });
  } catch (error) {
    console.error('Patient login verify code error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error verifying code' 
    });
  }
};
