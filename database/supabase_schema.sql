-- SUPABASE SCHEMA FOR KAIRO 4K NEXUS (IDEMPOTENT)

-- 1. Profiles Table (Extends Supabase Auth)
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

-- 2. Playlists Table
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

-- 3. User Favorites
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

-- 4. Event Logs
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

-- 5. Channels Cache (Optional)
CREATE TABLE IF NOT EXISTS channels_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT,
  logo TEXT,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for profile creation on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, rank)
  VALUES (new.id, new.raw_user_meta_data->>'username', 'Operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


