// ============================================
// CONTENT MANAGEMENT SYSTEM TYPES
// ============================================

export interface ContentCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Genre {
    id: string;
    name: string;
    slug: string;
    category_id?: string;
    description?: string;
    created_at: string;
}

export interface Series {
    id: string;
    title: string;
    slug: string;
    description?: string;
    poster_url?: string;
    banner_url?: string;
    trailer_url?: string;
    release_year?: number;
    rating?: number;
    status: 'ongoing' | 'completed' | 'cancelled';
    total_seasons: number;
    total_episodes: number;
    category_id?: string;
    created_by?: string;
    is_featured: boolean;
    is_published: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    genres?: Genre[];
    seasons?: Season[];
    category?: ContentCategory;
}

export interface Season {
    id: string;
    series_id: string;
    season_number: number;
    title?: string;
    description?: string;
    poster_url?: string;
    release_year?: number;
    total_episodes: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    episodes?: Episode[];
    series?: Series;
}

export interface Episode {
    id: string;
    series_id: string;
    season_id: string;
    episode_number: number;
    title: string;
    slug: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    duration?: number;
    release_date?: string;
    is_published: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    season?: Season;
    series?: Series;
}

export interface Movie {
    id: string;
    title: string;
    slug: string;
    description?: string;
    poster_url?: string;
    banner_url?: string;
    trailer_url?: string;
    video_url: string;
    duration?: number;
    release_year?: number;
    rating?: number;
    category_id?: string;
    created_by?: string;
    is_featured: boolean;
    is_published: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    genres?: Genre[];
    category?: ContentCategory;
}

export interface Music {
    id: string;
    title: string;
    slug: string;
    artist: string;
    album?: string;
    description?: string;
    cover_url?: string;
    audio_url: string;
    video_url?: string;
    duration?: number;
    release_year?: number;
    category_id?: string;
    created_by?: string;
    is_featured: boolean;
    is_published: boolean;
    play_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    genres?: Genre[];
    category?: ContentCategory;
}

export interface Documentary {
    id: string;
    title: string;
    slug: string;
    description?: string;
    poster_url?: string;
    banner_url?: string;
    trailer_url?: string;
    video_url: string;
    duration?: number;
    release_year?: number;
    rating?: number;
    category_id?: string;
    created_by?: string;
    is_featured: boolean;
    is_published: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    genres?: Genre[];
    category?: ContentCategory;
}

export interface Sport {
    id: string;
    title: string;
    slug: string;
    sport_type?: string;
    league?: string;
    teams?: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    event_date?: string;
    duration?: number;
    category_id?: string;
    created_by?: string;
    is_live: boolean;
    is_featured: boolean;
    is_published: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    category?: ContentCategory;
}

// ============================================
// FORM TYPES (for creating/editing content)
// ============================================

export interface SeriesFormData {
    title: string;
    description?: string;
    poster_url?: string;
    banner_url?: string;
    trailer_url?: string;
    release_year?: number;
    rating?: number;
    status: 'ongoing' | 'completed' | 'cancelled';
    category_id?: string;
    genre_ids: string[];
    is_featured: boolean;
    is_published: boolean;
}

export interface SeasonFormData {
    series_id: string;
    season_number: number;
    title?: string;
    description?: string;
    poster_url?: string;
    release_year?: number;
    is_published: boolean;
}

export interface EpisodeFormData {
    series_id: string;
    season_id: string;
    episode_number: number;
    title: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    duration?: number;
    release_date?: string;
    is_published: boolean;
}

export interface MovieFormData {
    title: string;
    description?: string;
    poster_url?: string;
    banner_url?: string;
    trailer_url?: string;
    video_url: string;
    duration?: number;
    release_year?: number;
    rating?: number;
    category_id?: string;
    genre_ids: string[];
    is_featured: boolean;
    is_published: boolean;
}

export interface MusicFormData {
    title: string;
    artist: string;
    album?: string;
    description?: string;
    cover_url?: string;
    audio_url: string;
    video_url?: string;
    duration?: number;
    release_year?: number;
    category_id?: string;
    genre_ids: string[];
    is_featured: boolean;
    is_published: boolean;
}

export interface DocumentaryFormData {
    title: string;
    description?: string;
    poster_url?: string;
    banner_url?: string;
    trailer_url?: string;
    video_url: string;
    duration?: number;
    release_year?: number;
    rating?: number;
    category_id?: string;
    genre_ids: string[];
    is_featured: boolean;
    is_published: boolean;
}

export interface SportFormData {
    title: string;
    sport_type?: string;
    league?: string;
    teams?: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    event_date?: string;
    duration?: number;
    category_id?: string;
    is_live: boolean;
    is_featured: boolean;
    is_published: boolean;
}

// ============================================
// UPLOAD TYPES
// ============================================

export interface UploadProgress {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    url?: string;
    error?: string;
}

export interface BulkEpisodeUpload {
    series_id: string;
    season_id: string;
    episodes: {
        episode_number: number;
        title: string;
        description?: string;
        video_file: File;
        thumbnail_file?: File;
        duration?: number;
        release_date?: string;
    }[];
}

// ============================================
// FILTER/SEARCH TYPES
// ============================================

export interface ContentFilters {
    category_id?: string;
    genre_ids?: string[];
    search?: string;
    release_year?: number;
    rating_min?: number;
    is_featured?: boolean;
    sort_by?: 'title' | 'release_year' | 'rating' | 'view_count' | 'created_at';
    sort_order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
