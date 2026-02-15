
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

const HistoryPage = ({ onSelectMedia }: { onSelectMedia: (m: any) => void }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // This assumes a user_activity or history table exists. 
        // For now let's use a dummy based on media library if we don't have a history table yet, 
        // or just show an empty state.
        const { data } = await supabase
            .from('media_library')
            .select('*')
            .limit(10); // Placeholder

        if (data) setHistory(data);
        setLoading(false);
    };

    return (
        <div className="p-6 lg:p-12 animate-in fade-in duration-500">
            <div className="mb-12">
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">Watch History</h1>
                <p className="text-slate-500 font-medium text-[9px] md:text-[10px] uppercase tracking-widest">Videos you've viewed recently</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {history.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSelectMedia(item)}
                        className="group relative aspect-[2/3] rounded-3xl overflow-hidden bg-white/5 border border-white/5 hover:border-orange-500/50 transition-all hover:scale-105 shadow-2xl"
                    >
                        <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                            <h3 className="text-xs font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">{item.title}</h3>
                        </div>
                    </button>
                ))}
            </div>
            {!loading && history.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-[40px]">
                    <p className="text-[10px] font-black uppercase tracking-widest">No history found</p>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
