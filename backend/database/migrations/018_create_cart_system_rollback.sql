-- Rollback Migration 018: Drop shopping cart system

-- Remove variant_id column from shop_order_items
ALTER TABLE shop_order_items DROP COLUMN IF EXISTS variant_id;

-- Drop cart_items table
DROP TABLE IF EXISTS cart_items;
