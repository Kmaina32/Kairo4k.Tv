# Content Management System Documentation

## Overview

This comprehensive Content Management System (CMS) supports managing all types of media content including:

- **Series** (TV Shows, Web Series)
- **Movies** (Feature Films)
- **Music** (Songs, Music Videos)
- **Documentaries**
- **Sports** (Live Events, Highlights)
- **Animations**
- **Kids Content**
- **Religion** (Spiritual Content)

---

## Database Schema

### Core Tables

#### 1. `content_categories`
Defines the main content types (Series, Movies, Music, etc.)

```sql
- id: UUID (Primary Key)
- name: TEXT (e.g., 'Series', 'Movies')
- slug: TEXT (URL-friendly identifier)
- description: TEXT
- icon: TEXT (Icon name or URL)
- color: TEXT (Hex color for UI theming)
- display_order: INTEGER
- is_active: BOOLEAN
```

#### 2. `genres`
Shared genres across all content types

```sql
- id: UUID (Primary Key)
- name: TEXT (e.g., 'Action', 'Comedy', 'Rock')
- slug: TEXT
- category_id: UUID (Optional link to specific category)
- description: TEXT
```

#### 3. `series`
TV shows and web series

```sql
- id: UUID (Primary Key)
- title: TEXT
- slug: TEXT (Unique, auto-generated from title)
- description: TEXT
- poster_url: TEXT (R2 URL)
- banner_url: TEXT (R2 URL)
- trailer_url: TEXT
- release_year: INTEGER
- rating: DECIMAL(3,1) (0.0 - 10.0)
- status: TEXT ('ongoing', 'completed', 'cancelled')
- total_seasons: INTEGER (Auto-calculated)
- total_episodes: INTEGER (Auto-calculated)
- category_id: UUID
- created_by: UUID (References auth.users)
- is_featured: BOOLEAN
- is_published: BOOLEAN
- view_count: INTEGER
```

#### 4. `seasons`
Seasons within a series

```sql
- id: UUID (Primary Key)
- series_id: UUID (Foreign Key)
- season_number: INTEGER
- title: TEXT (Optional season title)
- description: TEXT
- poster_url: TEXT
- release_year: INTEGER
- total_episodes: INTEGER (Auto-calculated)
- is_published: BOOLEAN
```

#### 5. `episodes`
Individual episodes

```sql
- id: UUID (Primary Key)
- series_id: UUID (Foreign Key)
- season_id: UUID (Foreign Key)
- episode_number: INTEGER
- title: TEXT
- slug: TEXT (Auto-generated)
- description: TEXT
- thumbnail_url: TEXT (R2 URL)
- video_url: TEXT (R2 URL) *
- duration: INTEGER (seconds)
- release_date: DATE
- is_published: BOOLEAN
- view_count: INTEGER
```

#### 6. `movies`
Feature films

```sql
- id: UUID (Primary Key)
- title: TEXT
- slug: TEXT (Unique)
- description: TEXT
- poster_url: TEXT (R2 URL)
- banner_url: TEXT (R2 URL)
- trailer_url: TEXT
- video_url: TEXT (R2 URL) *
- duration: INTEGER (seconds)
- release_year: INTEGER
- rating: DECIMAL(3,1)
- category_id: UUID
- is_featured: BOOLEAN
- is_published: BOOLEAN
- view_count: INTEGER
```

#### 7. `music`
Songs and music videos

```sql
- id: UUID (Primary Key)
- title: TEXT
- slug: TEXT (Unique)
- artist: TEXT
- album: TEXT
- description: TEXT
- cover_url: TEXT (R2 URL)
- audio_url: TEXT (R2 URL) *
- video_url: TEXT (R2 URL, optional)
- duration: INTEGER (seconds)
- release_year: INTEGER
- is_featured: BOOLEAN
- is_published: BOOLEAN
- play_count: INTEGER
```

#### 8. `documentaries`
Documentary films and series

```sql
- Similar structure to movies
```

#### 9. `sports`
Sports events and highlights

```sql
- id: UUID (Primary Key)
- title: TEXT
- slug: TEXT (Unique)
- sport_type: TEXT (e.g., 'Football', 'Basketball')
- league: TEXT (e.g., 'Premier League')
- teams: TEXT (e.g., 'Team A vs Team B')
- description: TEXT
- thumbnail_url: TEXT (R2 URL)
- video_url: TEXT (R2 URL) *
- event_date: TIMESTAMP
- duration: INTEGER (seconds)
- is_live: BOOLEAN
- is_featured: BOOLEAN
- is_published: BOOLEAN
- view_count: INTEGER
```

