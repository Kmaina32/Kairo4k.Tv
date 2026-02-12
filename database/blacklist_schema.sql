-- Channel Blacklist Schema

CREATE TABLE IF NOT EXISTS channel_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  channel_name TEXT,
  reason TEXT, -- 'Offline', 'Inappropriate', 'Copyright', 'Manual'
  blacklisted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE channel_blacklist ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Start blacklist viewable by everyone" ON channel_blacklist;
CREATE POLICY "Start blacklist viewable by everyone" ON channel_blacklist FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage blacklist" ON channel_blacklist;
CREATE POLICY "Admins can manage blacklist" ON channel_blacklist FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
