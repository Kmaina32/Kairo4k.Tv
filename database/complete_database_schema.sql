-- ═══════════════════════════════════════════════════════════════════════════
-- KAIRO 4K NEXUS - COMPLETE DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- This file contains all database schemas, tables, and policies for the
-- Kairo 4K Nexus streaming application.
-- Run this in your Supabase SQL Editor to setup the complete database.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: USER PROFILES & AUTHENTICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  rank TEXT CHECK (rank IN ('Operator', 'Admin', 'Guest')) DEFAULT 'Operator',
  avatar_url TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup with Admin check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  site_rank text := 'Operator';
BEGIN
  -- Assign 'Admin' rank only to specific emails
  IF new.email IN ('gmaina424@gmail.com', 'nextrademarkets@gmail.com') THEN
    site_rank := 'Admin';
  END IF;

  INSERT INTO public.profiles (id, username, rank)
  VALUES (new.id, new.raw_user_meta_data->>'username', site_rank)
  ON CONFLICT (id) DO UPDATE
  SET rank = EXCLUDED.rank;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update existing users to Admin
UPDATE public.profiles
SET rank = 'Admin'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('gmaina424@gmail.com', 'nextrademarkets@gmail.com')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: PLAYLISTS & CHANNELS
-- ═══════════════════════════════════════════════════════════════════════════

-- Playlists Table for M3U sources
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'General',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Playlists are viewable by everyone" ON playlists;
CREATE POLICY "Playlists are viewable by everyone" ON playlists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can modify playlists" ON playlists;
CREATE POLICY "Only admins can modify playlists" ON playlists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- User Favorites for Live Channels
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS on favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON user_favorites;
CREATE POLICY "Users can manage their own favorites" ON user_favorites FOR ALL USING (auth.uid() = user_id);

-- Channels Cache (Optional for performance)
CREATE TABLE IF NOT EXISTS channels_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT,
  logo TEXT,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: MEDIA LIBRARY (VOD)
-- ═══════════════════════════════════════════════════════════════════════════

-- Media Library Table for VOD Content
CREATE TABLE IF NOT EXISTS media_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Movie', -- Movie, Series, Documentary, Music, Fallen
  cover_url TEXT,
  stream_url TEXT NOT NULL,
  release_year INTEGER,
  genre TEXT,
  rating DECIMAL(3, 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Interaction counters
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  -- Series/Episode support
  parent_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
  season_number INTEGER,
  episode_number INTEGER
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_media_parent ON media_library(parent_id);

-- Enable RLS
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view media" ON media_library;
CREATE POLICY "Public can view media" ON media_library FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage media" ON media_library;
CREATE POLICY "Admins can manage media" ON media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
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

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: USER MEDIA INTERACTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- User Media Favorites
CREATE TABLE IF NOT EXISTS user_media_favorites (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  media_id UUID REFERENCES media_library ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, media_id)
);

ALTER TABLE user_media_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own media favorites" ON user_media_favorites;
CREATE POLICY "Users can manage their own media favorites" ON user_media_favorites 
  FOR ALL USING (auth.uid() = user_id);

-- User Watchlist
CREATE TABLE IF NOT EXISTS user_watchlist (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  media_id UUID REFERENCES media_library ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, media_id)
);

ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own watchlist" ON user_watchlist;
CREATE POLICY "Users can manage their own watchlist" ON user_watchlist 
  FOR ALL USING (auth.uid() = user_id);

-- User Media Playlists
CREATE TABLE IF NOT EXISTS user_media_playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_media_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own media playlists" ON user_media_playlists;
CREATE POLICY "Users can manage their own media playlists" ON user_media_playlists 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view public playlists" ON user_media_playlists;
CREATE POLICY "Public can view public playlists" ON user_media_playlists 
  FOR SELECT USING (is_public = true);

-- Playlist Items
CREATE TABLE IF NOT EXISTS playlist_media_items (
  playlist_id UUID REFERENCES user_media_playlists ON DELETE CASCADE,
  media_id UUID REFERENCES media_library ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, media_id)
);

