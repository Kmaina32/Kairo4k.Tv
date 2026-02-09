
-- Add scheduled_start_time to virtual_channels for countdown support
ALTER TABLE virtual_channels ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMPTZ;
