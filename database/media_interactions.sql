
-- Add interaction columns to media_library
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE media_library ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Table for User Media Playlists
CREATE TABLE IF NOT EXISTS user_media_playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for items in the playlists
CREATE TABLE IF NOT EXISTS playlist_media_items (
  playlist_id UUID REFERENCES user_media_playlists ON DELETE CASCADE,
  media_id UUID REFERENCES media_library ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, media_id)
);

-- Enable RLS
ALTER TABLE user_media_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_media_items ENABLE ROW LEVEL SECURITY;

-- Policies for playlists
DROP POLICY IF EXISTS "Users can manage their own media playlists" ON user_media_playlists;
CREATE POLICY "Users can manage their own media playlists" ON user_media_playlists 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view public playlists" ON user_media_playlists;
CREATE POLICY "Public can view public playlists" ON user_media_playlists 
  FOR SELECT USING (is_public = true);

-- Policies for items
DROP POLICY IF EXISTS "Users can manage their own playlist items" ON playlist_media_items;
CREATE POLICY "Users can manage their own playlist items" ON playlist_media_items 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_media_playlists WHERE id = playlist_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Public can view public playlist items" ON playlist_media_items;
CREATE POLICY "Public can view public playlist items" ON playlist_media_items 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_media_playlists WHERE id = playlist_id AND is_public = true)
  );

-- Function to increment counters
CREATE OR REPLACE FUNCTION increment_media_counter(media_id UUID, counter_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF counter_name = 'views' THEN
    UPDATE media_library SET views_count = views_count + 1 WHERE id = media_id;
  ELSIF counter_name = 'likes' THEN
    UPDATE media_library SET likes_count = likes_count + 1 WHERE id = media_id;
  ELSIF counter_name = 'dislikes' THEN
    UPDATE media_library SET dislikes_count = dislikes_count + 1 WHERE id = media_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
