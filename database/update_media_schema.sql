
-- Media Library Table for VOD Content
CREATE TABLE IF NOT EXISTS media_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Movie', -- Movie, Series, Episode
  cover_url TEXT,
  stream_url TEXT NOT NULL,
  release_year INTEGER,
  genre TEXT,
  rating DECIMAL(3, 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view media" ON media_library;
CREATE POLICY "Public can view media" ON media_library FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage media" ON media_library;
CREATE POLICY "Admins can manage media" ON media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
