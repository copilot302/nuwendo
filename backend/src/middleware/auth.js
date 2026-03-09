import jwt from 'jsonwebtoken';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Reuse pool config from database.js
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nuwendo_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

export const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No authentication token, access denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

// Flexible auth: tries token first, falls back to email query param
export const flexibleAuthMiddleware = async (req, res, next) => {
  try {
    // Try token auth first
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        return next();
      } catch (e) {
        // Token invalid, try email fallback
      }
    }

    // Fallback: email from query or body
    const email = req.query.email || req.body?.email;
    if (email) {
      const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        req.user = { userId: result.rows[0].id, email: result.rows[0].email };
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      message: 'No authentication token, access denied'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