ALTER TABLE playlist_media_items ENABLE ROW LEVEL SECURITY;
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

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  target_id TEXT NOT NULL, -- category name or other identifier
  type TEXT DEFAULT 'category',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, target_id)
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions 
  FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: ADS SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Ads Library (Storage for ad video clips)
CREATE TABLE IF NOT EXISTS ads_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  ad_url TEXT NOT NULL, -- R2 path or external URL
  click_through_url TEXT, -- Link when user clicks ad
  duration INTEGER, -- In seconds
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ads Configuration/Rules
CREATE TABLE IF NOT EXISTS ads_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  placement TEXT CHECK (placement IN ('pre-roll', 'mid-roll', 'overlay', 'post-roll')),
  target_category TEXT DEFAULT 'All', -- All, Live, Movie, Series
  frequency_minutes INTEGER DEFAULT 0, -- For mid-roll (e.g. every 30 mins)
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ads_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_config ENABLE ROW LEVEL SECURITY;

-- Policies (Public can view, only Admin can edit)
CREATE POLICY "Public can view ads and channels" ON ads_library FOR SELECT USING (true);
CREATE POLICY "Public can view ads config" ON ads_config FOR SELECT USING (true);

CREATE POLICY "Admins manage ads" ON ads_library FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "Admins manage ads config" ON ads_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- Seed Default Ad Configs
INSERT INTO ads_config (placement, target_category, frequency_minutes, is_enabled)
VALUES 
('pre-roll', 'All', 0, true),
('mid-roll', 'All', 10, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: VIRTUAL CHANNELS (VOD-to-Live)
-- ═══════════════════════════════════════════════════════════════════════════

-- Virtual Channels
CREATE TABLE IF NOT EXISTS virtual_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  scheduled_start_time TIMESTAMPTZ, -- For countdown support
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Schedule (What plays when)
CREATE TABLE IF NOT EXISTS channel_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES virtual_channels(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  duration INTEGER -- Expected duration in seconds
);

ALTER TABLE virtual_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view virtual channels" ON virtual_channels FOR SELECT USING (true);
CREATE POLICY "Public can view schedules" ON channel_schedule FOR SELECT USING (true);

CREATE POLICY "Admins manage virtual channels" ON virtual_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "Admins manage schedules" ON channel_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: EVENT LOGS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_logs (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT,
  event_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view logs" ON event_logs;
CREATE POLICY "Admins can view logs" ON event_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
DROP POLICY IF EXISTS "System can insert logs" ON event_logs;
CREATE POLICY "System can insert logs" ON event_logs FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Seed Playlists
INSERT INTO playlists (name, url, type, is_active)
VALUES
('Free Live Sports', 'https://www.apsattv.com/freelivesports.m3u', 'Sports', true),
('Africa', 'https://iptv-org.github.io/iptv/regions/afr.m3u', 'Region', true),
('Roku', 'https://www.apsattv.com/rok.m3u', 'Premium', true),
('Redbox', 'https://www.apsattv.com/redbox.m3u', 'Premium', true),
('Vidaa', 'https://www.apsattv.com/vidaa.m3u', 'Vidaa', true),
('Tubi', 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u', 'Tubi', true),
('Soul TV', 'https://www.apsattv.com/soultv.m3u', 'SoulTV', true),
('Samsung USA', 'https://www.apsattv.com/ssungusa.m3u', 'Samsung', true),
('Vizio', 'https://www.apsattv.com/vizio.m3u', 'Vizio', true),
('TCL Plus', 'https://www.apsattv.com/tclplus.m3u', 'TCL', true),
('Fire TV', 'https://www.apsattv.com/firetv.m3u', 'FireTV', true),
('Xumo', 'https://www.apsattv.com/xumo.m3u', 'Xumo', true),
('Sports', 'https://iptv-org.github.io/iptv/categories/sports.m3u', 'Sports', true),
('Global News', 'https://iptv-org.github.io/iptv/categories/news.m3u', 'News', true),
('Movies', 'https://iptv-org.github.io/iptv/categories/movies.m3u', 'Entertainment', true),
('Music', 'https://iptv-org.github.io/iptv/categories/music.m3u', 'Entertainment', true)
ON CONFLICT (url) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
