
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface MediaInteractionBarProps {
    mediaId: string;
    initialViews?: number;
    initialLikes?: number;
    initialDislikes?: number;
    onAddToPlaylist?: () => void;
    triggerView?: boolean;
}

const MediaInteractionBar = ({
    mediaId,
    initialViews = 0,
    initialLikes = 0,
    initialDislikes = 0,
    onAddToPlaylist,
    triggerView = false
}: MediaInteractionBarProps) => {
    const [views, setViews] = useState(initialViews);
    const [viewCounted, setViewCounted] = useState(false);
    const [likes, setLikes] = useState(initialLikes);
    const [dislikes, setDislikes] = useState(initialDislikes);
    const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
    const [hasLiked, setHasLiked] = useState(false);
    const [hasDisliked, setHasDisliked] = useState(false);
    const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Reset view counted state when media changes
        setViewCounted(false);
        setViews(initialViews);
        setLikes(initialLikes);
        setDislikes(initialDislikes);

        fetchPlaylists();
        checkIfSaved();
    }, [mediaId, initialViews, initialLikes, initialDislikes]);

    useEffect(() => {
        if (triggerView && !viewCounted) {
            handleInteraction('views');
            setViewCounted(true);
        }
    }, [triggerView, viewCounted]);

    const checkIfSaved = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
            .from('user_media_favorites')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('media_id', mediaId)
            .maybeSingle();
        setIsSaved(!!data);
    };

    const fetchPlaylists = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
            .from('user_media_playlists')
            .select('*')
            .eq('user_id', session.user.id);
        if (data) setUserPlaylists(data);
    };

    const handleInteraction = async (type: 'views' | 'likes' | 'dislikes') => {
        if (type === 'likes' && hasLiked) return;
        if (type === 'dislikes' && hasDisliked) return;

        const { error } = await supabase.rpc('increment_media_counter', {
            media_id: mediaId,
            counter_name: type
        });

        if (!error) {
            if (type === 'views') setViews(prev => prev + 1);
            if (type === 'likes') {
                setLikes(prev => prev + 1);
                setHasLiked(true);
                if (hasDisliked) {
                    setDislikes(prev => Math.max(0, prev - 1));
                    setHasDisliked(false);
                }
            }
            if (type === 'dislikes') {
                setDislikes(prev => prev + 1);
                setHasDisliked(true);
                if (hasLiked) {
                    setLikes(prev => Math.max(0, prev - 1));
                    setHasLiked(false);
                }
            }
        }
    };

    const addToPlaylist = async (playlistId: string) => {
        const { error } = await supabase
            .from('playlist_media_items')
            .insert({ playlist_id: playlistId, media_id: mediaId });

        if (error) {
            console.error('Error adding to playlist:', error);
        } else {
            setShowPlaylistDropdown(false);
            alert('Added to playlist!');
        }
    };

    const handleCreatePlaylist = async () => {
        const playlistName = prompt('Enter a name for your new playlist:');
        if (!playlistName || playlistName.trim() === '') {
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('You must be logged in to create a playlist.');
            return;
        }

        const { data, error } = await supabase
            .from('user_media_playlists')
            .insert({ user_id: session.user.id, name: playlistName.trim() })
            .select()
            .single();

        if (error) {
            console.error('Error creating playlist:', error);
            alert('Failed to create playlist.');
        } else if (data) {
            setUserPlaylists(prev => [...prev, data]);
            setShowPlaylistDropdown(false);
            alert(`Playlist "${data.name}" created!`);
        }
    };

    const toggleSave = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Please login to save content');
            return;
        }

        if (isSaved) {
            const { error } = await supabase
                .from('user_media_favorites')
                .delete()
                .eq('user_id', session.user.id)
                .eq('media_id', mediaId);
            if (!error) setIsSaved(false);
        } else {
            const { error } = await supabase
                .from('user_media_favorites')
                .insert({ user_id: session.user.id, media_id: mediaId });
            if (!error) setIsSaved(true);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'KAIRO 4K',
                text: 'Check out this video on KAIRO 4K',
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied!');
        }
    };

    return (
        <div className="flex flex-col gap-4 py-4 md:py-6 border-t border-white/5 mt-6 md:mt-8">
            {/* MOBILE: Compact Single Row Layout */}
            <div className="flex md:hidden items-center justify-end gap-1.5 px-2 ml-auto">
                {/* Actions - Compact Icons Only */}
                {/* Like */}
                <button
                    onClick={() => handleInteraction('likes')}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all ${hasLiked ? 'bg-orange-600 border-orange-500' : 'bg-white/5 border-white/5'}`}
                >
                    <svg className={`w-3.5 h-3.5 ${hasLiked ? 'text-white' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" /></svg>
                    <span className={`text-xs font-black ${hasLiked ? 'text-white' : 'text-slate-200'}`}>{likes}</span>
                </button>
                {/* Dislike */}
                <button
                    onClick={() => handleInteraction('dislikes')}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all ${hasDisliked ? 'bg-red-600/20 border-red-500/30' : 'bg-white/5 border-white/5'}`}
                >
                    <svg className={`w-3.5 h-3.5 ${hasDisliked ? 'text-red-500' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" /></svg>
                    <span className={`text-xs font-black ${hasDisliked ? 'text-red-500' : 'text-slate-200'}`}>{dislikes}</span>
                </button>
                {/* Share */}
                <button
                    onClick={handleShare}
                    className="flex items-center justify-center w-9 h-9 border rounded-xl transition-all active:scale-95 bg-white/5 border-white/5"
                    title="Share"
                >
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                {/* Save */}
                <button
                    onClick={toggleSave}
                    className={`flex items-center justify-center w-9 h-9 border rounded-xl transition-all active:scale-95 ${isSaved ? 'bg-orange-600 border-orange-500' : 'bg-white/5 border-white/5'}`}
                    title={isSaved ? 'Saved' : 'Save'}
                >
                    <svg className={`w-3.5 h-3.5 ${isSaved ? 'text-white fill-current' : 'text-slate-400'}`} fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
                {/* Add to Playlist */}
                <div className="relative">
                    <button
                        onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                        className={`flex items-center justify-center w-9 h-9 border rounded-xl transition-all active:scale-95 ${showPlaylistDropdown ? 'bg-orange-600 border-orange-500' : 'bg-white/5 border-white/5'}`}
                        title="Add to Playlist"
                    >
                        <svg className={`w-3.5 h-3.5 ${showPlaylistDropdown ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
                    </button>

                    {showPlaylistDropdown && (
                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#0f172a] border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-[100]">
                            <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1">
                                {userPlaylists.length > 0 ? (
                                    userPlaylists.map(pl => (
                                        <button
                                            key={pl.id}
                                            onClick={() => addToPlaylist(pl.id)}
                                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-between group"
                                        >
                                            {pl.name}
                                            <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 4v16m8-8H4" /></svg>
                                        </button>
                                    ))
                                ) : (
                                    <p className="p-3 text-[9px] font-medium text-slate-500 uppercase text-center">No playlists yet</p>
                                )}
                            </div>
                            <div className="pt-2 mt-2 border-t border-white/5">
                                <button
                                    onClick={handleCreatePlaylist}
                                    className="w-full px-3 py-2 rounded-xl bg-orange-600/10 text-orange-500 text-[8px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all"
                                >
                                    New Playlist
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DESKTOP: Single Line Layout */}
            <div className="hidden md:flex items-center justify-between gap-6">
                {/* STATS */}
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center border border-orange-500/20">
                            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Views</span>
                            <span className="text-lg font-black text-white leading-none">{views.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-white/5" />

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleInteraction('likes')}
                            className={`group flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${hasLiked ? 'bg-orange-600 border-orange-500 shadow-lg shadow-orange-900/20' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                        >
                            <svg className={`w-5 h-5 ${hasLiked ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" /></svg>
                            <span className={`text-sm font-black ${hasLiked ? 'text-white' : 'text-slate-200'}`}>{likes}</span>
                        </button>
                        <button
                            onClick={() => handleInteraction('dislikes')}
                            className={`group flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${hasDisliked ? 'bg-red-600/20 border-red-500/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                        >
                            <svg className={`w-5 h-5 ${hasDisliked ? 'text-red-500' : 'text-slate-400 group-hover:text-white'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" /></svg>
                            <span className={`text-sm font-black ${hasDisliked ? 'text-red-500' : 'text-slate-200'}`}>{dislikes}</span>
                        </button>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center w-12 h-12 bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl text-slate-200 transition-all group active:scale-95 shadow-xl"
                        title="Share"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>

                    <button
                        onClick={toggleSave}
                        className={`flex items-center gap-3 px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group active:scale-95 ${isSaved ? 'bg-orange-600 border-orange-500 text-white' : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-200'}`}
                    >
                        <svg className={`w-4 h-4 transition-all ${isSaved ? 'fill-current' : 'text-slate-400 group-hover:text-white'}`} fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                            className={`flex items-center gap-3 px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group active:scale-95 ${showPlaylistDropdown ? 'bg-orange-600 border-orange-500 text-white' : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-200'}`}
                        >
                            <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
                            Add to Playlist
                        </button>

                        {showPlaylistDropdown && (
                            <div className="absolute bottom-full right-0 mb-4 w-64 bg-[#0f172a] border border-white/10 rounded-3xl p-3 shadow-2xl backdrop-blur-2xl z-[100] animate-in slide-in-from-bottom-2 duration-300">
                                <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">
                                    {userPlaylists.length > 0 ? (
                                        userPlaylists.map(pl => (
                                            <button
                                                key={pl.id}
                                                onClick={() => addToPlaylist(pl.id)}
                                                className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-between group"
                                            >
                                                {pl.name}
                                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="p-4 text-[10px] font-medium text-slate-500 uppercase text-center">No playlists yet</p>
                                    )}
                                </div>
                                <div className="pt-2 mt-2 border-t border-white/5">
                                    <button
                                        onClick={handleCreatePlaylist}
                                        className="w-full px-4 py-3 rounded-2xl bg-orange-600/10 text-orange-500 text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all"
                                    >
                                        New Playlist
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaInteractionBar;
