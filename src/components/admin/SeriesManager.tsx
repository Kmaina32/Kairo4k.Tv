import React, { useState, useEffect } from 'react';
import { contentService } from '../../services/contentService';
import type { Series, Season, Episode, Genre, SeriesFormData, SeasonFormData, EpisodeFormData } from '../../types/content';

const SeriesManager = () => {
    const [series, setSeries] = useState<Series[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'list' | 'create-series' | 'manage-series' | 'create-season' | 'create-episode'>('list');

    // Form states
    const [seriesForm, setSeriesForm] = useState<SeriesFormData>({
        title: '',
        description: '',
        status: 'ongoing',
        genre_ids: [],
        is_featured: false,
        is_published: false
    });

    const [seasonForm, setSeasonForm] = useState<SeasonFormData>({
        series_id: '',
        season_number: 1,
        title: '',
        is_published: false
    });

    const [episodeForm, setEpisodeForm] = useState<EpisodeFormData>({
        series_id: '',
        season_id: '',
        episode_number: 1,
        title: '',
        video_url: '',
        is_published: false
    });

    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [seriesData, genresData] = await Promise.all([
                contentService.listSeries({ limit: 100 }),
                contentService.getGenres()
            ]);
            setSeries(seriesData.data);
            setGenres(genresData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSeries = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await contentService.createSeries(seriesForm);
            await loadData();
            setView('list');
            resetSeriesForm();
        } catch (error) {
            console.error('Error creating series:', error);
            alert('Failed to create series');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSeries) return;

        // Validation for duplicate season
        const exists = selectedSeries.seasons?.some(s => s.season_number === seasonForm.season_number);
        if (exists) {
            alert(`Season ${seasonForm.season_number} already exists for this series.`);
            return;
        }

        setLoading(true);
        try {
            await contentService.createSeason({
                ...seasonForm,
                series_id: selectedSeries.id
            });
            const updated = await contentService.getSeries(selectedSeries.id);
            setSelectedSeries(updated);
            setView('manage-series');
            resetSeasonForm();
        } catch (error) {
            console.error('Error creating season:', error);
            alert('Failed to create season');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEpisode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSeries || !selectedSeason) return;

        // Validation for duplicate episode
        const exists = selectedSeason.episodes?.some(ep => ep.episode_number === episodeForm.episode_number);
        if (exists) {
            alert(`Episode ${episodeForm.episode_number} already exists in Season ${selectedSeason.season_number}.`);
            return;
        }

        setLoading(true);
        try {
            await contentService.createEpisode({
                ...episodeForm,
                series_id: selectedSeries.id,
                season_id: selectedSeason.id
            });
            const updated = await contentService.getSeries(selectedSeries.id);
            setSelectedSeries(updated);
            // Update selected season to show new episode
            const newSeason = updated.seasons?.find(s => s.id === selectedSeason.id);
            if (newSeason) setSelectedSeason(newSeason);

            setView('manage-series');
            resetEpisodeForm();
        } catch (error) {
            console.error('Error creating episode:', error);
            alert('Failed to create episode');
        } finally {
            setLoading(false);
        }
    };

    const handleVideoUpload = async (file: File, field: 'series' | 'episode') => {
        const uploadId = `${field}-${Date.now()}`;
        try {
            const url = await contentService.uploadVideo(
                file,
                `videos/${field}`,
                (progress) => {
                    setUploadProgress(prev => ({ ...prev, [uploadId]: progress }));
                }
            );

            if (field === 'episode') {
                setEpisodeForm(prev => ({ ...prev, video_url: url }));
            }

            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uploadId];
                return newProgress;
            });
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload video');
        }
    };

    const availableSeasonNumbers = selectedSeries?.seasons
        ? Array.from({ length: 50 }, (_, i) => i + 1).filter(num => !selectedSeries.seasons?.some(s => s.season_number === num))
        : [];

    const availableEpisodeNumbers = selectedSeason?.episodes
        ? Array.from({ length: 100 }, (_, i) => i + 1).filter(num => !selectedSeason.episodes?.some(ep => ep.episode_number === num))
        : [];

    const handleImageUpload = async (file: File, field: keyof SeriesFormData) => {
        try {
            const url = await contentService.uploadImage(file, 'images/series');
            setSeriesForm(prev => ({ ...prev, [field]: url }));
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        }
    };

    const resetSeriesForm = () => {
        setSeriesForm({
            title: '',
            description: '',
            status: 'ongoing',
            genre_ids: [],
            is_featured: false,
            is_published: false
        });
    };

    const resetSeasonForm = () => {
        setSeasonForm({
            series_id: '',
            season_number: 1,
            title: '',
            is_published: false
        });
    };

    const resetEpisodeForm = () => {
        setEpisodeForm({
            series_id: '',
            season_id: '',
            episode_number: 1,
            title: '',
            video_url: '',
            is_published: false
        });
    };

    const handleManageSeries = async (seriesItem: Series) => {
        const fullSeries = await contentService.getSeries(seriesItem.id);
        setSelectedSeries(fullSeries);
        setView('manage-series');
    };

    const handleAddSeasonClick = () => {
        if (!selectedSeries) return;
        const maxSeason = selectedSeries.seasons?.reduce((max, s) => Math.max(max, s.season_number), 0) || 0;
        setSeasonForm(prev => ({ ...prev, season_number: maxSeason + 1 }));
        setView('create-season');
    };

    const handleAddEpisodeClick = (season: Season) => {
        setSelectedSeason(season);
        const maxEpisode = season.episodes?.reduce((max, e) => Math.max(max, e.episode_number), 0) || 0;
        setEpisodeForm(prev => ({ ...prev, episode_number: maxEpisode + 1 }));
        setView('create-episode');
    };

    return (
        <div className="space-y-6 pb-20">
            {/* HEADER */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-[32px] border border-white/10 p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">
                            Series Manager
                        </h2>
                        <p className="text-sm text-slate-400">Manage TV shows, web series, and episodic content</p>
                    </div>
                    <div className="flex gap-3">
                        {view !== 'list' && (
                            <button
                                onClick={() => {
                                    setView('list');
                                    setSelectedSeries(null);
                                    setSelectedSeason(null);
                                }}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all"
                            >
                                ← Back to List
                            </button>
                        )}
                        {view === 'list' && (
                            <button
                                onClick={() => setView('create-series')}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-black uppercase tracking-widest transition-all shadow-xl"
                            >
                                + Create Series
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* SERIES LIST VIEW */}
            {view === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {series.map(item => (
                        <div
                            key={item.id}
                            className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer"
                            onClick={() => handleManageSeries(item)}
                        >
                            <div className="aspect-[2/3] bg-gradient-to-br from-slate-800 to-black relative">
                                {item.poster_url ? (
                                    <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/10">
                                        {item.title[0]}
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2">
                                    {item.is_featured && (
                                        <span className="px-2 py-1 bg-yellow-500 text-black rounded-lg text-xs font-black">
                                            FEATURED
                                        </span>
                                    )}
                                    {item.is_published ? (
                                        <span className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-xs font-black">
                                            LIVE
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-slate-600 text-white rounded-lg text-xs font-black">
                                            DRAFT
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold text-white truncate">{item.title}</h3>
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                    <span>{item.total_seasons} Season{item.total_seasons !== 1 ? 's' : ''}</span>
                                    <span>•</span>
                                    <span>{item.total_episodes} Episode{item.total_episodes !== 1 ? 's' : ''}</span>
                                </div>
                                {item.rating && (
                                    <div className="mt-2 flex items-center gap-1">
                                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-sm font-bold text-white">{item.rating}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE SERIES FORM */}
            {view === 'create-series' && (
                <div className="bg-white/5 rounded-[32px] border border-white/10 p-8">
                    <h3 className="text-2xl font-black text-white mb-6">Create New Series</h3>
                    <form onSubmit={handleCreateSeries} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={seriesForm.title}
                                    onChange={e => setSeriesForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="Enter series title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Release Year</label>
                                <input
                                    type="number"
                                    value={seriesForm.release_year || ''}
                                    onChange={e => setSeriesForm(prev => ({ ...prev, release_year: parseInt(e.target.value) || undefined }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="2024"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-white mb-2">Description</label>
                            <textarea
                                value={seriesForm.description}
                                onChange={e => setSeriesForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                placeholder="Enter series description"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Status</label>
                                <select
                                    value={seriesForm.status}
                                    onChange={e => setSeriesForm(prev => ({ ...prev, status: e.target.value as any }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Rating</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={seriesForm.rating || ''}
                                    onChange={e => setSeriesForm(prev => ({ ...prev, rating: parseFloat(e.target.value) || undefined }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="8.5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Poster Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'poster_url')}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-white mb-2">Genres</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {genres.map(genre => (
                                    <label key={genre.id} className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={seriesForm.genre_ids.includes(genre.id)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSeriesForm(prev => ({ ...prev, genre_ids: [...prev.genre_ids, genre.id] }));
                                                } else {
                                                    setSeriesForm(prev => ({ ...prev, genre_ids: prev.genre_ids.filter(id => id !== genre.id) }));
                                                }
                                            }}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{genre.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-white cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={seriesForm.is_featured}
                                    onChange={e => setSeriesForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                                    className="rounded"
                                />
                                <span className="text-sm font-bold">Featured</span>
                            </label>

                            <label className="flex items-center gap-2 text-white cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={seriesForm.is_published}
                                    onChange={e => setSeriesForm(prev => ({ ...prev, is_published: e.target.checked }))}
                                    className="rounded"
                                />
                                <span className="text-sm font-bold">Publish Immediately</span>
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Series'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MANAGE SERIES VIEW */}
            {view === 'manage-series' && selectedSeries && (
                <div className="space-y-6">
                    {/* Series Info */}
                    <div className="bg-white/5 rounded-[32px] border border-white/10 p-8">
                        <div className="flex items-start gap-6">
                            {selectedSeries.poster_url && (
                                <img src={selectedSeries.poster_url} alt={selectedSeries.title} className="w-32 h-48 object-cover rounded-xl" />
                            )}
                            <div className="flex-1">
                                <h3 className="text-2xl font-black text-white mb-2">{selectedSeries.title}</h3>
                                <p className="text-slate-400 mb-4">{selectedSeries.description}</p>
                                <div className="flex gap-4 text-sm text-slate-400">
                                    <span>{selectedSeries.total_seasons} Seasons</span>
                                    <span>•</span>
                                    <span>{selectedSeries.total_episodes} Episodes</span>
                                    <span>•</span>
                                    <span className="capitalize">{selectedSeries.status}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleAddSeasonClick}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold transition-all"
                            >
                                + Add Season
                            </button>
                        </div>
                    </div>

                    {/* Seasons List */}
                    <div className="space-y-4">
                        {selectedSeries.seasons?.map(season => (
                            <div key={season.id} className="bg-white/5 rounded-2xl border border-white/10 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-white">
                                            Season {season.season_number}
                                            {season.title && `: ${season.title}`}
                                        </h4>
                                        <p className="text-sm text-slate-400">{season.total_episodes} episodes</p>
                                    </div>
                                    <button
                                        onClick={() => handleAddEpisodeClick(season)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-all"
                                    >
                                        + Add Episode
                                    </button>
                                </div>
                                {/* Episodes would be listed here */}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CREATE SEASON FORM */}
            {view === 'create-season' && selectedSeries && (
                <div className="bg-white/5 rounded-[32px] border border-white/10 p-8">
                    <h3 className="text-2xl font-black text-white mb-6">Add Season to {selectedSeries.title}</h3>
                    <form onSubmit={handleCreateSeason} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Season Number *</label>
                                <select
                                    required
                                    value={seasonForm.season_number}
                                    onChange={e => setSeasonForm(prev => ({ ...prev, season_number: parseInt(e.target.value) }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                >
                                    {[...availableSeasonNumbers, seasonForm.season_number]
                                        .sort((a, b) => a - b)
                                        .filter((v, i, a) => a.indexOf(v) === i)
                                        .map(num => (
                                            <option key={num} value={num}>Season {num}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Season Title (Optional)</label>
                                <input
                                    type="text"
                                    value={seasonForm.title}
                                    onChange={e => setSeasonForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="e.g., The Beginning"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-white mb-2">Description</label>
                            <textarea
                                value={seasonForm.description}
                                onChange={e => setSeasonForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Season'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('manage-series')}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CREATE EPISODE FORM */}
            {view === 'create-episode' && selectedSeries && selectedSeason && (
                <div className="bg-white/5 rounded-[32px] border border-white/10 p-8">
                    <h3 className="text-2xl font-black text-white mb-6">
                        Add Episode to {selectedSeries.title} - Season {selectedSeason.season_number}
                    </h3>
                    <form onSubmit={handleCreateEpisode} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Episode Number *</label>
                                <select
                                    required
                                    value={episodeForm.episode_number}
                                    onChange={e => setEpisodeForm(prev => ({ ...prev, episode_number: parseInt(e.target.value) }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                >
                                    {[...availableEpisodeNumbers, episodeForm.episode_number]
                                        .sort((a, b) => a - b)
                                        .filter((v, i, a) => a.indexOf(v) === i)
                                        .map(num => (
                                            <option key={num} value={num}>Episode {num}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Episode Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={episodeForm.title}
                                    onChange={e => setEpisodeForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="Enter episode title"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-white mb-2">Description</label>
                            <textarea
                                value={episodeForm.description}
                                onChange={e => setEpisodeForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-white mb-2">Video File *</label>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0], 'episode')}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            />
                            {Object.entries(uploadProgress).map(([id, progress]) => (
                                <div key={id} className="mt-2">
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Uploading...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-black/40 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading || !episodeForm.video_url}
                                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Episode'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('manage-series')}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default SeriesManager;
