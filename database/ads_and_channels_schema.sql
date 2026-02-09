
-- ADS SYSTEM SCHEMA

-- 1. Ads Library (Storage for ad video clips)
CREATE TABLE IF NOT EXISTS ads_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  ad_url TEXT NOT NULL, -- R2 path or external URL
  click_through_url TEXT, -- Link when user clicks ad
  duration INTEGER, -- In seconds
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ads Configuration/Rules
CREATE TABLE IF NOT EXISTS ads_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  placement TEXT CHECK (placement IN ('pre-roll', 'mid-roll', 'overlay', 'post-roll')),
  target_category TEXT DEFAULT 'All', -- All, Live, Movie, Series
  frequency_minutes INTEGER DEFAULT 0, -- For mid-roll (e.g. every 30 mins)
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Live Stream Channels (VOD-to-Live Scheduling)
CREATE TABLE IF NOT EXISTS virtual_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Channel Schedule (What plays when)
CREATE TABLE IF NOT EXISTS channel_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES virtual_channels(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  duration INTEGER -- Expected duration in seconds
);

-- Enable RLS
ALTER TABLE ads_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_schedule ENABLE ROW LEVEL SECURITY;

-- Policies (Public can view, only Admin can edit)
CREATE POLICY "Public can view ads and channels" ON ads_library FOR SELECT USING (true);
CREATE POLICY "Public can view ads config" ON ads_config FOR SELECT USING (true);
CREATE POLICY "Public can view virtual channels" ON virtual_channels FOR SELECT USING (true);
CREATE POLICY "Public can view schedules" ON channel_schedule FOR SELECT USING (true);

-- Admin Modify Policies (Assuming existing rank check pattern)
CREATE POLICY "Admins manage ads" ON ads_library FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "Admins manage ads config" ON ads_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "Admins manage virtual channels" ON virtual_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "Admins manage schedules" ON channel_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- 5. Seed Default Ad Configs
INSERT INTO ads_config (placement, target_category, frequency_minutes, is_enabled)
VALUES 
('pre-roll', 'All', 0, true),
('mid-roll', 'All', 10, true)
ON CONFLICT DO NOTHING;
