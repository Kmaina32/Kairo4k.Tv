import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { CLOUDFLARE_BASE_URL } from '../../constants';
import { AppView } from '../../types';
import VideoPlayer from './VideoPlayer';
import MediaInteractionBar from './MediaInteractionBar';
import MobileEpisodeSelector from './MobileEpisodeSelector';

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
    views_count?: number;
    likes_count?: number;
    dislikes_count?: number;
}

interface MoviesPageProps {
    onBack: () => void;
    onViewChange?: (view: AppView) => void;
    activeCategory?: string;
    onCategoryChange?: (category: string) => void;
}



const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;

    // Split by / to encode each part individually, then join back
    const pathSegments = url.replace(/^\//, '').split('/');
    const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
    return CLOUDFLARE_BASE_URL + encodedSegments.join('/');
};

const MoviesPage = ({ onBack, onViewChange, activeCategory: propsActiveCategory, onCategoryChange: propsSetCategory }: MoviesPageProps) => {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [episodes, setEpisodes] = useState<MediaItem[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(() => {
        const saved = localStorage.getItem('nexus_selected_media');
        return saved ? JSON.parse(saved) : null;
    });
    const [activeEpisode, setActiveEpisode] = useState<MediaItem | null>(() => {
        const saved = localStorage.getItem('nexus_active_episode');
        return saved ? JSON.parse(saved) : null;
    });
    const [isTheater, setIsTheater] = useState(() => {
        return localStorage.getItem('nexus_media_theater') === 'true';
    });
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [watchTime, setWatchTime] = useState(0);
    const [viewTriggered, setViewTriggered] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [localActiveCategory, setLocalActiveCategory] = useState(() => {
        const isMobileDevice = window.innerWidth < 768;
        if (isMobileDevice) return 'Movie';
        return localStorage.getItem('nexus_media_category') || 'All';
    });

    const activeCategory = propsActiveCategory || localActiveCategory;
    const setActiveCategory = propsSetCategory || setLocalActiveCategory;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset watch time and description state when media changes
    useEffect(() => {
        setWatchTime(0);
        setViewTriggered(false);
        setIsDescriptionExpanded(false);
    }, [selectedMedia?.id, activeEpisode?.id]);

    useEffect(() => {
        if (!isMobile) {
            localStorage.setItem('nexus_media_category', activeCategory);
        }
    }, [activeCategory, isMobile]);

    useEffect(() => {
        if (selectedMedia) {
            localStorage.setItem('nexus_selected_media', JSON.stringify(selectedMedia));
        } else {
            localStorage.removeItem('nexus_selected_media');
        }
    }, [selectedMedia]);

    useEffect(() => {
        if (activeEpisode) {
            localStorage.setItem('nexus_active_episode', JSON.stringify(activeEpisode));
        } else {
            localStorage.removeItem('nexus_active_episode');
        }
    }, [activeEpisode]);

    useEffect(() => {
        localStorage.setItem('nexus_media_theater', isTheater.toString());
    }, [isTheater]);

    // Handle Series episodes fetch on load/restore
    useEffect(() => {
        if (selectedMedia?.category === 'Series') {
            fetchEpisodes(selectedMedia.id);
        }
    }, [selectedMedia?.id]);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        // Fetch only top-level items (not episodes)
        const { data } = await supabase
            .from('media_library')
            .select('*')
            .eq('is_active', true)
            .is('parent_id', null)
            .order('created_at', { ascending: false });

        if (data) setMedia(data);
        setLoading(false);
    };

    const fetchEpisodes = async (parentId: string) => {
        const { data } = await supabase
            .from('media_library')
            .select('*')
            .eq('parent_id', parentId)
            .eq('is_active', true)
            .order('season_number', { ascending: true })
            .order('episode_number', { ascending: true });

        if (data) {
            setEpisodes(data);
            // Autoplay: If no episode is active and it's a series, pick the first one
            if (!activeEpisode && data.length > 0) {
                setActiveEpisode(data[0]);
            }
        }
    };

    const handleSelectMedia = (item: MediaItem) => {
        setSelectedMedia(item);
        if (item.category === 'Series') {
            fetchEpisodes(item.id);
            setActiveEpisode(null);
        } else {
            setEpisodes([]);
            setActiveEpisode(null);
        }
    };

    const categories = ['All', 'Movie', 'Series', 'Fallen', 'Documentary', 'Music'];
    const filteredMedia = activeCategory === 'All'
        ? media
        : media.filter(m => m.category === activeCategory);

    // If watching something
    const currentPlayingItem = activeEpisode || (selectedMedia?.category !== 'Series' ? selectedMedia : null);

    if (selectedMedia) {
        return (
            <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col animate-in fade-in duration-500 overflow-hidden">
                {/* HEADER WITH APP NAME (LEFT ALIGNED) */}
                <div className="absolute top-0 left-0 right-0 z-[60] h-16 flex items-center justify-start px-4 md:px-8 bg-gradient-to-b from-black/95 to-transparent pointer-events-none">
                    <h1 className="text-xl md:text-2xl font-black tracking-[0.2em] drop-shadow-md uppercase kairo-cyber-glow pointer-events-auto">
                        KAIRO<span className="text-white">4K</span>
                    </h1>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* NEW SIDEBAR CORE */}
                    {!isMobile && (
                        <div className="w-72 border-r border-white/5 bg-black/40 flex flex-col p-8 pt-24 shrink-0 overflow-y-auto no-scrollbar hidden lg:flex">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/40 mb-8">Menu</h3>
                            <div className="space-y-8">
                                <nav className="space-y-2">
                                    <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Now Playing
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedMedia(null);
                                            onViewChange?.('playlists');
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        Playlists
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedMedia(null);
                                            onViewChange?.('subscriptions');
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                        Subscribed
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedMedia(null);
                                            onViewChange?.('watchlist');
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                        Watchlist
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedMedia(null);
                                            onViewChange?.('media-favorites');
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                        Saved
                                    </button>
                                </nav>

                                <div className="pt-8 border-t border-white/5">
                                    <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 mb-4">Activity</h4>
                                    <button
                                        onClick={() => {
                                            setSelectedMedia(null);
                                            onViewChange?.('history');
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        History
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

                        {/* PLAYER SPACE */}
                        <div className={`w-full max-w-[1700px] mx-auto transition-all duration-700 ${isTheater ? 'min-h-screen px-4 pb-4 pt-4' : isMobile ? 'h-[50vh] px-0 pt-32' : 'h-[90vh] px-8 lg:px-12 pt-28 md:pt-36'} relative`}>
                            {currentPlayingItem ? (
                                <>
                                    <div className={`w-full h-full ${isMobile ? 'rounded-none' : 'rounded-[2.5rem]'} overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border border-white/5 relative`}>
                                        {/* BACK BUTTON OVERLAY - Inside Player */}
                                        <button
                                            onClick={() => { setSelectedMedia(null); setActiveEpisode(null); setIsTheater(false); }}
                                            className="absolute top-4 left-4 z-[60] p-3 md:p-4 bg-black/40 hover:bg-orange-600 rounded-2xl backdrop-blur-md text-white transition-all group flex items-center gap-3 border border-white/10"
                                        >
                                            <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Back</span>
                                        </button>
                                        <VideoPlayer
                                            url={getFullUrl(currentPlayingItem.stream_url)}
                                            poster={getFullUrl(currentPlayingItem.cover_url || selectedMedia.cover_url)}
                                            isTheater={isTheater}
                                            onToggleTheater={() => setIsTheater(!isTheater)}
                                            channelName={currentPlayingItem.title}
                                            onTimeUpdate={(time) => {
                                                if (!viewTriggered && time > 30) {
                                                    setViewTriggered(true);
                                                }
                                            }}
                                            onEnded={() => {
                                                if (selectedMedia.category === 'Series' && activeEpisode) {
                                                    const currentIndex = episodes.findIndex(e => e.id === activeEpisode.id);
                                                    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
                                                        setActiveEpisode(episodes[currentIndex + 1]);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    {isMobile && (
                                        <div className="px-4">
                                            <MediaInteractionBar
                                                mediaId={currentPlayingItem.id}
                                                initialViews={currentPlayingItem.views_count}
                                                initialLikes={currentPlayingItem.likes_count}
                                                initialDislikes={currentPlayingItem.dislikes_count}
                                                triggerView={viewTriggered}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
                                    <img src={selectedMedia.cover_url} alt={selectedMedia.title} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 pointer-events-none" />
                                    <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white mb-4 relative z-10">{selectedMedia.title}</h2>
                                    <p className="text-slate-400 max-w-md relative z-10 text-xs font-mono uppercase tracking-widest">Select an episode below to begin transmission</p>
                                </div>
                            )}
                        </div>

                        {/* MOBILE: Description & Actions Section */}
                        {isMobile && (
                            <div className="p-4 space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-1 bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[8px] font-black uppercase tracking-widest rounded">
                                            {selectedMedia.category}
                                        </span>
                                        <span className="text-slate-500 font-mono text-[9px] uppercase tracking-widest">
                                            {selectedMedia.release_year}
                                        </span>
                                    </div>

                                    <h2 className="text-lg font-black uppercase tracking-tight text-white mb-3">
                                        {selectedMedia.title}
                                    </h2>

                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {selectedMedia.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* INFO & EPISODES LIST - Desktop only, Mobile gets movie grid instead */}
                        {!isMobile ? (
                            <div className="max-w-7xl mx-auto w-full p-8 lg:p-12">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div>
                                            <div className="flex items-center gap-4 mb-4">
                                                <span className="px-3 py-1 bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                    {selectedMedia.category}
                                                </span>
                                                <span className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">
                                                    Released: {selectedMedia.release_year}
                                                </span>
                                            </div>
                                            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-6">
                                                {selectedMedia.title}
                                            </h1>
                                            <div className="relative">
                                                <p className={`text-slate-400 leading-relaxed font-medium text-lg ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
                                                    {selectedMedia.description}
                                                </p>
                                                {selectedMedia.description && selectedMedia.description.length > 180 && (
                                                    <button
                                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-white transition-colors flex items-center gap-2"
                                                    >
                                                        {isDescriptionExpanded ? (
                                                            <>Show Less <svg className="w-3 h-3 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg></>
                                                        ) : (
                                                            <>Read More <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg></>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <MediaInteractionBar
                                            mediaId={currentPlayingItem.id}
                                            initialViews={currentPlayingItem.views_count}
                                            initialLikes={currentPlayingItem.likes_count}
                                            initialDislikes={currentPlayingItem.dislikes_count}
                                            triggerView={viewTriggered}
                                        />

                                        {/* Episodes Section for Series */}
                                        {selectedMedia.category === 'Series' && (
                                            <div className="pt-12 border-t border-white/5">
                                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-500 mb-8 flex items-center gap-4">
                                                    Episodes
                                                    <div className="flex-1 h-px bg-white/5" />
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {episodes.map((ep) => (
                                                        <button
                                                            key={ep.id}
                                                            onClick={() => { setActiveEpisode(ep); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${activeEpisode?.id === ep.id ? 'bg-orange-600 border-orange-500 shadow-xl' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                                        >
                                                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-[10px] font-black text-white border border-white/5 shrink-0 group-hover:scale-110 transition-transform">
                                                                S{ep.season_number}E{ep.episode_number}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`text-xs font-black uppercase tracking-widest truncate ${activeEpisode?.id === ep.id ? 'text-white' : 'text-slate-200'}`}>{ep.title}</h4>
                                                                <p className={`text-[9px] font-mono uppercase mt-1 ${activeEpisode?.id === ep.id ? 'text-white/60' : 'text-slate-500'}`}>Watch Now</p>
                                                            </div>
                                                            <div className="ml-auto">
                                                                <svg className={`w-5 h-5 ${activeEpisode?.id === ep.id ? 'text-white' : 'text-slate-600 group-hover:text-orange-500'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* DESKTOP: More Media Grid (Below info) */}
                                <div className="mt-20 pt-10 border-t border-white/5">
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-500 mb-8 flex items-center gap-4">
                                        More Results
                                        <div className="flex-1 h-px bg-white/5" />
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                        {filteredMedia.filter(item => item.id !== selectedMedia.id).slice(0, 12).map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { handleSelectMedia(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                className="group relative aspect-[2/3] rounded-3xl overflow-hidden bg-white/5 border border-white/5 hover:border-orange-500/50 transition-all hover:scale-105 hover:z-10 shadow-2xl"
                                            >
                                                {item.cover_url ? (
                                                    <img
                                                        src={getFullUrl(item.cover_url)}
                                                        alt={item.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                        <span className="text-4xl opacity-20">🎬</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 mb-1 block">{item.release_year}</span>
                                                    <h3 className="text-xs font-black text-white leading-tight line-clamp-1 uppercase tracking-wide">{item.title}</h3>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* MOBILE: Show movie listings instead of info */
                            <div className="p-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-4 px-2">More Movies</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredMedia.filter(item => item.id !== selectedMedia.id).slice(0, 8).map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => { handleSelectMedia(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/5 hover:border-orange-500/50 transition-all active:scale-95 shadow-2xl"
                                        >
                                            {item.cover_url ? (
                                                <img
                                                    src={getFullUrl(item.cover_url)}
                                                    alt={item.title}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-700 opacity-80 group-active:opacity-100"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                    <span className="text-4xl opacity-20">🎬</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-active:opacity-90 transition-opacity" />
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 mb-1 block">{item.release_year}</span>
                                                <h3 className="text-[11px] font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">{item.title}</h3>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Mobile Episode Selector for Series */}
                {isMobile && selectedMedia?.category === 'Series' && episodes.length > 0 && (
                    <MobileEpisodeSelector
                        episodes={episodes}
                        activeEpisode={activeEpisode}
                        seriesTitle={selectedMedia.title}
                        onSelectEpisode={(ep) => {
                            setActiveEpisode(ep as MediaItem);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        getFullUrl={getFullUrl}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#020617] text-white overflow-y-auto no-scrollbar pb-32">
            {/* HERO SECTION / FEATURED CONTENT */}
            <div className={`relative ${isMobile ? 'h-[65vh]' : 'h-[85vh]'} w-full overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent z-10" />
                {media.length > 0 && (
                    <>
                        <img
                            src={media[0].cover_url}
                            alt="Featured"
                            className="w-full h-full object-cover object-top opacity-60"
                        />
                        <div className={`absolute bottom-0 left-0 ${isMobile ? 'p-6' : 'p-12'} z-20 w-full max-w-4xl`}>
                            <span className="px-3 py-1 bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg backdrop-blur-md mb-4 inline-block">
                                Featured Premiere
                            </span>
                            <h1 className="text-6xl font-black uppercase tracking-tight mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                {media[0].title}
                            </h1>
                            <p className="text-lg text-slate-300 mb-8 max-w-xl line-clamp-3 font-medium">
                                {media[0].description}
                            </p>
                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => handleSelectMedia(media[0])}
                                    className={`flex items-center gap-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.6)] ${isMobile ? 'p-4' : 'px-8 py-4'}`}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    {!isMobile && "Watch Now"}
                                </button>
                                <button className={`bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center ${isMobile ? 'w-14 h-14' : 'px-8 py-4'}`}>
                                    {isMobile ? (
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4" /></svg>
                                    ) : (
                                        "+ List"
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* CATEGORY TABS - Hidden on mobile */}
            {!isMobile && (
                <div className="px-12 mb-8 sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl py-6 border-b border-white/5">
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* CONTENT GRID */}
            <div className="px-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 min-h-[40vh]">
                {loading ? (
                    // Skeleton Grid
                    Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3] rounded-3xl bg-white/5 animate-pulse border border-white/5 p-4 flex flex-col justify-end gap-3">
                            <div className="w-1/3 h-2 bg-white/10 rounded-full" />
                            <div className="w-full h-4 bg-white/10 rounded-full" />
                            <div className="w-1/2 h-3 bg-white/10 rounded-full" />
                        </div>
                    ))
                ) : filteredMedia.length > 0 ? (
                    filteredMedia.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleSelectMedia(item)}
                            className="group relative aspect-[2/3] rounded-3xl overflow-hidden bg-white/5 border border-white/5 hover:border-orange-500/50 transition-all hover:scale-105 hover:z-10 shadow-2xl"
                        >
                            {item.cover_url ? (
                                <img
                                    src={getFullUrl(item.cover_url)}
                                    alt={item.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                    <span className="text-4xl opacity-20">🎬</span>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

                            <div className="absolute top-3 right-3">
                                <span className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-all delay-100 transform translate-y-2 group-hover:translate-y-0 text-white">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </span>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 mb-2 block">{item.release_year}</span>
                                <h3 className="text-sm font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">{item.title}</h3>
                            </div>
                        </button>
                    ))
                ) : null}
            </div>

            {filteredMedia.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                    <p className="text-xs font-black uppercase tracking-[0.2em] mb-4">No Signal Detected</p>
                    <button onClick={() => setActiveCategory('All')} className="text-orange-500 hover:text-white transition-colors text-xs underline">Reset Scanners</button>
                </div>
            )}
        </div>
    );
};

export default MoviesPage;
