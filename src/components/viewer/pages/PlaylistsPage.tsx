
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

interface Playlist {
    id: string;
    name: string;
    description: string;
    is_public: boolean;
    created_at: string;
}

interface MediaItem {
    id: string;
    title: string;
    cover_url: string;
    stream_url: string;
    category: string;
}

const PlaylistsPage = ({ onSelectMedia }: { onSelectMedia: (m: any) => void }) => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [playlistItems, setPlaylistItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
            .from('user_media_playlists')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
        if (data) setPlaylists(data);
        setLoading(false);
    };

    const fetchPlaylistItems = async (playlistId: string) => {
        const { data } = await supabase
            .from('playlist_media_items')
            .select('media_library(*)')
            .eq('playlist_id', playlistId);

        if (data) {
            setPlaylistItems(data.map((item: any) => item.media_library));
        }
    };

    const handleCreatePlaylist = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !newPlaylistName) return;

        const { data, error } = await supabase
            .from('user_media_playlists')
            .insert({
                user_id: session.user.id,
                name: newPlaylistName,
                is_public: false
            })
            .select()
            .single();

        if (data) {
            setPlaylists([data, ...playlists]);
            setNewPlaylistName('');
            setShowCreateModal(false);
        }
    };

    const deletePlaylist = async (id: string) => {
        if (!confirm('Are you sure you want to delete this playlist?')) return;
        const { error } = await supabase.from('user_media_playlists').delete().eq('id', id);
        if (!error) {
            setPlaylists(playlists.filter(p => p.id !== id));
            if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
        }
    };

    if (selectedPlaylist) {
        return (
            <div className="p-6 lg:p-12 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8 md:mb-12">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button
                            onClick={() => setSelectedPlaylist(null)}
                            className="p-3 md:p-4 bg-white/5 hover:bg-orange-600 rounded-2xl text-white transition-all group"
                        >
                            <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-1 md:mb-2">{selectedPlaylist.name}</h1>
                            <p className="text-slate-500 font-medium text-[9px] md:text-[10px] uppercase tracking-widest">{playlistItems.length} videos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => deletePlaylist(selectedPlaylist.id)}
                        className="px-4 md:px-6 py-2 md:py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Delete
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                    {playlistItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onSelectMedia(item)}
                            className="group relative aspect-[2/3] rounded-2xl md:rounded-3xl overflow-hidden bg-white/5 border border-white/5 hover:border-orange-500/50 transition-all hover:scale-105 hover:z-10 shadow-2xl"
                        >
                            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5">
                                <h3 className="text-[10px] md:text-xs font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">{item.title}</h3>
                            </div>
                        </button>
                    ))}
                    {playlistItems.length === 0 && (
                        <div className="col-span-full py-20 md:py-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-[30px] md:rounded-[40px]">
                            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">No videos here</p>
                            <p className="text-[8px] md:text-[9px] mt-2">Add videos from the Home page</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">My Playlists</h1>
                    <p className="text-slate-500 font-medium text-[9px] md:text-[10px] uppercase tracking-widest">Manage your personal video collections</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-orange-600 text-white rounded-[20px] md:rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 4v16m8-8H4" /></svg>
                    New Playlist
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {playlists.map(pl => (
                    <button
                        key={pl.id}
                        onClick={() => { setSelectedPlaylist(pl); fetchPlaylistItems(pl.id); }}
                        className="group relative p-6 md:p-8 bg-white/5 border border-white/5 hover:border-orange-500/30 rounded-[30px] md:rounded-[40px] transition-all hover:bg-white/[0.07] text-left overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 md:p-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl">
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-[16px] md:rounded-[20px] flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-6 h-6 md:w-8 md:h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mb-1 md:mb-2">{pl.name}</h3>
                        <p className="text-slate-500 text-[9px] md:text-[10px] font-medium uppercase tracking-widest">Created on {new Date(pl.created_at).toLocaleDateString()}</p>
                    </button>
                ))}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
                    <div className="bg-slate-900 border border-white/10 rounded-[30px] md:rounded-[40px] p-8 md:p-10 w-full max-w-lg relative animate-in zoom-in duration-300 shadow-2xl">
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-6 md:mb-8">New Playlist</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Name</label>
                                <input
                                    type="text"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    placeholder="e.g. My Favorites"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-5 md:px-6 py-3 md:py-4 text-white font-black placeholder:text-slate-700 focus:outline-none focus:border-orange-500 transition-all text-sm"
                                />
                            </div>
                            <button
                                onClick={handleCreatePlaylist}
                                className="w-full py-4 md:py-5 bg-orange-600 text-white rounded-2xl md:rounded-3xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/20"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaylistsPage;
