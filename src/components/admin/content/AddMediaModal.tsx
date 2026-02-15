import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { CLOUDFLARE_BASE_URL } from '../../../constants';
import R2FileBrowser from './R2FileBrowser';

interface MediaModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // If provided, we are in EDIT mode
    parentId?: string; // If provided, we are adding an EPISODE
}

const MediaModal = ({ onClose, onSuccess, initialData, parentId }: MediaModalProps) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [streamUrl, setStreamUrl] = useState(initialData?.stream_url || '');
    const [coverUrl, setCoverUrl] = useState(initialData?.cover_url || '');
    const [category, setCategory] = useState(initialData?.category || (parentId ? 'Episode' : 'Movie'));
    const [releaseYear, setReleaseYear] = useState(initialData?.release_year?.toString() || '');
    const [seasonNumber, setSeasonNumber] = useState(initialData?.season_number?.toString() || '');
    const [episodeNumber, setEpisodeNumber] = useState(initialData?.episode_number?.toString() || '');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showR2Browser, setShowR2Browser] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!title.trim() || !streamUrl.trim()) {
            setError('Title and Stream URL are required.');
            setLoading(false);
            return;
        }

        let finalStreamUrl = streamUrl;

        // Auto-prepend Cloudflare URL if only filename is provided
        if (!streamUrl.startsWith('http') && !streamUrl.startsWith('data:')) {
            finalStreamUrl = CLOUDFLARE_BASE_URL + streamUrl.replace(/^\/+/, '');
        }

        const payload: any = {
            title,
            description,
            stream_url: finalStreamUrl,
            cover_url: coverUrl,
            category,
            release_year: releaseYear ? parseInt(releaseYear) : null,
            season_number: seasonNumber ? parseInt(seasonNumber) : null,
            episode_number: episodeNumber ? parseInt(episodeNumber) : null,
            parent_id: parentId || initialData?.parent_id || null,
            is_active: initialData ? initialData.is_active : true
        };

        try {
            if (initialData?.id) {
                // Update via upsert (uses POST to avoid CORS PATCH restriction)
                const { error: updateError } = await supabase
                    .from('media_library')
                    .upsert({ id: initialData.id, ...payload }, { onConflict: 'id' });
                if (updateError) throw updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('media_library')
                    .insert([payload]);
                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving media:', err);
            setError(err.message || 'Failed to save media.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6">
                    {initialData ? 'Edit Content' : parentId ? 'Add Episode' : 'Add Content'}
                </h2>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. The Matrix"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono appearance-none"
                            >
                                <option value="Movie">Movie</option>
                                <option value="Series">Series</option>
                                <option value="Episode">Episode</option>
                                <option value="Fallen">Fallen</option>
                                <option value="Documentary">Documentary</option>
                                <option value="Music">Music</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Release Year</label>
                            <input
                                type="number"
                                value={releaseYear}
                                onChange={(e) => setReleaseYear(e.target.value)}
                                placeholder="1999"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>

                    {category === 'Episode' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Season</label>
                                <input
                                    type="number"
                                    value={seasonNumber}
                                    onChange={(e) => setSeasonNumber(e.target.value)}
                                    placeholder="1"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Episode</label>
                                <input
                                    type="number"
                                    value={episodeNumber}
                                    onChange={(e) => setEpisodeNumber(e.target.value)}
                                    placeholder="1"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Plot summary..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono resize-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stream URL (R2 Filename or Full URL)</label>
                            <button
                                type="button"
                                onClick={() => setShowR2Browser(true)}
                                className="text-[9px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                Browse R2
                            </button>
                        </div>
                        <input
                            type="text"
                            value={streamUrl}
                            onChange={(e) => setStreamUrl(e.target.value)}
                            placeholder="movie.mp4 or https://..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                        />
                    </div>

                    {/* R2 BROWSER MODAL */}
                    {showR2Browser && (
                        <R2FileBrowser
                            onSelect={(filename) => {
                                setStreamUrl(filename);
                                setShowR2Browser(false);
                            }}
                            onClose={() => setShowR2Browser(false)}
                        />
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cover Art URL</label>
                        <input
                            type="text"
                            value={coverUrl}
                            onChange={(e) => setCoverUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                        />
                    </div>

                    <div className="flex gap-3 mt-8 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-[0_4px_20px_rgba(147,51,234,0.3)]"
                        >
                            {loading ? 'Saving...' : initialData ? 'Update Item' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MediaModal;
