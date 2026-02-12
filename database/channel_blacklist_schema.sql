-- Channel Blacklist Table
-- Stores channels that should be hidden/blocked from the live stream manager

CREATE TABLE IF NOT EXISTS channel_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    playlist_name TEXT,
    reason TEXT,
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blacklisted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_channel_blacklist_url ON channel_blacklist(channel_url);
CREATE INDEX IF NOT EXISTS idx_channel_blacklist_name ON channel_blacklist(channel_name);

-- Enable RLS
ALTER TABLE channel_blacklist ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read blacklist"
    ON channel_blacklist
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert blacklist"
    ON channel_blacklist
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete blacklist"
    ON channel_blacklist
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comments
COMMENT ON TABLE channel_blacklist IS 'Stores channels that are blacklisted from appearing in the live stream manager';
COMMENT ON COLUMN channel_blacklist.channel_name IS 'Display name of the blacklisted channel';
COMMENT ON COLUMN channel_blacklist.channel_url IS 'Stream URL of the blacklisted channel';
COMMENT ON COLUMN channel_blacklist.playlist_name IS 'Name of the playlist this channel came from';
COMMENT ON COLUMN channel_blacklist.reason IS 'Reason for blacklisting (optional)';
