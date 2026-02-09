
# IMPLEMENTATION PLAN: VIRTUAL LIVE CHANNELS (VOD-to-LIVE)

This document outlines the strategy for creating a 24/7 synchronous live streaming experience using existing media uploads without requiring a dedicated streaming server (RTMP/OBS).

## 1. Technical Concept: "Epoch Synchronization"
Instead of streaming bits in real-time, we synchronize the playback state of all users based on the global Unix timestamp (UTC).

### Mathematical Model
1. **Total Cycle Duration (T)**: Sum of all video durations in a channel's schedule.
2. **Current Global Offset (O)**: `(Current Unix Timestamp) % T`.
3. **Active Segment Identification**:
   - Find the media item in the schedule where `CumulativeDuration < O < CumulativeDuration + ItemDuration`.
   - **Internal Seek Time**: `O - CumulativeDuration`.

## 2. Phase 1: Data Architecture ✅
We have implemented the following tables:
- `virtual_channels`: Core channel identity.
- `channel_schedule`: Ordered list of `media_id` and their sequence.

## 3. Phase 2: The Synchronization Engine (Frontend)
When a user selects a Virtual Channel, the application will:
1. Fetch the full `channel_schedule` for that channel.
2. Calculate the **Total Duration** of the loop.
3. Calculate the **Current Global Position** using the system clock.
4. Identify the currently playing media item.
5. Launch the `VideoPlayer` with the specific media URL and **automatically seek** to the calculated offset.

## 4. Phase 3: Seamless Transitions
To maintain the "Live" feel, the player will:
- Monitor when a video ends.
- Immediately load the next `media_id` in the schedule.
- Use the "Ambient Static" effect during transitions to simulate a signal hand-off.

## 5. Phase 4: Admin Capabilities
- **Schedule Management**: Drag-and-drop ordering of movies/episodes.
- **Loop Reset**: Ability to shift the start time of the loop if needed.
- **Channel Branding**: Upload custom logos and overlays for the virtual broadcast.

---
**Status**: Admin Management UI Created. Frontend Sync Engine pending next sprint.
