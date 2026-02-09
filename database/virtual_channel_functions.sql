-- ═══════════════════════════════════════════════════════════════════════════
-- VIRTUAL CHANNEL SERVER-SIDE FUNCTIONS
-- These functions enable the live broadcast to work independently of admin session
-- ═══════════════════════════════════════════════════════════════════════════

-- Add live_started_at column to track when broadcast actually began
ALTER TABLE virtual_channels ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMPTZ;

-- Add ad_id to channel_schedule if not exists
ALTER TABLE channel_schedule ADD COLUMN IF NOT EXISTS ad_id UUID REFERENCES ads_library(id) ON DELETE CASCADE;

-- Make media_id nullable (schedule items can be either media or ad)
ALTER TABLE channel_schedule ALTER COLUMN media_id DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: go_live
-- Sets a channel to live and records the start timestamp
-- This persists in the database so it works even when admin logs off
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION go_live(channel_uuid UUID)
RETURNS JSON AS $$
DECLARE
    schedule_count INTEGER;
    total_dur INTEGER;
    result JSON;
BEGIN
    -- Verify schedule has items
    SELECT COUNT(*), COALESCE(SUM(duration), 0)
    INTO schedule_count, total_dur
    FROM channel_schedule
    WHERE channel_id = channel_uuid;

    IF schedule_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Schedule is empty. Add media before going live.');
    END IF;

    -- Activate the channel and record start time
    UPDATE virtual_channels
    SET is_active = true,
        live_started_at = NOW(),
        scheduled_start_time = NULL
    WHERE id = channel_uuid;

    RETURN json_build_object(
        'success', true,
        'channel_id', channel_uuid,
        'live_started_at', NOW(),
        'schedule_items', schedule_count,
        'total_duration_seconds', total_dur
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: go_offline
-- Takes a channel offline
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION go_offline(channel_uuid UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE virtual_channels
    SET is_active = false,
        live_started_at = NULL
    WHERE id = channel_uuid;

    RETURN json_build_object('success', true, 'channel_id', channel_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: schedule_live
-- Schedules a channel to go live at a specific time
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION schedule_live(channel_uuid UUID, start_time TIMESTAMPTZ)
RETURNS JSON AS $$
DECLARE
    schedule_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO schedule_count
    FROM channel_schedule
    WHERE channel_id = channel_uuid;

    IF schedule_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Schedule is empty.');
    END IF;

    UPDATE virtual_channels
    SET is_active = true,
        scheduled_start_time = start_time,
        live_started_at = start_time
    WHERE id = channel_uuid;

    RETURN json_build_object(
        'success', true,
        'channel_id', channel_uuid,
        'scheduled_start_time', start_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: get_channel_playback_state
-- Returns the current playback state for a channel (what's playing now)
-- This is the server-side sync engine - works independently of any client
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_channel_playback_state(channel_uuid UUID)
RETURNS JSON AS $$
DECLARE
    chan RECORD;
    total_dur INTEGER;
    elapsed_seconds INTEGER;
    cycle_offset INTEGER;
    cumulative INTEGER := 0;
    item RECORD;
    result JSON;
BEGIN
    -- Get channel info
    SELECT * INTO chan FROM virtual_channels WHERE id = channel_uuid;
    
    IF NOT FOUND OR NOT chan.is_active THEN
        RETURN json_build_object('status', 'offline');
    END IF;

    -- Check if scheduled for future
    IF chan.scheduled_start_time IS NOT NULL AND chan.scheduled_start_time > NOW() THEN
        RETURN json_build_object(
            'status', 'countdown',
            'starts_at', chan.scheduled_start_time,
            'seconds_remaining', EXTRACT(EPOCH FROM (chan.scheduled_start_time - NOW()))::INTEGER
        );
    END IF;

    -- Calculate total schedule duration
    SELECT COALESCE(SUM(duration), 0) INTO total_dur
    FROM channel_schedule WHERE channel_id = channel_uuid;

    IF total_dur = 0 THEN
        RETURN json_build_object('status', 'no_content');
    END IF;

    -- Calculate elapsed time since broadcast started
    IF chan.live_started_at IS NOT NULL THEN
        elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - chan.live_started_at))::INTEGER;
    ELSE
        -- Fallback to epoch sync
        elapsed_seconds := EXTRACT(EPOCH FROM NOW())::INTEGER;
    END IF;

    cycle_offset := elapsed_seconds % total_dur;

    -- Find current segment
    FOR item IN
        SELECT cs.*, 
               ml.title as media_title, ml.stream_url, ml.cover_url, ml.duration as media_duration,
               al.title as ad_title, al.ad_url, al.duration as ad_duration
        FROM channel_schedule cs
        LEFT JOIN media_library ml ON cs.media_id = ml.id
        LEFT JOIN ads_library al ON cs.ad_id = al.id
        WHERE cs.channel_id = channel_uuid
        ORDER BY cs.order_index ASC
    LOOP
        IF cycle_offset >= cumulative AND cycle_offset < cumulative + item.duration THEN
            RETURN json_build_object(
                'status', 'playing',
                'current_item', json_build_object(
                    'title', COALESCE(item.media_title, item.ad_title),
                    'stream_url', COALESCE(item.stream_url, item.ad_url),
                    'cover_url', item.cover_url,
                    'is_ad', item.ad_id IS NOT NULL,
                    'duration', item.duration,
                    'seek_position', cycle_offset - cumulative
                ),
                'total_duration', total_dur,
                'cycle_position', cycle_offset,
                'loop_number', elapsed_seconds / total_dur
            );
        END IF;
        cumulative := cumulative + item.duration;
    END LOOP;

    -- Fallback
    RETURN json_build_object('status', 'syncing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
