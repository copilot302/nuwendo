-- Rollback Migration 019: Remove delivery address and payment fields

-- Remove indexes
DROP INDEX IF EXISTS idx_shop_orders_payment_verified;
DROP INDEX IF EXISTS idx_shop_orders_status_payment;

-- Remove columns from patient_profiles
ALTER TABLE patient_profiles
DROP COLUMN IF EXISTS province,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS barangay,
DROP COLUMN IF EXISTS street_address;

-- Remove columns from shop_orders
ALTER TABLE shop_orders
DROP COLUMN IF EXISTS delivery_province,
DROP COLUMN IF EXISTS delivery_city,
DROP COLUMN IF EXISTS delivery_barangay,
DROP COLUMN IF EXISTS delivery_street_address,
DROP COLUMN IF EXISTS use_default_address,
DROP COLUMN IF EXISTS payment_qr_reference,
DROP COLUMN IF EXISTS payment_verified,
DROP COLUMN IF EXISTS payment_verified_by,
DROP COLUMN IF EXISTS payment_verified_at;
