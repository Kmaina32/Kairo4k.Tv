-- ============================================
-- CONTENT MANAGEMENT SYSTEM SCHEMA
-- ============================================
-- Comprehensive schema for managing all content types:
-- Series, Movies, Music, Documentaries, Sports, Animations, Kids, Religion
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CONTENT CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'Series', 'Movies', 'Music', 'Documentaries', 'Sports', 'Animations', 'Kids', 'Religion'
    slug TEXT NOT NULL UNIQUE, -- e.g., 'series', 'movies', 'music'
    description TEXT,
    icon TEXT, -- Icon name or URL
    color TEXT, -- Hex color for UI theming
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GENRES TABLE (Shared across all content types)
-- ============================================
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'Action', 'Comedy', 'Drama', 'Rock', 'Gospel'
    slug TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL, -- Optional: link to specific category
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SERIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    poster_url TEXT, -- Main poster image (R2 URL)
    banner_url TEXT, -- Wide banner image (R2 URL)
    trailer_url TEXT, -- Trailer video URL
    release_year INTEGER,
    rating DECIMAL(3,1), -- e.g., 8.5
    status TEXT DEFAULT 'ongoing', -- 'ongoing', 'completed', 'cancelled'
    total_seasons INTEGER DEFAULT 0,
    total_episodes INTEGER DEFAULT 0,
    category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SERIES GENRES (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS series_genres (
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (series_id, genre_id)
);

-- ============================================
-- SEASONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    title TEXT, -- Optional season title
    description TEXT,
    poster_url TEXT,
    release_year INTEGER,
    total_episodes INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(series_id, season_number)
);

-- ============================================
-- EPISODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT, -- Episode thumbnail (R2 URL)
    video_url TEXT NOT NULL, -- Video file URL (R2 or external)
    duration INTEGER, -- Duration in seconds
    release_date DATE,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, episode_number)
);

