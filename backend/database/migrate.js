import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Database configuration
// Use DATABASE_URL if available, otherwise use individual vars (local)
const config = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: (process.env.DATABASE_URL.includes('sslmode=require') || process.env.NODE_ENV === 'production')
        ? { rejectUnauthorized: false }
        : false
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'nuwendo_db',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    };

// Create migrations table to track applied migrations
const createMigrationsTable = async (client) => {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await client.query(query);
  console.log('✓ Migrations table ready');
};

// Get list of applied migrations
const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT name FROM migrations ORDER BY name');
  return result.rows.map(row => row.name);
};

// Get list of migration files
const getMigrationFiles = () => {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir);
  
  // Filter for .sql files (excluding rollback files)
  return files
    .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
    .sort();
};

// Run a migration
const runMigration = async (client, filename) => {
  const filePath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`  Running: ${filename}`);
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed migration: ${filename}`);
    console.error(`  Error: ${error.message}`);
    throw error;
  }
};

// Rollback a migration
const rollbackMigration = async (client, filename) => {
  const rollbackFile = filename.replace('.sql', '_rollback.sql');
  const filePath = path.join(__dirname, 'migrations', rollbackFile);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Rollback file not found: ${rollbackFile}`);
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM migrations WHERE name = $1', [filename]);
    await client.query('COMMIT');
    console.log(`✓ Rolled back migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

// Main migration function
const migrate = async () => {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    await createMigrationsTable(client);
    
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationFiles = getMigrationFiles();
    
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations');
      return;
    }
    
    console.log(`\nRunning ${pendingMigrations.length} migration(s)...\n`);
    
    for (const migration of pendingMigrations) {
      await runMigration(client, migration);
    }
    
    console.log('\n✓ All migrations completed successfully!');
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
};

// Rollback last migration
const rollback = async () => {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    const appliedMigrations = await getAppliedMigrations(client);
    
    if (appliedMigrations.length === 0) {
      console.log('✓ No migrations to rollback');
      return;
    }
    
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    console.log(`\nRolling back: ${lastMigration}\n`);
    
    await rollbackMigration(client, lastMigration);
    
    console.log('\n✓ Rollback completed successfully!');
    
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

// CLI interface
const command = process.argv[2];

if (command === 'up' || !command) {
  migrate();
} else if (command === 'down') {
  rollback();
} else {
  console.log('Usage: node migrate.js [up|down]');
  console.log('  up (default) - Run pending migrations');
  console.log('  down         - Rollback last migration');
}
