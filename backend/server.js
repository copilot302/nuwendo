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
import pool from './src/config/database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://frontend-liart-six-87.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Simple ping endpoint for Railway health check
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
app.use('/api/oauth', googleAuthRoutes); // Google OAuth routes

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
});