-- ============================================
-- MOVIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    poster_url TEXT,
    banner_url TEXT,
    trailer_url TEXT,
    video_url TEXT NOT NULL, -- Main video file (R2 URL)
    duration INTEGER, -- Duration in seconds
    release_year INTEGER,
    rating DECIMAL(3,1),
    category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MOVIES GENRES (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- ============================================
-- MUSIC TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS music (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    artist TEXT NOT NULL,
    album TEXT,
    description TEXT,
    cover_url TEXT, -- Album/track cover art (R2 URL)
    audio_url TEXT NOT NULL, -- Audio file (R2 URL)
    video_url TEXT, -- Optional music video
    duration INTEGER, -- Duration in seconds
    release_year INTEGER,
    category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MUSIC GENRES (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS music_genres (
    music_id UUID REFERENCES music(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (music_id, genre_id)
);

-- ============================================
-- DOCUMENTARIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documentaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    poster_url TEXT,
    banner_url TEXT,
    trailer_url TEXT,
    video_url TEXT NOT NULL,
    duration INTEGER,
    release_year INTEGER,
    rating DECIMAL(3,1),
    category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOCUMENTARIES GENRES (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS documentary_genres (
    documentary_id UUID REFERENCES documentaries(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (documentary_id, genre_id)
);

-- ============================================
-- SPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sport_type TEXT, -- e.g., 'Football', 'Basketball', 'Tennis'
    league TEXT, -- e.g., 'Premier League', 'NBA'
    teams TEXT, -- e.g., 'Team A vs Team B'
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    is_live BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_series_category ON series(category_id);
CREATE INDEX IF NOT EXISTS idx_series_published ON series(is_published);
CREATE INDEX IF NOT EXISTS idx_series_featured ON series(is_featured);
CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);

CREATE INDEX IF NOT EXISTS idx_seasons_series ON seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_published ON episodes(is_published);

CREATE INDEX IF NOT EXISTS idx_movies_category ON movies(category_id);
CREATE INDEX IF NOT EXISTS idx_movies_published ON movies(is_published);
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);

CREATE INDEX IF NOT EXISTS idx_music_artist ON music(artist);
CREATE INDEX IF NOT EXISTS idx_music_published ON music(is_published);

CREATE INDEX IF NOT EXISTS idx_documentaries_published ON documentaries(is_published);
CREATE INDEX IF NOT EXISTS idx_sports_published ON sports(is_published);
CREATE INDEX IF NOT EXISTS idx_sports_live ON sports(is_live);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE music ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentary_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public can view published series" ON series FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published seasons" ON seasons FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published episodes" ON episodes FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published movies" ON movies FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published music" ON music FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published documentaries" ON documentaries FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published sports" ON sports FOR SELECT USING (is_published = true);

-- Public read access for categories and genres
CREATE POLICY "Public can view categories" ON content_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view genres" ON genres FOR SELECT USING (true);
CREATE POLICY "Public can view genre mappings" ON series_genres FOR SELECT USING (true);
CREATE POLICY "Public can view movie genres" ON movie_genres FOR SELECT USING (true);
CREATE POLICY "Public can view music genres" ON music_genres FOR SELECT USING (true);
CREATE POLICY "Public can view documentary genres" ON documentary_genres FOR SELECT USING (true);

-- Admin full access (authenticated users with admin role)
-- Note: You'll need to implement role-based access control
CREATE POLICY "Authenticated users can manage series" ON series FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage seasons" ON seasons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage episodes" ON episodes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage movies" ON movies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage music" ON music FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage documentaries" ON documentaries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage sports" ON sports FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA: Default Categories
-- ============================================
INSERT INTO content_categories (name, slug, description, icon, color, display_order) VALUES
    ('Series', 'series', 'TV Shows and Web Series', 'tv', '#8B5CF6', 1),
    ('Movies', 'movies', 'Feature Films', 'film', '#EC4899', 2),
    ('Music', 'music', 'Songs and Music Videos', 'music', '#10B981', 3),
    ('Documentaries', 'documentaries', 'Documentary Films and Series', 'book-open', '#F59E0B', 4),
    ('Sports', 'sports', 'Sports Events and Highlights', 'trophy', '#3B82F6', 5),
    ('Animations', 'animations', 'Animated Content', 'sparkles', '#F97316', 6),
    ('Kids', 'kids', 'Children''s Content', 'star', '#14B8A6', 7),
    ('Religion', 'religion', 'Religious and Spiritual Content', 'heart', '#6366F1', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: Default Genres
-- ============================================
INSERT INTO genres (name, slug) VALUES
    -- General genres
    ('Action', 'action'),
    ('Adventure', 'adventure'),
    ('Comedy', 'comedy'),
    ('Drama', 'drama'),
    ('Horror', 'horror'),
    ('Thriller', 'thriller'),
    ('Romance', 'romance'),
    ('Sci-Fi', 'sci-fi'),
    ('Fantasy', 'fantasy'),
    ('Mystery', 'mystery'),
    ('Crime', 'crime'),
    ('Animation', 'animation'),
    ('Family', 'family'),
    ('Documentary', 'documentary'),
    
    -- Music genres
    ('Pop', 'pop'),
    ('Rock', 'rock'),
    ('Hip Hop', 'hip-hop'),
    ('R&B', 'rnb'),
    ('Gospel', 'gospel'),
    ('Jazz', 'jazz'),
    ('Classical', 'classical'),
    ('Electronic', 'electronic'),
    ('Country', 'country'),
    ('Reggae', 'reggae'),
    ('Afrobeat', 'afrobeat'),
    
    -- Sports genres
    ('Football', 'football'),
    ('Basketball', 'basketball'),
    ('Tennis', 'tennis'),
    ('Boxing', 'boxing'),
    ('MMA', 'mma'),
    ('Cricket', 'cricket'),
    ('Rugby', 'rugby'),
    
    -- Kids genres
    ('Educational', 'educational'),
    ('Cartoons', 'cartoons'),
    ('Nursery Rhymes', 'nursery-rhymes'),
    
    -- Religion genres
    ('Christian', 'christian'),
    ('Islamic', 'islamic'),
    ('Spiritual', 'spiritual'),
    ('Motivational', 'motivational')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all content tables
CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON series FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_music_updated_at BEFORE UPDATE ON music FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentaries_updated_at BEFORE UPDATE ON documentaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sports_updated_at BEFORE UPDATE ON sports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update series total counts
CREATE OR REPLACE FUNCTION update_series_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE series
    SET 
        total_seasons = (SELECT COUNT(DISTINCT season_number) FROM seasons WHERE series_id = NEW.series_id),
        total_episodes = (SELECT COUNT(*) FROM episodes WHERE series_id = NEW.series_id)
    WHERE id = NEW.series_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update series counts when episodes change
CREATE TRIGGER update_series_counts_on_episode_change
AFTER INSERT OR UPDATE OR DELETE ON episodes
FOR EACH ROW EXECUTE FUNCTION update_series_counts();

-- Function to update season episode count
CREATE OR REPLACE FUNCTION update_season_episode_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE seasons
    SET total_episodes = (SELECT COUNT(*) FROM episodes WHERE season_id = NEW.season_id)
    WHERE id = NEW.season_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update season counts
CREATE TRIGGER update_season_counts_on_episode_change
AFTER INSERT OR UPDATE OR DELETE ON episodes
FOR EACH ROW EXECUTE FUNCTION update_season_episode_count();
