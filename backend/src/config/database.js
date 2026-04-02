import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const normalizeDatabaseUrl = (rawValue) => {
  if (!rawValue) return null;
  // Handle accidental wrapping quotes/spaces from hosting panel copy-paste
  return String(rawValue).trim().replace(/^['\"]|['\"]$/g, '');
};

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

console.log('Database Configuration:');
console.log('- DATABASE_URL present:', !!normalizedDatabaseUrl);
if (normalizedDatabaseUrl) {
  try {
    // Log only the protocol and host, not the full URL with credentials
    const url = new URL(normalizedDatabaseUrl);
    console.log('- Database Host:', url.hostname);
    console.log('- Database Port:', url.port);
    console.log('- Database Name:', url.pathname.substring(1));
  } catch (error) {
    console.warn('- DATABASE_URL appears malformed. Will still attempt DB connection with provided value.');
    console.warn('- Parse warning:', error.message);
  }
}

// Support both DATABASE_URL and individual connection params
const shouldUseSsl = process.env.DB_SSL === 'false'
  ? false
  : (
      (normalizedDatabaseUrl && normalizedDatabaseUrl.includes('sslmode=require')) ||
      process.env.NODE_ENV === 'production'
    );

const pool = normalizedDatabaseUrl
  ? new Pool({
      connectionString: normalizedDatabaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'nuwendo_db',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    });

// Test database connection immediately
pool.connect()
  .then(client => {
    console.log('✓ Connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('✗ Failed to connect to PostgreSQL database:');
    console.error('  Error:', err.message);
    console.error('  Code:', err.code);
    if (err.code === 'ENOTFOUND') {
      console.error('  → Database host not found. Check DATABASE_URL.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  → Connection refused. Database might not be running.');
    } else if (err.code === '28P01') {
      console.error('  → Authentication failed. Check database credentials.');
    } else if (err.code === '3D000') {
      console.error('  → Database does not exist.');
    }
  });

// Handle connection pool errors
pool.on('error', (err) => {
  console.error('✗ Unexpected database pool error:', err);
});

export default pool;
