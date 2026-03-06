-- Migration 019: Add delivery address and payment fields to orders

-- Add delivery address columns to shop_orders
ALTER TABLE shop_orders 
ADD COLUMN IF NOT EXISTS delivery_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_barangay VARCHAR(200),
ADD COLUMN IF NOT EXISTS delivery_street_address TEXT,
ADD COLUMN IF NOT EXISTS use_default_address BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_qr_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_verified_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;

-- Add address editability to patient_profiles
ALTER TABLE patient_profiles
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS barangay VARCHAR(200),
ADD COLUMN IF NOT EXISTS street_address TEXT;

-- Create index for order payment verification
CREATE INDEX IF NOT EXISTS idx_shop_orders_payment_verified ON shop_orders(payment_verified);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status_payment ON shop_orders(status, payment_verified);
