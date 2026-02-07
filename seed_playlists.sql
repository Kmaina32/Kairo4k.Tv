
-- Seed data for playlists table
-- Run this in your Supabase SQL Editor to populate the database with default playlists.
-- This is necessary because the Python script cannot bypass Row Level Security with the anonymous key.

INSERT INTO playlists (name, url, type, is_active)
VALUES
('Free Live Sports', 'https://www.apsattv.com/freelivesports.m3u', 'Sports', true),
('Pluto TV', 'data:text/plain;charset=utf-8,#EXTM3U\n#EXTINF:-1 tvg-id="90210.us@SD",90210\nhttp://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv/stitch/hls/channel/65a67dd13af63d0008257f17/master.m3u8?appName=web&appVersion=unknown&clientTime=0&deviceDNT=0&deviceId=84abe160-4b92-11ef-aece-533610f1ea34&deviceMake=Chrome&deviceModel=web&deviceType=web&deviceVersion=unknown&includeExtendedEvents=false&serverSideAds=false&sid=33a2585b-a5ca-4d3b-a8ca-bea4dff25f97', 'Premium', true),
('Africa', 'https://iptv-org.github.io/iptv/regions/afr.m3u', 'Region', true),
('Roku', 'https://www.apsattv.com/rok.m3u', 'Premium', true),
('Redbox', 'https://www.apsattv.com/redbox.m3u', 'Premium', true),
('Vidaa', 'https://www.apsattv.com/vidaa.m3u', 'Vidaa', true),
('Tubi', 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u', 'Tubi', true),
('Soul TV', 'https://www.apsattv.com/soultv.m3u', 'SoulTV', true),
('Samsung Brazil', 'https://www.apsattv.com/ssungbra.m3u', 'Samsung', true),
('Rede ITTV', 'https://www.apsattv.com/redeitv.m3u', 'RedeITTV', true),
('Samsung USA', 'https://www.apsattv.com/ssungusa.m3u', 'Samsung', true),
('Vizio', 'https://www.apsattv.com/vizio.m3u', 'Vizio', true),
('TCL Plus', 'https://www.apsattv.com/tclplus.m3u', 'TCL', true),
('Zeasn', 'https://www.apsattv.com/zeasn.m3u', 'Zeasn', true),
('Distro', 'https://www.apsattv.com/distro.m3u', 'Distro', true),
('Local Now', 'https://www.apsattv.com/localnow.m3u', 'Local', true),
('Tablo', 'https://www.apsattv.com/tablo.m3u', 'Tablo', true),
('Xiaomi', 'https://www.apsattv.com/xiaomi.m3u', 'Xiaomi', true),
('Fire TV', 'https://www.apsattv.com/firetv.m3u', 'FireTV', true),
('Xumo', 'https://www.apsattv.com/xumo.m3u', 'Xumo', true),
('Sports', 'https://iptv-org.github.io/iptv/categories/sports.m3u', 'Sports', true),
('Global News', 'https://iptv-org.github.io/iptv/categories/news.m3u', 'News', true),
('Movies', 'https://iptv-org.github.io/iptv/categories/movies.m3u', 'Entertainment', true),
('Music', 'https://iptv-org.github.io/iptv/categories/music.m3u', 'Entertainment', true)
ON CONFLICT (url) DO NOTHING;
