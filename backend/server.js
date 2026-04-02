// Nuwendo Healthcare Backend API
// Updated with regional address system
import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/auth.js';
import patientRoutes from './src/routes/patient.js';
import bookingRoutes from './src/routes/booking.js';
import adminAuthRoutes from './src/routes/adminAuth.js';
import adminRoutes from './src/routes/admin.js';
import servicesRoutes from './src/routes/services.js';
import availabilityRoutes from './src/routes/availability.js';
import googleAuthRoutes from './src/routes/googleAuth.js';
import shopRoutes from './src/routes/shop.js';
import patientShopRoutes from './src/routes/patientShop.js';
import rescheduleRoutes from './src/routes/reschedule.js';
import cartRoutes from './src/routes/cart.js';
import addressesRoutes from './src/routes/addresses.js';
import uploadRoutes from './src/routes/upload.js';
import pool from './src/config/database.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check and run migrations if needed
const checkAndMigrate = async () => {
  try {
    const shouldAutoMigrate = process.env.AUTO_MIGRATE === 'true';

    // Check if admin_users table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      );
    `);
    
    if (!result.rows[0].exists) {
      console.log('\n⚠️  Database tables not found. Running migrations...\n');

      if (!shouldAutoMigrate) {
        console.warn('⚠️  AUTO_MIGRATE is disabled. Skipping migrations at startup.');
        return;
      }

      const migrationCwd = './database';
      if (!fs.existsSync(migrationCwd)) {
        console.warn(`⚠️  Migration directory not found (${migrationCwd}). Skipping startup migrations.`);
        return;
      }
      
      return new Promise((resolve) => {
        const proc = spawn('npm', ['run', 'migrate'], {
          cwd: migrationCwd,
          stdio: 'inherit',
          shell: true
        });

        proc.on('error', (err) => {
          console.error('❌ Failed to start migration process:', err.message);
          resolve();
        });
        
        proc.on('close', (code) => {
          if (code !== 0) {
            console.error('\n❌ Migrations failed. Continuing anyway...\n');
          } else {
            console.log('\n✅ Migrations completed successfully\n');
          }
          resolve();
        });
      });
    } else {
      console.log('✓ Database tables exist');
    }
  } catch (error) {
    console.error('Migration check error:', error.message);
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const defaultAllowedOrigins = [
  'https://app.nuwendo.com',
  'https://www.app.nuwendo.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const envAllowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || isLocalDevOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Nuwendo API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*'
    }
  });
});

// Simple ping endpoint for external health checks
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// Basic health check without database
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'nuwendo-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  try {
    // Check database connection with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 4000)
    );
    
    const queryPromise = pool.query('SELECT NOW()');
    
    await Promise.race([queryPromise, timeoutPromise]);
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'Connected'
    });
  } catch (error) {
    console.error('Health check database error:', error.message);
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/reschedule', rescheduleRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shop', patientShopRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/oauth', googleAuthRoutes); // Google OAuth routes

// Serve uploads directory as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`✓ Server is running on ${HOST}:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ CORS Origin: ${process.env.CORS_ORIGIN || 'https://app.nuwendo.com'}`);
  console.log(`✓ Server ready to accept connections`);

  // Run migration check in background so startup is never blocked
  checkAndMigrate().catch((error) => {
    console.error('Background migration check failed:', error?.message || error);
  });
});
