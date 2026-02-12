import { supabase } from './supabaseClient';
import { r2Service } from './r2Service';
import type {
    Series, Season, Episode, Movie, Music, Documentary, Sport,
    SeriesFormData, SeasonFormData, EpisodeFormData,
    MovieFormData, MusicFormData, DocumentaryFormData, SportFormData,
    ContentFilters, PaginatedResponse, Genre, ContentCategory
} from '../types/content';

// ============================================
// CONTENT SERVICE
// ============================================
// Comprehensive service for managing all content types

class ContentService {
    // ============================================
    // CATEGORIES & GENRES
    // ============================================

    async getCategories(): Promise<ContentCategory[]> {
        const { data, error } = await supabase
            .from('content_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (error) throw error;
        return data || [];
    }

    async getGenres(categoryId?: string): Promise<Genre[]> {
        let query = supabase.from('genres').select('*');

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query.order('name');
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // SERIES MANAGEMENT
    // ============================================

    async createSeries(formData: SeriesFormData): Promise<Series> {
        const slug = this.generateSlug(formData.title);

        const { data: series, error } = await supabase
            .from('series')
            .insert({
                ...formData,
                slug,
                genre_ids: undefined // Remove genre_ids from main insert
            })
            .select()
            .single();

        if (error) throw error;

        // Link genres
        if (formData.genre_ids && formData.genre_ids.length > 0) {
            await this.linkSeriesGenres(series.id, formData.genre_ids);
        }

        return series;
    }

    async updateSeries(id: string, formData: Partial<SeriesFormData>): Promise<Series> {
        const updateData = { ...formData };
        delete updateData.genre_ids;

        const { data, error } = await supabase
            .from('series')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update genres if provided
        if (formData.genre_ids) {
            await this.updateSeriesGenres(id, formData.genre_ids);
        }

        return data;
    }

    async deleteSeries(id: string): Promise<void> {
        const { error } = await supabase
            .from('series')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async getSeries(id: string): Promise<Series> {
        const { data, error } = await supabase
            .from('series')
            .select(`
                *,
                genres:series_genres(genre:genres(*)),
                seasons(*, episodes(*))
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return this.transformSeriesData(data);
    }

    async listSeries(filters: ContentFilters = {}): Promise<PaginatedResponse<Series>> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('series')
            .select(`
                *,
                genres:series_genres(genre:genres(*)),
                category:content_categories(*)
            `, { count: 'exact' });

        // Apply filters
        if (filters.category_id) query = query.eq('category_id', filters.category_id);
        if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
        if (filters.search) query = query.ilike('title', `%${filters.search}%`);
        if (filters.release_year) query = query.eq('release_year', filters.release_year);
        if (filters.rating_min) query = query.gte('rating', filters.rating_min);

        // Sorting
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: (data || []).map(this.transformSeriesData),
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit)
        };
    }

    // ============================================
    // SEASON MANAGEMENT
    // ============================================

    async createSeason(formData: SeasonFormData): Promise<Season> {
        const { data, error } = await supabase
            .from('seasons')
            .insert(formData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateSeason(id: string, formData: Partial<SeasonFormData>): Promise<Season> {
        const { data, error } = await supabase
            .from('seasons')
            .update(formData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteSeason(id: string): Promise<void> {
        const { error } = await supabase
            .from('seasons')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async getSeasonsBySeries(seriesId: string): Promise<Season[]> {
        const { data, error } = await supabase
            .from('seasons')
            .select('*, episodes(*)')
            .eq('series_id', seriesId)
            .order('season_number');

        if (error) throw error;
        return data || [];
    }

    // ============================================
    // EPISODE MANAGEMENT
    // ============================================

    async createEpisode(formData: EpisodeFormData): Promise<Episode> {
        const slug = this.generateSlug(`${formData.title}-s${formData.season_id}-e${formData.episode_number}`);

        const { data, error } = await supabase
            .from('episodes')
            .insert({ ...formData, slug })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async bulkCreateEpisodes(episodes: EpisodeFormData[]): Promise<Episode[]> {
        const episodesWithSlugs = episodes.map(ep => ({
            ...ep,
            slug: this.generateSlug(`${ep.title}-s${ep.season_id}-e${ep.episode_number}`)
        }));

        const { data, error } = await supabase
            .from('episodes')
            .insert(episodesWithSlugs)
            .select();

        if (error) throw error;
        return data || [];
    }

    async updateEpisode(id: string, formData: Partial<EpisodeFormData>): Promise<Episode> {
        const { data, error } = await supabase
            .from('episodes')
            .update(formData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteEpisode(id: string): Promise<void> {
        const { error } = await supabase
            .from('episodes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async getEpisodesBySeason(seasonId: string): Promise<Episode[]> {
        const { data, error } = await supabase
            .from('episodes')
            .select('*')
            .eq('season_id', seasonId)
            .order('episode_number');

        if (error) throw error;
        return data || [];
    }

    async getEpisode(id: string): Promise<Episode> {
        const { data, error } = await supabase
            .from('episodes')
            .select(`
                *,
                season:seasons(*),
                series:series(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    // ============================================
    // MOVIE MANAGEMENT
    // ============================================

    async createMovie(formData: MovieFormData): Promise<Movie> {
        const slug = this.generateSlug(formData.title);

        const { data: movie, error } = await supabase
            .from('movies')
            .insert({
                ...formData,
                slug,
                genre_ids: undefined
            })
            .select()
            .single();

        if (error) throw error;

        if (formData.genre_ids && formData.genre_ids.length > 0) {
            await this.linkMovieGenres(movie.id, formData.genre_ids);
        }

        return movie;
    }

    async updateMovie(id: string, formData: Partial<MovieFormData>): Promise<Movie> {
        const updateData = { ...formData };
        delete updateData.genre_ids;

        const { data, error } = await supabase
            .from('movies')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (formData.genre_ids) {
            await this.updateMovieGenres(id, formData.genre_ids);
        }

        return data;
    }

    async deleteMovie(id: string): Promise<void> {
        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async listMovies(filters: ContentFilters = {}): Promise<PaginatedResponse<Movie>> {
        return this.listContent('movies', 'movie_genres', filters);
    }

    // ============================================
    // MUSIC MANAGEMENT
    // ============================================

    async createMusic(formData: MusicFormData): Promise<Music> {
        const slug = this.generateSlug(`${formData.artist}-${formData.title}`);

        const { data: music, error } = await supabase
            .from('music')
            .insert({
                ...formData,
                slug,
                genre_ids: undefined
            })
            .select()
            .single();

        if (error) throw error;

        if (formData.genre_ids && formData.genre_ids.length > 0) {
            await this.linkMusicGenres(music.id, formData.genre_ids);
        }

        return music;
    }

    async updateMusic(id: string, formData: Partial<MusicFormData>): Promise<Music> {
        const updateData = { ...formData };
        delete updateData.genre_ids;

        const { data, error } = await supabase
            .from('music')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (formData.genre_ids) {
            await this.updateMusicGenres(id, formData.genre_ids);
        }

        return data;
    }

    async deleteMusic(id: string): Promise<void> {
        const { error } = await supabase
            .from('music')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async listMusic(filters: ContentFilters = {}): Promise<PaginatedResponse<Music>> {
        return this.listContent('music', 'music_genres', filters);
    }

    // ============================================
    // DOCUMENTARY MANAGEMENT
    // ============================================

    async createDocumentary(formData: DocumentaryFormData): Promise<Documentary> {
        const slug = this.generateSlug(formData.title);

        const { data: doc, error } = await supabase
            .from('documentaries')
            .insert({
                ...formData,
                slug,
                genre_ids: undefined
            })
            .select()
            .single();

        if (error) throw error;

        if (formData.genre_ids && formData.genre_ids.length > 0) {
            await this.linkDocumentaryGenres(doc.id, formData.genre_ids);
        }

        return doc;
    }

    async updateDocumentary(id: string, formData: Partial<DocumentaryFormData>): Promise<Documentary> {
        const updateData = { ...formData };
        delete updateData.genre_ids;

        const { data, error } = await supabase
            .from('documentaries')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (formData.genre_ids) {
            await this.updateDocumentaryGenres(id, formData.genre_ids);
        }

        return data;
    }

    async deleteDocumentary(id: string): Promise<void> {
        const { error } = await supabase
            .from('documentaries')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async listDocumentaries(filters: ContentFilters = {}): Promise<PaginatedResponse<Documentary>> {
        return this.listContent('documentaries', 'documentary_genres', filters);
    }

    // ============================================
    // SPORTS MANAGEMENT
    // ============================================

    async createSport(formData: SportFormData): Promise<Sport> {
        const slug = this.generateSlug(formData.title);

        const { data, error } = await supabase
            .from('sports')
            .insert({ ...formData, slug })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateSport(id: string, formData: Partial<SportFormData>): Promise<Sport> {
        const { data, error } = await supabase
            .from('sports')
            .update(formData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteSport(id: string): Promise<void> {
        const { error } = await supabase
            .from('sports')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async listSports(filters: ContentFilters = {}): Promise<PaginatedResponse<Sport>> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('sports')
            .select('*, category:content_categories(*)', { count: 'exact' });

        if (filters.category_id) query = query.eq('category_id', filters.category_id);
        if (filters.search) query = query.ilike('title', `%${filters.search}%`);

        const sortBy = filters.sort_by || 'event_date';
        const sortOrder = filters.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit)
        };
    }

    // ============================================
    // UPLOAD HELPERS
    // ============================================

    async uploadVideo(file: File, folder: string, onProgress?: (progress: number) => void): Promise<string> {
        const url = await r2Service.uploadFile(file, folder, (progress: any) => {
            if (onProgress) onProgress(progress.percentage);
        });
        return url;
    }

    async uploadImage(file: File, folder: string): Promise<string> {
        const url = await r2Service.uploadFile(file, folder);
        return url;
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private generateSlug(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private async linkSeriesGenres(seriesId: string, genreIds: string[]): Promise<void> {
        const links = genreIds.map(genreId => ({ series_id: seriesId, genre_id: genreId }));
        const { error } = await supabase.from('series_genres').insert(links);
        if (error) throw error;
    }

    private async updateSeriesGenres(seriesId: string, genreIds: string[]): Promise<void> {
        await supabase.from('series_genres').delete().eq('series_id', seriesId);
        await this.linkSeriesGenres(seriesId, genreIds);
    }

    private async linkMovieGenres(movieId: string, genreIds: string[]): Promise<void> {
        const links = genreIds.map(genreId => ({ movie_id: movieId, genre_id: genreId }));
        const { error } = await supabase.from('movie_genres').insert(links);
        if (error) throw error;
    }

    private async updateMovieGenres(movieId: string, genreIds: string[]): Promise<void> {
        await supabase.from('movie_genres').delete().eq('movie_id', movieId);
        await this.linkMovieGenres(movieId, genreIds);
    }

    private async linkMusicGenres(musicId: string, genreIds: string[]): Promise<void> {
        const links = genreIds.map(genreId => ({ music_id: musicId, genre_id: genreId }));
        const { error } = await supabase.from('music_genres').insert(links);
        if (error) throw error;
    }

    private async updateMusicGenres(musicId: string, genreIds: string[]): Promise<void> {
        await supabase.from('music_genres').delete().eq('music_id', musicId);
        await this.linkMusicGenres(musicId, genreIds);
    }

    private async linkDocumentaryGenres(docId: string, genreIds: string[]): Promise<void> {
        const links = genreIds.map(genreId => ({ documentary_id: docId, genre_id: genreId }));
        const { error } = await supabase.from('documentary_genres').insert(links);
        if (error) throw error;
    }

    private async updateDocumentaryGenres(docId: string, genreIds: string[]): Promise<void> {
        await supabase.from('documentary_genres').delete().eq('documentary_id', docId);
        await this.linkDocumentaryGenres(docId, genreIds);
    }

    private transformSeriesData(data: any): Series {
        return {
            ...data,
            genres: data.genres?.map((g: any) => g.genre) || []
        };
    }

    private async listContent<T>(
        table: string,
        genreTable: string,
        filters: ContentFilters
    ): Promise<PaginatedResponse<T>> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from(table)
            .select(`
                *,
                genres:${genreTable}(genre:genres(*)),
                category:content_categories(*)
            `, { count: 'exact' });

        if (filters.category_id) query = query.eq('category_id', filters.category_id);
        if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
        if (filters.search) query = query.ilike('title', `%${filters.search}%`);
        if (filters.release_year) query = query.eq('release_year', filters.release_year);
        if (filters.rating_min) query = query.gte('rating', filters.rating_min);

        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: (data || []).map((item: any) => ({
                ...item,
                genres: item.genres?.map((g: any) => g.genre) || []
            })) as T[],
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit)
        };
    }
}

export const contentService = new ContentService();
