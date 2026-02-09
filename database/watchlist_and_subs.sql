
-- Table for user subscriptions to categories or creators (if any)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  target_id TEXT NOT NULL, -- category name or other identifier
  type TEXT DEFAULT 'category',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, target_id)
);

-- Table for user watchlist
CREATE TABLE IF NOT EXISTS user_watchlist (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  media_id UUID REFERENCES media_library ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, media_id)
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own watchlist" ON user_watchlist;
CREATE POLICY "Users can manage their own watchlist" ON user_watchlist 
  FOR ALL USING (auth.uid() = user_id);
