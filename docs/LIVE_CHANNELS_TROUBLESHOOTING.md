# Live Channels Troubleshooting Guide

## ✅ Completed: Database Schema Consolidation
- Created `complete_database_schema.sql` combining all 10 SQL files
- Organized into logical sections with clear comments
- Includes all tables, policies, functions, triggers, and seed data
- Ready to run in Supabase SQL Editor

## 🔍 Live Channels Not Playing - Investigation

### Current Setup
The application appears to be properly configured:
1. ✅ HLS.js library loaded in `index.html` (line 14)
2. ✅ VideoPlayer component has proper HLS initialization
3. ✅ Error handling and buffering states implemented
4. ✅ CORS configuration documented in VideoPlayer.tsx

### Common Issues & Solutions

#### 1. **CORS Errors**
**Symptoms:** Console shows `Access-Control-Allow-Origin` errors
**Solution:**
- External M3U8 sources must have CORS headers enabled
- Cannot fix this client-side if the source doesn't allow CORS
- Test with a known working stream URL first

#### 2. **HLS.js Not Loaded**
**Symptoms:** Console error `Hls is not defined` or `Cannot read property 'isSupported' of undefined`
**Solution:**
- Check browser console to ensure HLS.js loaded
- Try clearing browser cache
- Verify CDN is accessible: https://cdn.jsdelivr.net/npm/hls.js@latest

#### 3. **Network/Firewall Issues**
**Symptoms:** Streams timeout or never start loading
**Solution:**
- Test stream URLs directly in browser
- Check if ISP/network blocks IPTV streams
- Try different network or VPN

#### 4. **Invalid/Dead Stream URLs**
**Symptoms:** Some channels play, others don't
**Solution:**
- Many free IPTV streams die frequently
- Test URLs individually: open in VLC or browser
- Update M3U playlists regularly

### Debugging Steps

1. **Open Browser Console** (F12)
   - Look for any red errors
   - Check Network tab for failed requests
   - Note any CORS or 403/404 errors

2. **Test Individual Stream**
   ```javascript
   // In browser console, test if HLS.js works:
   const video = document.querySelector('video');
   if (window.Hls && window.Hls.isSupported()) {
     const hls = new window.Hls();
     hls.loadSource('YOUR_M3U8_URL_HERE');
     hls.attachMedia(video);
   }
   ```

3. **Check VideoPlayer State**
   - Look for "Locking Signal..." or error messages
   - Check if buffering indicator stays active
   - Verify selected channel has correct URL format

### Quick Fixes to Try

#### Fix 1: Add Error Recovery
The VideoPlayer already has error handling, but you can enhance it:
- Check line 261-284 in VideoPlayer.tsx for error handlers
- Errors are logged but might need better user feedback

#### Fix 2: Test with Known Working Streams
Replace a playlist URL with a guaranteed working stream:
- NASA TV: `https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8`
- Add this directly in App.tsx or seed it in database

#### Fix 3: Disable Autoplay if Failing
Some browsers block autoplay. The VideoPlayer tries to autoplay on manifest parse (line 235).
If this fails silently, add a manual play button.

### Files to Check

1. **VideoPlayer.tsx** (lines 140-300)
   - HLS initialization
   - Error handling
   - Stream loading logic

2. **App.tsx** (line 673, 772-776)
   - How channels are passed to VideoPlayer
   - Channel selection logic

3. **Browser Console**
   - Real-time errors and warnings
   - Network tab for stream requests

### Next Steps

1. Check browser console for specific errors
2. Test with a known working M3U8 URL
3. Verify network can access external streams
4. Check if specific playlists are dead/blocked
5. Try different browser (some block IPTV by default)

### Contact Support
If issues persist, provide:
- Browser console errors (screenshot)
- Network tab showing failed requests
- Which specific channels/playlists fail
- Browser and OS version