### Junction Tables (Many-to-Many Relationships)

- `series_genres` - Links series to genres
- `movie_genres` - Links movies to genres
- `music_genres` - Links music to genres
- `documentary_genres` - Links documentaries to genres

---

## Setup Instructions

### 1. Run Database Migration

Execute the schema in your Supabase SQL editor:

```bash
# Navigate to Supabase Dashboard → SQL Editor
# Copy and paste the content from:
database/content_management_schema.sql
```

This will create:
- All tables with proper relationships
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-updating counts
- Seed data for categories and genres

### 2. Configure R2 Storage

Ensure your Cloudflare R2 bucket is configured with the following folder structure:

```
your-bucket/
├── videos/
│   ├── series/
│   ├── episode/
│   ├── movies/
│   ├── music/
│   ├── documentaries/
│   └── sports/
├── images/
│   ├── series/
│   ├── movies/
│   ├── music/
│   └── posters/
└── ads/
```

### 3. Environment Variables

Ensure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CF_PUBLIC_URL=your_r2_public_url
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_BUCKET_NAME=your_bucket_name
```

---

## Usage Guide

### Creating a Series

1. **Navigate to Admin → Series Manager**
2. **Click "Create Series"**
3. **Fill in the form:**
   - Title (required)
   - Description
   - Release Year
   - Rating (0-10)
   - Status (Ongoing/Completed/Cancelled)
   - Upload Poster Image
   - Select Genres
   - Toggle Featured/Published

4. **Click "Create Series"**

### Adding Seasons

1. **Click on a series** from the list
2. **Click "Add Season"**
3. **Fill in:**
   - Season Number
   - Season Title (optional)
   - Description
   - Release Year

4. **Click "Create Season"**

### Adding Episodes

1. **From the series management view**, click "Add Episode" on a season
2. **Fill in:**
   - Episode Number
   - Episode Title
   - Description
   - Upload Video File (will upload to R2 with progress tracking)
   - Upload Thumbnail (optional)
   - Duration (auto-detected if possible)
   - Release Date

3. **Click "Create Episode"**

### Bulk Episode Upload

For uploading multiple episodes at once:

```typescript
const episodes = [
    {
        episode_number: 1,
        title: "Pilot",
        description: "The beginning",
        video_file: file1,
        thumbnail_file: thumb1
    },
    // ... more episodes
];

await contentService.bulkCreateEpisodes(episodes);
```

---

## Content Service API

### Series

```typescript
// Create series
const series = await contentService.createSeries({
    title: "Breaking Bad",
    description: "A high school chemistry teacher...",
    status: "completed",
    genre_ids: [genreId1, genreId2],
    is_featured: true,
    is_published: true
});

// Update series
await contentService.updateSeries(seriesId, {
    rating: 9.5,
    is_featured: true
});

// Get series with all seasons and episodes
const fullSeries = await contentService.getSeries(seriesId);

// List series with filters
const result = await contentService.listSeries({
    category_id: categoryId,
    search: "breaking",
    genre_ids: [genreId],
    is_featured: true,
    sort_by: "rating",
    sort_order: "desc",
    page: 1,
    limit: 20
});

// Delete series (cascades to seasons and episodes)
await contentService.deleteSeries(seriesId);
```

### Seasons

```typescript
// Create season
const season = await contentService.createSeason({
    series_id: seriesId,
    season_number: 1,
    title: "The Beginning",
    is_published: true
});

// Get all seasons for a series
const seasons = await contentService.getSeasonsBySeries(seriesId);
```

### Episodes

```typescript
// Create episode
const episode = await contentService.createEpisode({
    series_id: seriesId,
    season_id: seasonId,
    episode_number: 1,
    title: "Pilot",
    video_url: "https://r2.../video.mp4",
    is_published: true
});

// Bulk create episodes
const episodes = await contentService.bulkCreateEpisodes([...]);

// Get episodes for a season
const episodes = await contentService.getEpisodesBySeason(seasonId);
```

### Movies

```typescript
// Create movie
const movie = await contentService.createMovie({
    title: "The Shawshank Redemption",
    description: "Two imprisoned men...",
    video_url: "https://r2.../movie.mp4",
    genre_ids: [genreId1, genreId2],
    rating: 9.3,
    is_published: true
});

