-- Admin Governance Tables Migration
-- Run this in Supabase SQL Editor to add missing tables for AdminGovernance

-- Audit Logs Table (for CommandDeck and AdminGovernance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    target TEXT,
    details JSONB,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_failing BOOLEAN DEFAULT false,
    last_triggered TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage webhooks" ON webhooks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- Admin Settings Table (feature flags, system configuration)
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage settings" ON admin_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
CREATE POLICY "All can read settings" ON admin_settings FOR SELECT USING (true);

-- Seed default admin settings
INSERT INTO admin_settings (key, value, description) VALUES
    ('feature_new-player-ui', '{"enabled": false}', 'Enable new player UI controls'),
    ('feature_low-latency-live', '{"enabled": false}', 'Enable low-latency live streaming'),
    ('feature_ads-client-side', '{"enabled": false}', 'Enable client-side ad insertion'),
    ('system_health', '{"api_latency": 0, "error_rate": 0, "db_connections": 0, "realtime_status": "Healthy"}', 'System health metrics'),
    ('latency_ms', '{"value": 0}', 'Default latency setting'),
    ('jitter_ms', '{"value": 0}', 'Default jitter setting'),
    ('intro_url', '{"url": ""}', 'Default intro video URL'),
    ('outro_url', '{"url": ""}', 'Default outro video URL'),
    ('device_support', '{"devices": []}', 'Supported device configurations')
ON CONFLICT (key) DO NOTHING;

-- Moderation Queue Table
CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
    content_type TEXT DEFAULT 'media',
    content_title TEXT,
    reason TEXT NOT NULL,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage moderation" ON moderation_queue FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- Download Tasks Table (for RemoteDownloader)
CREATE TABLE IF NOT EXISTS download_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    type TEXT CHECK (type IN ('youtube', 'torrent', 'direct')),
    quality TEXT DEFAULT '720p',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'uploading', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    filename TEXT,
    error TEXT,
    destination_path TEXT,
    file_size BIGINT,
    downloaded_size BIGINT DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE download_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own downloads" ON download_tasks FOR ALL USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);

-- Event Logs Function (to log events from the app)
CREATE OR REPLACE FUNCTION log_event(event_description TEXT, user_name TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO event_logs (user_name, event_description)
    VALUES (user_name, event_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_action TEXT,
    p_target TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'info'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, actor_name, action, target, severity)
    SELECT 
        auth.uid(),
        COALESCE((SELECT username FROM profiles WHERE id = auth.uid()), 'Anonymous'),
        p_action,
        p_target,
        p_severity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing event_logs table to have proper RLS if needed
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view logs" ON event_logs;
CREATE POLICY "Admins can view logs" ON event_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rank = 'Admin')
);
DROP POLICY IF EXISTS "System can insert logs" ON event_logs;
CREATE POLICY "System can insert logs" ON event_logs FOR INSERT WITH CHECK (true);

-- Create function to automatically log user actions
CREATE OR REPLACE FUNCTION handle_user_action()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_audit_log(
        TG_OP || ' ' || COALESCE(TG_TABLE_NAME, 'unknown'),
        COALESCE(NEW.id::text, 'N/A'),
        'info'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log profile updates
DROP TRIGGER IF EXISTS log_profile_changes ON profiles;
CREATE TRIGGER log_profile_changes
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE handle_user_action();
