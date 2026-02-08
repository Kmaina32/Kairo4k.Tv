# KAIRO 4K - Project Roadmap & TODO

## 🚀 Immediate Action Items (Urgent)
- [ ] **Database Migration**: Run the SQL script for `user_media_favorites` in the Supabase SQL Editor.
- [ ] **CORS Configuration**: Update Cloudflare R2 bucket settings with the CORS policy to enable content uploads.
- [ ] **Verification**: Confirm that navigating away from the media player successfully unmounts the component and stops audio/video.

## 📺 Media & Streaming Enhancements
- [ ] **Subscription Logic**: Implement the "Subscribe" button functionality in `MoviesPage` to track creator/category follows.
- [ ] **Progress Persistence**: Ensure video "resume" points are correctly synced with the database across devices (currently using `localStorage`).
- [ ] **Resolution Switcher**: Test HLS adaptive bitrate switching on mobile devices.
- [ ] **Auto-play Next**: Add logic to automatically play the next episode in a series.

## 🎨 UI/UX Refinement
- [ ] **Lazy Loading**: Implement Intersection Observer for media grids to improve performance on large libraries.
- [ ] **Search Filters**: Add "Genre" and "Year" dropdowns to the `MoviesPage` and `PlaylistsPage` headers.
- [ ] **Global Search Results**: Create a dedicated `SearchPage` for when the global header search is used.
- [ ] **Skeleton Loaders**: Replace the basic spinner with premium skeleton cards during data fetching.

## 🛠 Admin & Management
- [ ] **Content Editor**: Add "Edit" and "Delete" actions directly to the media cards (admin only).
- [ ] **User Management**: Build the user list view to manage ranks (Operator, Admin, Guest).
- [ ] **Analytics Migration**: Connect the Admin Dashboard stats to real Supabase metrics (total views, active sessions).

## 🔒 Security & Performance
- [ ] **RLS Audit**: Double-check Row Level Security policies for all tables (`user_watchlist`, `user_subscriptions`, etc.).
- [ ] **Asset Optimization**: Implement image compression or use a CDN loader for media covers.
- [ ] **Error Boundaries**: Add React Error Boundaries around the video player to handle source failures gracefully.

## 🏁 Future Goals
- [ ] **Discord Integration**: Webhook notifications for new content uploads.
- [ ] **Social Features**: Add a "Watch Party" mode for synchronized viewing.
- [ ] **Mobile App**: Explore Capacitor or PWA features for a native-like experience.
