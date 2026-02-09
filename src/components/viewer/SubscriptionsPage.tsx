
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

const SubscriptionsPage = () => {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', session.user.id);
        if (data) setSubscriptions(data);
        setLoading(false);
    };

    return (
        <div className="p-6 lg:p-12 animate-in fade-in duration-500">
            <div className="mb-12">
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">Subscriptions</h1>
                <p className="text-slate-500 font-medium text-[9px] md:text-[10px] uppercase tracking-widest">Followed creators and categories</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subscriptions.map(sub => (
                    <div key={sub.target_id} className="p-8 bg-white/5 border border-white/5 rounded-[40px] flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white text-xl font-black">
                                {sub.target_id[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">{sub.target_id}</h3>
                                <p className="text-slate-500 text-[9px] uppercase tracking-widest">{sub.type}</p>
                            </div>
                        </div>
                        <button className="px-5 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Subscribed
                        </button>
                    </div>
                ))}
                {!loading && subscriptions.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-[40px]">
                        <p className="text-[10px] font-black uppercase tracking-widest">No subscriptions yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionsPage;
