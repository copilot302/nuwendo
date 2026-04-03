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
import { migrate as runMigrations } from './database/migrate.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runEssentialSeeds = async () => {
  console.log('🌱 Running essential seed checks...');

  // Seed services when empty
  const servicesTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'services'
    ) AS exists
  `);

  if (servicesTable.rows[0].exists) {
    const servicesCount = await pool.query('SELECT COUNT(*)::int AS count FROM services');
    if (servicesCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO services (name, description, duration_minutes, price, category, is_active)
        VALUES
          ('Nuwendo Starter', 'Comprehensive Consultation + Laboratory Test Request + Nutrition Plan + Follow-up', 60, 3700.00, 'Services', true),
          ('Comprehensive Consultation', 'Complete health consultation with our metabolic specialist', 60, 2000.00, 'Services', true),
          ('Nutrition Plan', 'Personalized nutrition plan tailored to your metabolic needs', 60, 1500.00, 'Services', true),
          ('Follow-up', 'Follow-up consultation to track your progress', 30, 800.00, 'Services', true),
          ('Medical Certificate', 'Official medical certificate for various purposes', 15, 500.00, 'Services', true)
      `);
      console.log('✅ Seeded services');
    } else {
      console.log(`ℹ️ Services already present (${servicesCount.rows[0].count})`);
    }
  }

  // Seed working hours when empty
  const workingHoursTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'working_hours'
    ) AS exists
  `);

  if (workingHoursTable.rows[0].exists) {
    const workingHoursCount = await pool.query('SELECT COUNT(*)::int AS count FROM working_hours');
    if (workingHoursCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO working_hours (day_of_week, start_time, end_time, appointment_type, is_active)
        VALUES
          (0, '07:30:00', '17:30:00', 'online', true),
          (1, '07:30:00', '17:30:00', 'online', true),
          (2, '07:30:00', '17:30:00', 'online', true),
          (3, '09:00:00', '17:00:00', 'on-site', true),
          (4, '09:00:00', '17:00:00', 'on-site', true),
          (5, '09:00:00', '17:00:00', 'on-site', true),
          (6, '07:30:00', '17:30:00', 'online', true)
      `);
      console.log('✅ Seeded working hours');
    } else {
      console.log(`ℹ️ Working hours already present (${workingHoursCount.rows[0].count})`);
    }
  }

  // Seed availability windows when empty (new scheduling source)
  const availabilityWindowsTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'availability_windows'
    ) AS exists
  `);

  if (availabilityWindowsTable.rows[0].exists) {
    const availabilityCount = await pool.query('SELECT COUNT(*)::int AS count FROM availability_windows');
    if (availabilityCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO availability_windows (day_of_week, start_time, end_time, appointment_type, is_active, created_by, updated_by)
        VALUES
          (0, '07:30:00', '17:30:00', 'online', true, 1, 1),
          (1, '07:30:00', '17:30:00', 'online', true, 1, 1),
          (2, '07:30:00', '17:30:00', 'online', true, 1, 1),
          (3, '09:00:00', '17:00:00', 'on-site', true, 1, 1),
          (4, '09:00:00', '17:00:00', 'on-site', true, 1, 1),
          (5, '09:00:00', '17:00:00', 'on-site', true, 1, 1),
          (6, '07:30:00', '17:30:00', 'online', true, 1, 1)
      `);
      console.log('✅ Seeded availability windows');
    } else {
      console.log(`ℹ️ Availability windows already present (${availabilityCount.rows[0].count})`);
    }
  }

  // Seed basic shop catalog when empty
  const shopItemsTable = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'shop_items'
    ) AS exists
  `);

  if (shopItemsTable.rows[0].exists) {
    const shopItemsCount = await pool.query('SELECT COUNT(*)::int AS count FROM shop_items');
    if (shopItemsCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO shop_items (name, description, category, price, stock_quantity, is_active)
        VALUES
          ('Tirzepatide', 'GIP/GLP-1 receptor agonist for metabolic health and weight management.', 'Peptides', 0.00, 0, true),
          ('Semaglutide', 'GLP-1 receptor agonist for blood sugar control and weight management.', 'Peptides', 0.00, 0, true)
      `);

      await pool.query(`
        INSERT INTO shop_item_variants (shop_item_id, name, price, is_active, sort_order)
        SELECT id, '50mg', 15000.00, true, 1 FROM shop_items WHERE name = 'Tirzepatide'
        UNION ALL
        SELECT id, '30mg', 9000.00, true, 2 FROM shop_items WHERE name = 'Tirzepatide'
        UNION ALL
        SELECT id, 'Per Shot', 2500.00, true, 3 FROM shop_items WHERE name = 'Tirzepatide'
        UNION ALL
        SELECT id, '8mg', 9000.00, true, 1 FROM shop_items WHERE name = 'Semaglutide'
        UNION ALL
        SELECT id, '16mg', 16000.00, true, 2 FROM shop_items WHERE name = 'Semaglutide'
        UNION ALL
        SELECT id, 'Per Shot', 2000.00, true, 3 FROM shop_items WHERE name = 'Semaglutide'
      `);

      console.log('✅ Seeded shop catalog');
    } else {
      console.log(`ℹ️ Shop items already present (${shopItemsCount.rows[0].count})`);
    }
  }

  console.log('✅ Essential seed checks complete');
};

// Check and run migrations if needed
const checkAndMigrate = async () => {
  try {
    const shouldAutoMigrate = process.env.AUTO_MIGRATE === 'true';
    let tablesReady = false;

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

      try {
        await runMigrations();
        tablesReady = true;
        console.log('\n✅ Migrations completed successfully\n');
      } catch (migrationError) {
        console.error('\n❌ Migrations failed. Continuing anyway...\n');
        console.error('Migration error:', migrationError?.message || migrationError);
      }
    } else {
      console.log('✓ Database tables exist');
      tablesReady = true;
    }

    if (tablesReady) {
      await runEssentialSeeds();
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

// Start server after migration check to avoid race conditions on first requests
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await checkAndMigrate();
  } catch (error) {
    console.error('Startup migration check failed:', error?.message || error);
  }

  app.listen(PORT, HOST, () => {
    console.log(`✓ Server is running on ${HOST}:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ CORS Origin: ${process.env.CORS_ORIGIN || 'https://app.nuwendo.com'}`);
    console.log(`✓ Server ready to accept connections`);
  });
};

startServer();
