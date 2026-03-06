-- Migration 018: Create shopping cart system
-- Allow customers to add items to cart before checkout

CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_item_id INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES shop_item_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure unique combination of user + item + variant
    UNIQUE(user_id, shop_item_id, variant_id)
);

-- Add variant_id to shop_order_items to track which variant was purchased
ALTER TABLE shop_order_items 
ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES shop_item_variants(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_item_id ON cart_items(shop_item_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);

-- Create trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
