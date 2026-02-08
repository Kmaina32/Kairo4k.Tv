import React, { useState, useEffect, useRef } from 'react';
import { r2Service } from '../services/r2Service';
import { supabase } from '../services/supabaseClient';

interface MediaItem {
    id: string;
    title: string;
    description: string;
    category: string;
    cover_url: string;
    stream_url: string;
    release_year: number;
    genre: string;
    parent_id?: string;
    season_number?: number;
    episode_number?: number;
    is_active?: boolean;
}

interface SeriesManagerProps {
    onClose: () => void;
    onRefresh: () => void;
}

const CLOUDFLARE_BASE_URL = 'https://pub-a84b309a59b0432d9479ce0138fe01dd.r2.dev/';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return CLOUDFLARE_BASE_URL + url;
};

const SeriesManager = ({ onClose, onRefresh }: SeriesManagerProps) => {
    const [series, setSeries] = useState<MediaItem[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<MediaItem | null>(null);
    const [episodes, setEpisodes] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
    const [editingEpisode, setEditingEpisode] = useState<MediaItem | null>(null);

    // Episode form state
    const [episodeForm, setEpisodeForm] = useState({
        title: '',
        description: '',
        season_number: 1,
        episode_number: 1,
    });

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSeries();
    }, []);

    useEffect(() => {
        if (selectedSeries) {
            fetchEpisodes(selectedSeries.id);
        } else {
            setEpisodes([]);
        }
    }, [selectedSeries?.id]);

    const fetchSeries = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('media_library')
            .select('*')
            .eq('category', 'Series')
            .is('parent_id', null)
            .order('created_at', { ascending: false });

        if (data) setSeries(data);
        setLoading(false);
    };

    const fetchEpisodes = async (parentId: string) => {
        const { data } = await supabase
            .from('media_library')
            .select('*')
            .eq('parent_id', parentId)
            .order('season_number', { ascending: true })
            .order('episode_number', { ascending: true });

        if (data) setEpisodes(data);
    };

    const handleAddEpisode = async () => {
        if (!selectedSeries || !videoFile || !episodeForm.title) {
            alert('Please fill in all required fields and select a video');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Upload video
            const videoUrl = await r2Service.uploadFile(
                videoFile,
                'videos',
                (progress) => setUploadProgress(progress.percentage)
            );

            // Upload or generate cover
            let coverUrl = '';
            if (coverFile) {
                coverUrl = await r2Service.uploadFile(coverFile, 'covers');
            } else {
                try {
                    const thumbnail = await r2Service.generateThumbnail(videoFile);
                    coverUrl = await r2Service.uploadFile(thumbnail, 'covers');
                } catch {
                    coverUrl = selectedSeries.cover_url; // Use series cover as fallback
                }
            }

            // Insert episode into database
            const { error } = await supabase.from('media_library').insert({
                title: episodeForm.title,
                description: episodeForm.description,
                category: 'Episode',
                genre: selectedSeries.genre,
                release_year: selectedSeries.release_year,
                parent_id: selectedSeries.id,
                season_number: episodeForm.season_number,
                episode_number: episodeForm.episode_number,
                stream_url: videoUrl.replace(CLOUDFLARE_BASE_URL, ''),
                cover_url: coverUrl.replace(CLOUDFLARE_BASE_URL, ''),
                is_active: true,
            });

            if (error) throw error;

            alert('Episode added successfully!');
            resetEpisodeForm();
            fetchEpisodes(selectedSeries.id);
            setActiveTab('list');
            onRefresh();
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateEpisode = async () => {
        if (!editingEpisode || !episodeForm.title) {
            alert('Please fill in all required fields');
            return;
        }

        setIsUploading(true);

        try {
            let updateData: any = {
                title: episodeForm.title,
                description: episodeForm.description,
                season_number: episodeForm.season_number,
                episode_number: episodeForm.episode_number,
            };

            // Upload new video if provided
            if (videoFile) {
                const videoUrl = await r2Service.uploadFile(
                    videoFile,
                    'videos',
                    (progress) => setUploadProgress(progress.percentage)
                );
                updateData.stream_url = videoUrl.replace(CLOUDFLARE_BASE_URL, '');
            }

            // Upload new cover if provided
            if (coverFile) {
                const coverUrl = await r2Service.uploadFile(coverFile, 'covers');
                updateData.cover_url = coverUrl.replace(CLOUDFLARE_BASE_URL, '');
            }

            const { error } = await supabase
                .from('media_library')
                .update(updateData)
                .eq('id', editingEpisode.id);

            if (error) throw error;

            alert('Episode updated successfully!');
            setEditingEpisode(null);
            resetEpisodeForm();
            if (selectedSeries) fetchEpisodes(selectedSeries.id);
            setActiveTab('list');
            onRefresh();
        } catch (error: any) {
            console.error('Update error:', error);
            alert(`Update failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteEpisode = async (episode: MediaItem) => {
        if (!confirm(`Delete "${episode.title}"? This cannot be undone.`)) return;

        const { error } = await supabase
            .from('media_library')
            .delete()
            .eq('id', episode.id);

        if (error) {
            alert(`Delete failed: ${error.message}`);
        } else {
            if (selectedSeries) fetchEpisodes(selectedSeries.id);
            onRefresh();
        }
    };

    const handleToggleActive = async (episode: MediaItem) => {
        const { error } = await supabase
            .from('media_library')
            .update({ is_active: !episode.is_active })
            .eq('id', episode.id);

        if (!error && selectedSeries) {
            fetchEpisodes(selectedSeries.id);
        }
    };

    const startEditEpisode = (episode: MediaItem) => {
        setEditingEpisode(episode);
        setEpisodeForm({
            title: episode.title,
            description: episode.description || '',
            season_number: episode.season_number || 1,
            episode_number: episode.episode_number || 1,
        });
        setActiveTab('edit');
    };

    const resetEpisodeForm = () => {
        setEpisodeForm({
            title: '',
            description: '',
            season_number: 1,
            episode_number: getNextEpisodeNumber(),
        });
        setVideoFile(null);
        setCoverFile(null);
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    const getNextEpisodeNumber = () => {
        if (episodes.length === 0) return 1;
        const maxEp = Math.max(...episodes.map(e => e.episode_number || 0));
        return maxEp + 1;
    };

    // Group episodes by season
    const groupedByseason = episodes.reduce((acc, ep) => {
        const season = ep.season_number || 1;
        if (!acc[season]) acc[season] = [];
        acc[season].push(ep);
        return acc;
    }, {} as Record<number, MediaItem[]>);

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={selectedSeries ? () => { setSelectedSeries(null); setActiveTab('list'); } : onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-black uppercase tracking-widest text-white">
                                {selectedSeries ? selectedSeries.title : 'Series Manager'}
                            </h1>
                            <p className="text-xs text-slate-500 uppercase tracking-widest">
                                {selectedSeries ? `${episodes.length} Episodes` : `${series.length} Series`}
                            </p>
                        </div>
                    </div>

                    {selectedSeries && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => { resetEpisodeForm(); setActiveTab('add'); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'add'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                + Add Episode
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-6xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !selectedSeries ? (
                    // SERIES LIST
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {series.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSeries(s)}
                                className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all hover:scale-105"
                            >
                                {s.cover_url ? (
                                    <img
                                        src={getFullUrl(s.cover_url)}
                                        alt={s.title}
                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-orange-900/20 to-black">
                                        <span className="text-4xl">📺</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white truncate">{s.title}</h3>
                                    <p className="text-xs text-slate-400 mt-1">{s.release_year} • {s.genre}</p>
                                </div>
                                <div className="absolute top-3 right-3 bg-orange-600 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                                    Series
                                </div>
                            </button>
                        ))}

                        {series.length === 0 && (
                            <div className="col-span-full text-center py-20 opacity-50">
                                <span className="text-6xl block mb-4">📺</span>
                                <p className="text-sm uppercase tracking-widest">No series found</p>
                                <p className="text-xs text-slate-500 mt-2">Create a series first from the Media Upload panel</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'add' || activeTab === 'edit' ? (
                    // ADD/EDIT EPISODE FORM
                    <div className="max-w-2xl mx-auto space-y-6">
                        <h2 className="text-xl font-black uppercase tracking-widest text-orange-500 mb-6">
                            {activeTab === 'edit' ? 'Edit Episode' : 'Add New Episode'}
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Season Number
                                </label>
                                <input
                                    type="number"
                                    value={episodeForm.season_number}
                                    onChange={(e) => setEpisodeForm({ ...episodeForm, season_number: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Episode Number
                                </label>
                                <input
                                    type="number"
                                    value={episodeForm.episode_number}
                                    onChange={(e) => setEpisodeForm({ ...episodeForm, episode_number: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                Episode Title *
                            </label>
                            <input
                                type="text"
                                value={episodeForm.title}
                                onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                                placeholder="Episode title..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                Description
                            </label>
                            <textarea
                                value={episodeForm.description}
                                onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 h-24"
                                placeholder="Episode description..."
                            />
                        </div>

                        {/* Video Upload */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                Video File {activeTab === 'add' ? '*' : '(Leave empty to keep current)'}
                            </label>
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            <button
                                onClick={() => videoInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-orange-500/50 transition-all text-center disabled:opacity-50"
                            >
                                {videoFile ? (
                                    <div className="flex items-center gap-3 justify-center">
                                        <span className="text-2xl">🎬</span>
                                        <div className="text-left">
                                            <p className="text-sm text-white font-bold truncate">{videoFile.name}</p>
                                            <p className="text-xs text-slate-500">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 uppercase tracking-widest">Click to select video</p>
                                )}
                            </button>
                        </div>

                        {/* Cover Upload */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                                Cover Image (Optional - auto-generated if empty)
                            </label>
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500/50 transition-all text-center disabled:opacity-50"
                            >
                                {coverFile ? (
                                    <div className="flex items-center gap-3 justify-center">
                                        <span className="text-2xl">🖼️</span>
                                        <p className="text-sm text-white font-bold truncate">{coverFile.name}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 uppercase tracking-widest">Click to select cover</p>
                                )}
                            </button>
                        </div>

                        {/* Progress Bar */}
                        {isUploading && (
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-slate-400">Uploading...</span>
                                    <span className="text-orange-400 font-bold">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-600 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={activeTab === 'edit' ? handleUpdateEpisode : handleAddEpisode}
                                disabled={isUploading || !episodeForm.title || (activeTab === 'add' && !videoFile)}
                                className="flex-1 px-6 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all"
                            >
                                {isUploading ? 'Uploading...' : (activeTab === 'edit' ? 'Update Episode' : 'Add Episode')}
                            </button>
                            <button
                                onClick={() => { setActiveTab('list'); setEditingEpisode(null); resetEpisodeForm(); }}
                                disabled={isUploading}
                                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    // EPISODES LIST (Grouped by Season)
                    <div className="space-y-8">
                        {Object.keys(groupedByseason).length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <span className="text-6xl block mb-4">🎬</span>
                                <p className="text-sm uppercase tracking-widest">No episodes yet</p>
                                <button
                                    onClick={() => { resetEpisodeForm(); setActiveTab('add'); }}
                                    className="mt-4 px-6 py-3 bg-orange-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-orange-500 transition-all"
                                >
                                    Add First Episode
                                </button>
                            </div>
                        ) : (
                            Object.entries(groupedByseason).map(([season, eps]) => (
                                <div key={season}>
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-500 mb-4 flex items-center gap-4">
                                        Season {season}
                                        <span className="text-xs text-slate-500 font-normal">({eps.length} episodes)</span>
                                        <div className="flex-1 h-px bg-white/5" />
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {eps.map(ep => (
                                            <div
                                                key={ep.id}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${ep.is_active !== false
                                                        ? 'bg-white/5 border-white/10'
                                                        : 'bg-red-900/10 border-red-900/30 opacity-60'
                                                    }`}
                                            >
                                                <div className="w-16 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                                                    {ep.cover_url ? (
                                                        <img
                                                            src={getFullUrl(ep.cover_url)}
                                                            alt={ep.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                            <span className="text-lg">🎬</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded-full">
                                                            S{ep.season_number}E{ep.episode_number}
                                                        </span>
                                                        {ep.is_active === false && (
                                                            <span className="text-[10px] font-black bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">
                                                                HIDDEN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-white truncate mt-1">{ep.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => startEditEpisode(ep)}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(ep)}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                                                        title={ep.is_active !== false ? 'Hide' : 'Show'}
                                                    >
                                                        <svg className={`w-4 h-4 ${ep.is_active !== false ? 'text-yellow-400' : 'text-green-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            {ep.is_active !== false ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                            ) : (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            )}
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEpisode(ep)}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-red-600/20 transition-all"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeriesManager;
