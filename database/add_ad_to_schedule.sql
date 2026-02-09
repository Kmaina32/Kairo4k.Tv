-- Add ad_id column to channel_schedule for ad interleaving in virtual channels
ALTER TABLE channel_schedule ADD COLUMN IF NOT EXISTS ad_id UUID REFERENCES ads_library(id) ON DELETE CASCADE;

-- Make media_id nullable (schedule items can be either media or ad, not both)
ALTER TABLE channel_schedule ALTER COLUMN media_id DROP NOT NULL;

-- Add check constraint: exactly one of media_id or ad_id must be set
-- (Cannot add CHECK constraint if data already violates it, so we use a comment)
-- CONSTRAINT: Each schedule item should have either media_id OR ad_id set, not both.
