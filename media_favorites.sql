
-- Table for user media favorites
CREATE TABLE IF NOT EXISTS user_media_favorites (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  media_id UUID REFERENCES media_library ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, media_id)
);

-- Enable RLS
ALTER TABLE user_media_favorites ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own media favorites" ON user_media_favorites;
CREATE POLICY "Users can manage their own media favorites" ON user_media_favorites 
  FOR ALL USING (auth.uid() = user_id);
