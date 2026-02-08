
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const WatchlistPage = ({ onSelectMedia }: { onSelectMedia: (m: any) => void }) => {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const fetchWatchlist = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
            .from('user_watchlist')
            .select('media_library(*)')
            .eq('user_id', session.user.id);
        if (data) setWatchlist(data.map((item: any) => item.media_library));
        setLoading(false);
    };

    const removeFromWatchlist = async (mediaId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from('user_watchlist').delete().eq('user_id', session.user.id).eq('media_id', mediaId);
        setWatchlist(watchlist.filter(item => item.id !== mediaId));
    };

    return (
        <div className="p-6 lg:p-12 animate-in fade-in duration-500">
            <div className="mb-12">
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">My Watchlist</h1>
                <p className="text-slate-500 font-medium text-[9px] md:text-[10px] uppercase tracking-widest">Saved videos for later</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {watchlist.map(item => (
                    <div key={item.id} className="group relative">
                        <button
                            onClick={() => onSelectMedia(item)}
                            className="w-full aspect-[2/3] rounded-3xl overflow-hidden bg-white/5 border border-white/5 hover:border-orange-500/50 transition-all hover:scale-105 shadow-2xl"
                        >
                            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                                <h3 className="text-xs font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">{item.title}</h3>
                            </div>
                        </button>
                        <button
                            onClick={() => removeFromWatchlist(item.id)}
                            className="absolute -top-2 -right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
                {!loading && watchlist.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-[40px]">
                        <p className="text-[10px] font-black uppercase tracking-widest">Watchlist Empty</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WatchlistPage;
