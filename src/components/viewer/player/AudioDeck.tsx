
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { CLOUDFLARE_BASE_URL } from '../../constants';
import { Play, Pause, SkipForward, SkipBack, Music, BookOpen, Mic2, Heart, Search, ListMusic } from 'lucide-react';

interface AudioItem {
    id: string;
    title: string;
    description: string;
    category: 'Music' | 'Podcast' | 'Audiobook';
    cover_url: string;
    stream_url: string;
    release_year: number;
    genre: string;
    artist?: string;
}

const AudioDeck = () => {
    const [content, setContent] = useState<AudioItem[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<AudioItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTab, setActiveTab] = useState<'All' | 'Music' | 'Podcast' | 'Audiobook'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        fetchAudioContent();
    }, []);

    const fetchAudioContent = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('media_library')
            .select('*')
            .in('category', ['Music', 'Podcast', 'Audiobook'])
            .eq('is_active', true);

        if (data) setContent(data as AudioItem[]);
        setLoading(false);
    };

    const getFullUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return CLOUDFLARE_BASE_URL + url;
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const filteredContent = content.filter(item => {
        const matchesTab = activeTab === 'All' || item.category === activeTab;
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="flex flex-col h-full bg-[#020617] text-slate-100 font-sans p-6 md:p-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-200">
                        Audio Deck
                    </h1>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mt-2">Sonic Frequency Hub</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 w-full md:w-auto">
                    <Search className="w-4 h-4 text-slate-500 ml-2" />
                    <input
                        type="text"
                        placeholder="Search sonic logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-sm font-mono w-full md:w-64"
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'All', icon: ListMusic, label: 'Everything' },
                    { id: 'Music', icon: Music, label: 'Frequency' },
                    { id: 'Podcast', icon: Mic2, label: 'Voice Logs' },
                    { id: 'Audiobook', icon: BookOpen, label: 'Archives' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border ${activeTab === tab.id
                            ? 'bg-orange-600 border-orange-400 shadow-xl shadow-orange-900/20 text-white'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-12 overflow-hidden">
                {/* Scrollable Gallery */}
                <div className="lg:col-span-2 overflow-y-auto no-scrollbar pr-4 -mr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                            {filteredContent.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedTrack(item)}
                                    className="group relative flex flex-col items-start text-left"
                                >
                                    <div className="relative aspect-square w-full rounded-3xl overflow-hidden mb-4 shadow-2xl transition-all group-hover:scale-105">
                                        <img
                                            src={getFullUrl(item.cover_url)}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:brightness-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center shadow-2xl">
                                                <Play className="w-6 h-6 fill-white text-white translate-x- connection" />
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white truncate w-full">{item.title}</h4>
                                    <p className="text-[9px] font-mono text-slate-500 uppercase mt-1">
                                        {item.category} • {item.genre}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Player Controller */}
                <div className="relative hidden lg:block">
                    {selectedTrack ? (
                        <div className="sticky top-0 bg-white/5 border border-white/10 rounded-[40px] p-8 flex flex-col items-center text-center backdrop-blur-xl animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="w-64 h-64 rounded-[32px] overflow-hidden shadow-2xl mb-8 relative group">
                                <img
                                    src={getFullUrl(selectedTrack.cover_url)}
                                    className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse-slow' : ''}`}
                                />
                                <div className="absolute inset-0 bg-orange-600/10 mix-blend-overlay" />
                            </div>

                            <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">{selectedTrack.title}</h2>
                            <p className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-6">
                                {selectedTrack.artist || 'UNKNOWN ENTITY'}
                            </p>

                            <div className="w-full space-y-8">
                                {/* Frequency Visualization Sim */}
                                <div className="flex justify-center items-end gap-1 h-12">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 bg-orange-500 rounded-full transition-all duration-300 ${isPlaying ? 'animate-height-bounce' : 'h-2'}`}
                                            style={{
                                                height: isPlaying ? `${Math.random() * 100}%` : '8px',
                                                animationDelay: `${i * 0.1}s`
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center justify-center gap-8">
                                    <button className="text-slate-500 hover:text-white transition-colors">
                                        <SkipBack className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={togglePlay}
                                        className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95"
                                    >
                                        {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-1" />}
                                    </button>
                                    <button className="text-slate-500 hover:text-white transition-colors">
                                        <SkipForward className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 w-1/3 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                        <span>02:14</span>
                                        <span>06:45</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-8 border-t border-white/5">
                                    <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                        <Heart className="w-5 h-5" />
                                    </button>
                                    <button className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300">
                                        <SkipForward className="w-4 h-4" /> Add to Queue
                                    </button>
                                </div>
                            </div>

                            <audio
                                ref={audioRef}
                                src={getFullUrl(selectedTrack.stream_url)}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="sticky top-0 h-full flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-[40px] text-center opacity-30">
                            <Music className="w-16 h-16 mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">System Standby</p>
                            <p className="text-xs font-mono mt-2">Pick a frequency to engage</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Mini Player */}
            {selectedTrack && (
                <div className="lg:hidden fixed bottom-24 left-4 right-4 bg-orange-600 rounded-3xl p-4 flex items-center gap-4 shadow-2xl z-50 animate-in slide-in-from-bottom-8">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                        <img src={getFullUrl(selectedTrack.cover_url)} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-black uppercase text-white truncate">{selectedTrack.title}</h4>
                        <p className="text-[8px] font-mono text-orange-100/60 uppercase">{selectedTrack.artist || 'Unknown'}</p>
                    </div>
                    <button onClick={togglePlay} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-600">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
                    </button>
                </div>
            )}

            <style>{`
                @keyframes height-bounce {
                    0%, 100% { height: 10%; }
                    50% { height: 100%; }
                }
                .animate-height-bounce {
                    animation: height-bounce 0.6s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default AudioDeck;
