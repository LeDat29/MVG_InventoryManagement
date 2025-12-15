-- Ensure is_active exists and set active for existing rows
ALTER TABLE warehouse_zones ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status;
UPDATE warehouse_zones SET is_active = 1 WHERE is_active IS NULL OR is_active != 1;