
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AddPlaylistModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const AddPlaylistModal = ({ onClose, onSuccess }: AddPlaylistModalProps) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState('General');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic validation
        if (!name.trim() || !url.trim()) {
            setError('Name and URL are required.');
            setLoading(false);
            return;
        }

        try {
            const { error: insertError } = await supabase
                .from('playlists')
                .insert([{ name, url, type, is_active: true }]);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error adding playlist:', err);
            setError(err.message || 'Failed to add playlist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6">Add New Source</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sports HD"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">M3U URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/playlist.m3u"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all font-mono appearance-none"
                        >
                            <option value="General">General</option>
                            <option value="Sports">Sports</option>
                            <option value="Movies">Movies</option>
                            <option value="News">News</option>
                            <option value="Premium">Premium</option>
                            <option value="Region">Region</option>
                        </select>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
                        >
                            {loading ? 'Adding...' : 'Add Source'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPlaylistModal;