// List movies
const movies = await contentService.listMovies({
    search: "shawshank",
    rating_min: 8.0,
    page: 1,
    limit: 20
});
```

### Music

```typescript
// Create music
const music = await contentService.createMusic({
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    audio_url: "https://r2.../song.mp3",
    video_url: "https://r2.../video.mp4", // optional
    genre_ids: [genreId],
    is_published: true
});

// List music
const musicList = await contentService.listMusic({
    search: "queen",
    page: 1,
    limit: 20
});
```

### Upload Helpers

```typescript
// Upload video with progress tracking
const videoUrl = await contentService.uploadVideo(
    videoFile,
    'videos/series',
    (progress) => {
        console.log(`Upload progress: ${progress}%`);
    }
);

// Upload image
const imageUrl = await contentService.uploadImage(
    imageFile,
    'images/posters'
);
```

---

## Row Level Security (RLS)

### Public Access
- Users can **view** all published content
- Users can **view** all categories and genres

### Authenticated Access
- Authenticated users can **create, update, delete** all content
- Future: Implement role-based access control (admin, editor, viewer)

### Implementing Role-Based Access

To add role-based access control:

1. **Add a `role` column to `auth.users` metadata**
2. **Update RLS policies:**

```sql
-- Example: Only admins can delete
CREATE POLICY "Only admins can delete series" ON series
FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Example: Editors can create/update
CREATE POLICY "Editors can manage series" ON series
FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'editor')
);
```

---

## Auto-Calculated Fields

### Series Counts
The `total_seasons` and `total_episodes` fields are automatically updated via database triggers when seasons/episodes are added or removed.

### Season Episode Count
The `total_episodes` field in seasons is automatically updated when episodes are added or removed.

---

## Best Practices

### 1. Content Organization

- **Use descriptive titles** that are SEO-friendly
- **Add comprehensive descriptions** for better discoverability
- **Tag content with appropriate genres** (2-4 genres recommended)
- **Upload high-quality posters** (recommended: 2:3 aspect ratio, 600x900px minimum)
- **Add trailers** for series and movies to increase engagement

### 2. Video Upload

- **Recommended formats**: MP4 (H.264 codec)
- **Recommended resolution**: 1080p or 720p
- **Use consistent naming**: `series-name-s01e01.mp4`
- **Compress videos** before upload to save bandwidth
- **Add thumbnails** for better visual appeal

### 3. Publishing Workflow

1. Create content as **draft** (is_published = false)
2. Upload all media files
3. Add metadata (description, genres, etc.)
4. Preview content
5. **Publish** when ready (is_published = true)

### 4. Featured Content

- **Limit featured items** to 5-10 per category
- **Rotate featured content** regularly
- **Feature high-quality, popular content** to attract users

---

## Troubleshooting

### Videos Not Playing

1. **Check video URL** is accessible
2. **Verify R2 CORS settings** allow your domain
3. **Check video format** is supported (MP4/H.264 recommended)
4. **Verify file uploaded successfully** to R2

### Slow Upload Speeds

1. **Compress videos** before upload
2. **Use batch uploads** during off-peak hours
3. **Check network connection**
4. **Consider using R2's multipart upload** for large files

### Database Errors

1. **Check RLS policies** aren't blocking your operations
2. **Verify foreign key relationships** are valid
3. **Check unique constraints** (slug, season_number, episode_number)
4. **Review Supabase logs** for detailed error messages

---

## Future Enhancements

### Planned Features

- [ ] **Bulk episode upload** with CSV metadata
- [ ] **Automatic video transcoding** (convert to multiple resolutions)
- [ ] **Subtitle support** (VTT/SRT files)
- [ ] **Watch history tracking** per user
- [ ] **Recommendations engine** based on viewing history
- [ ] **Content moderation** workflow
- [ ] **Analytics dashboard** (views, popular content, etc.)
- [ ] **CDN integration** for faster video delivery
- [ ] **Live streaming** support for sports
- [ ] **User playlists** and favorites

---

## API Reference

See `src/services/contentService.ts` for the complete API reference.

## Type Definitions

See `src/types/content.ts` for all TypeScript interfaces.

## Database Schema

See `database/content_management_schema.sql` for the complete SQL schema.

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase logs
3. Check R2 upload logs
4. Review browser console for errors

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-12
