
-- Update Media Library to support Series/Episodes
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES media_library(id) ON DELETE CASCADE;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS season_number INTEGER;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_media_parent ON media_library(parent_id);
