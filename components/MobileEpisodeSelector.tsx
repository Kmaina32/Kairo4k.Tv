import React, { useState, useEffect, useRef } from 'react';

interface Episode {
    id: string;
    title: string;
    description?: string;
    cover_url?: string;
    season_number?: number;
    episode_number?: number;
}

interface MobileEpisodeSelectorProps {
    episodes: Episode[];
    activeEpisode: Episode | null;
    seriesTitle: string;
    onSelectEpisode: (episode: Episode) => void;
    getFullUrl: (url: string) => string;
}

const MobileEpisodeSelector = ({
    episodes,
    activeEpisode,
    seriesTitle,
    onSelectEpisode,
    getFullUrl,
}: MobileEpisodeSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const drawerRef = useRef<HTMLDivElement>(null);
    const startY = useRef<number>(0);
    const currentY = useRef<number>(0);

    // Group episodes by season
    const groupedBySeason = episodes.reduce((acc, ep) => {
        const season = ep.season_number || 1;
        if (!acc[season]) acc[season] = [];
        acc[season].push(ep);
        return acc;
    }, {} as Record<number, Episode[]>);

    const seasons = Object.keys(groupedBySeason).map(Number).sort((a, b) => a - b);
    const currentSeasonEpisodes = groupedBySeason[selectedSeason] || [];

    // Set initial selected season based on active episode
    useEffect(() => {
        if (activeEpisode?.season_number) {
            setSelectedSeason(activeEpisode.season_number);
        }
    }, [activeEpisode?.season_number]);

    // Handle swipe gestures
    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;
        if (diff > 0 && drawerRef.current) {
            drawerRef.current.style.transform = `translateY(${diff}px)`;
        }
    };

    const handleTouchEnd = () => {
        const diff = currentY.current - startY.current;
        if (diff > 100) {
            setIsOpen(false);
        }
        if (drawerRef.current) {
            drawerRef.current.style.transform = '';
        }
    };

    const handleSelectEpisode = (ep: Episode) => {
        onSelectEpisode(ep);
        setIsOpen(false);
    };

    if (episodes.length === 0) return null;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 rounded-full shadow-2xl shadow-orange-900/50 transition-all animate-bounce"
                style={{ animationDuration: '2s' }}
            >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-xs font-black uppercase tracking-widest text-white">
                    {activeEpisode ? `S${activeEpisode.season_number}E${activeEpisode.episode_number}` : 'Episodes'}
                </span>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`fixed inset-x-0 bottom-0 z-[100] bg-gradient-to-b from-slate-900 to-black rounded-t-3xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
                style={{ maxHeight: '75vh' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">{seriesTitle}</h3>
                            <p className="text-xs text-slate-500">{episodes.length} Episodes</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Season Tabs */}
                    {seasons.length > 1 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                            {seasons.map(season => (
                                <button
                                    key={season}
                                    onClick={() => setSelectedSeason(season)}
                                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedSeason === season
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    Season {season}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Episodes List */}
                <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(75vh - 140px)' }}>
                    {currentSeasonEpisodes.map(ep => (
                        <button
                            key={ep.id}
                            onClick={() => handleSelectEpisode(ep)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${activeEpisode?.id === ep.id
                                    ? 'bg-orange-600 border-orange-500 shadow-xl'
                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                }`}
                        >
                            {/* Thumbnail */}
                            <div className="w-20 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative">
                                {ep.cover_url ? (
                                    <img
                                        src={getFullUrl(ep.cover_url)}
                                        alt={ep.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                        <span className="text-xl">🎬</span>
                                    </div>
                                )}
                                {activeEpisode?.id === ep.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                            <div className="flex gap-0.5">
                                                <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                                                <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeEpisode?.id === ep.id
                                            ? 'bg-white/20 text-white'
                                            : 'bg-orange-600/20 text-orange-400'
                                        }`}>
                                        E{ep.episode_number}
                                    </span>
                                </div>
                                <h4 className={`text-xs font-bold truncate mt-1 ${activeEpisode?.id === ep.id ? 'text-white' : 'text-slate-200'
                                    }`}>
                                    {ep.title}
                                </h4>
                            </div>

                            {/* Play Icon */}
                            <div className={`shrink-0 ${activeEpisode?.id === ep.id ? 'text-white' : 'text-slate-600'}`}>
                                {activeEpisode?.id === ep.id ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <circle cx="12" cy="12" r="9" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Now Playing Bar */}
                {activeEpisode && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                        <div className="flex items-center gap-3 p-3 bg-orange-600/20 border border-orange-500/30 rounded-xl">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-white flex-1 truncate">
                                Now Playing: S{activeEpisode.season_number}E{activeEpisode.episode_number} - {activeEpisode.title}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default MobileEpisodeSelector;
