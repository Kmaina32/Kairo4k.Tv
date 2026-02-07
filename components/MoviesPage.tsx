import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import VideoPlayer from './VideoPlayer';

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
}

interface MoviesPageProps {
    onBack: () => void;
}

const CLOUDFLARE_BASE_URL = 'https://pub-a84b309a59b0432d9479ce0138fe01dd.r2.dev/';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return CLOUDFLARE_BASE_URL + url.replace(/^\//, '');
};

const MoviesPage = ({ onBack }: MoviesPageProps) => {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [episodes, setEpisodes] = useState<MediaItem[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [activeEpisode, setActiveEpisode] = useState<MediaItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [activeCategory, setActiveCategory] = useState(() => {
        // On mobile, always default to 'Movie'
        const isMobileDevice = window.innerWidth < 768;
        if (isMobileDevice) return 'Movie';
        return localStorage.getItem('nexus_media_category') || 'All';
    });

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // If switching to mobile, force Movie category
            if (mobile && activeCategory !== 'Movie') {
                setActiveCategory('Movie');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // On mobile, don't save category to localStorage (always Movie)
        if (!isMobile) {
            localStorage.setItem('nexus_media_category', activeCategory);
        }
    }, [activeCategory, isMobile]);
    const [isTheater, setIsTheater] = useState(false);

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

        if (data) setEpisodes(data);
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
            <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col animate-in fade-in duration-500 overflow-y-auto no-scrollbar pb-32">
                {/* HEADER WITH APP NAME (LEFT ALIGNED) */}
                <div className="absolute top-0 left-0 right-0 z-[60] h-16 flex items-center justify-start px-4 md:px-8 bg-gradient-to-b from-black/95 to-transparent">
                    <h1 className="text-xl md:text-2xl font-black tracking-[0.2em] drop-shadow-md uppercase kairo-cyber-glow">
                        KAIRO<span className="text-white">4K</span>
                    </h1>
                </div>

                {/* PLAYER SPACE */}
                <div className={`w-full pt-16 md:pt-24 transition-all duration-700 ${isTheater ? 'min-h-screen px-4 pb-4' : isMobile ? 'aspect-video px-0' : 'aspect-video lg:h-[80vh] px-8 lg:px-12'} relative`}>
                    {currentPlayingItem ? (
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
                            />
                        </div>
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
                            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
                                {selectedMedia.title}
                            </h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                {selectedMedia.description}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                Share
                            </button>
                            <button className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                                My List
                            </button>
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
                                    <p className="text-slate-400 leading-relaxed font-medium text-lg">
                                        {selectedMedia.description}
                                    </p>
                                </div>

                                {/* Episodes Section for Series */}
                                {selectedMedia.category === 'Series' && (
                                    <div className="pt-12 border-t border-white/5">
                                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-500 mb-8 flex items-center gap-4">
                                            Transmission Segments
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
                                                        <p className={`text-[9px] font-mono uppercase mt-1 ${activeEpisode?.id === ep.id ? 'text-white/60' : 'text-slate-500'}`}>Segment Locked</p>
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

                            {/* Sidebar Info/Genre etc */}
                            <div className="lg:col-span-1 border-l border-white/5 pl-12 space-y-12 hidden lg:block">
                                <div>
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Genre Classification</h4>
                                    <p className="text-xs font-black text-white uppercase tracking-widest">{selectedMedia.genre || 'UNCLASSIFIED'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Signal Quality</h4>
                                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Encrypted 4K</p>
                                </div>
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
        );
    }

    return (
        <div className="h-screen w-full bg-[#020617] text-white overflow-y-auto no-scrollbar pb-32">
            {/* HERO SECTION / FEATURED CONTENT */}
            <div className="relative h-[60vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent z-10" />
                {media.length > 0 && (
                    <>
                        <img
                            src={media[0].cover_url}
                            alt="Featured"
                            className="w-full h-full object-cover object-top opacity-60"
                        />
                        <div className="absolute bottom-0 left-0 p-12 z-20 w-full max-w-4xl">
                            <span className="px-3 py-1 bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg backdrop-blur-md mb-4 inline-block">
                                Featured Premiere
                            </span>
                            <h1 className="text-6xl font-black uppercase tracking-tight mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                {media[0].title}
                            </h1>
                            <p className="text-lg text-slate-300 mb-8 max-w-xl line-clamp-3 font-medium">
                                {media[0].description}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleSelectMedia(media[0])}
                                    className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.6)] flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    Watch Now
                                </button>
                                <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                                    + List
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
