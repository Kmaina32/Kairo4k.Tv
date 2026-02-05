
# 🚀 Kairo 4k Stream Expansion Roadmap

Goal: Transform the app into a universal media aggregator by integrating high-quality streams from the Kodi and Stremio ecosystems.

---

## ✅ Phase 1: High-Priority Source Aggregation (COMPLETED)
- [x] **GitHub IPTV-org Integration**: Pulling from `iptv-org` News, Movies, Music, and Documentary categories.
- [x] **Free-TV Project**: Integrated the `Free-TV/IPTV` repository for global localized content.
- [x] **TutoIPTV Repos**: Added validated community-maintained playlists for France, Italy, and Spain.

## 🛠 Phase 2: Stremio & Kodi Protocol Bridges
- [ ] **Stremio Addon Parser**: Build a compatibility layer to fetch stream URLs from standard Stremio Addon JSON manifests (HTTPS/HLS).
- [ ] **Kodi `.xml` / `.m3u` Wrapper**: Many Kodi addons use specific XML structures. Build a parser for `superrepo` or `magnetic` link structures.
- [ ] **Debrid Support (Experimental)**: Research integration for Real-Debrid API to handle cached torrent streams for on-demand content (movies/series).

## 🧠 Phase 3: AI-Driven Metadata Enrichment
- [ ] **Gemini EPG Generator**: Use Gemini 3 Flash to "predict" or fetch current programming schedules based on channel names when a standard XMLTV feed is missing.
- [ ] **Universal Search**: Implement a global search that queries multiple remote JSON manifests simultaneously without blocking the UI.
- [ ] **Smart Category Mapping**: Use AI to normalize category names across different providers (e.g., mapping "Cinema", "Movies", "Films" all to one "Movies" category).

## 🎨 Phase 4: UI/UX for "Infinite" Content
- [ ] **Favorites System**: Allow users to save channels across different "Frequency Nodes" into a persistent local storage list.
- [ ] **Multi-Stream View**: Create a "CCTV Mode" where users can monitor 4 streams at once (Quad-view).
- [ ] **Network Health HUD**: Add a latency indicator for each stream to show "Uplink Stability" before the user clicks.

## 📦 Phase 5: Technical Infrastructure
- [ ] **Dynamic Proxy Rotation**: Automatically switch between the available PROXY_OPTIONS if a stream is blocked by CORS.
- [ ] **PWA Support**: Transform the app into a Progressive Web App for "Install to Home Screen" capability on Android TV and Mobile.
- [ ] **HLS.js Optimization**: Fine-tune buffer settings for low-latency live sports streams.

---

*Note: Always ensure that the sources added adhere to the project's focus on publicly available and legal streaming links.*
