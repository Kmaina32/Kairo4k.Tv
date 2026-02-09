
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

const AdManager = () => {
    const [ads, setAds] = useState<any[]>([]);
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingAd, setIsAddingAd] = useState(false);

    // Form State
    const [newAd, setNewAd] = useState({ title: '', ad_url: '', click_through_url: '', duration: '' });

    useEffect(() => {
        fetchAdData();
    }, []);

    const fetchAdData = async () => {
        setLoading(true);
        const { data: adsData } = await supabase.from('ads_library').select('*');
        const { data: configsData } = await supabase.from('ads_config').select('*');
        if (adsData) setAds(adsData);
        if (configsData) setConfigs(configsData);
        setLoading(false);
    };

    const handleToggleConfig = async (config: any) => {
        const { error } = await supabase
            .from('ads_config')
            .upsert({ id: config.id, is_enabled: !config.is_enabled }, { onConflict: 'id' });
        if (!error) fetchAdData();
    };

    const handleAddAd = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('ads_library').insert([{
            ...newAd,
            duration: parseInt(newAd.duration) || 30
        }]);
        if (!error) {
            setIsAddingAd(false);
            setNewAd({ title: '', ad_url: '', click_through_url: '', duration: '' });
            fetchAdData();
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white">Revenue Control</h2>
                    <p className="text-[10px] text-orange-500 font-black mt-1 uppercase tracking-widest">Ad Injection & Monetization</p>
                </div>
                <button
                    onClick={() => setIsAddingAd(true)}
                    className="px-6 py-3 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl"
                >
                    Create Ad Clip
                </button>
            </div>

            {/* Ads Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {configs.map(config => (
                    <div key={config.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-1 h-full ${config.is_enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{config.placement}</h4>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-white uppercase">{config.target_category}</span>
                            <button
                                onClick={() => handleToggleConfig(config)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${config.is_enabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                            >
                                {config.is_enabled ? 'ENABLED' : 'DISABLED'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ads Library */}
            <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
                <div className="p-8 border-b border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Ad Library</h3>
                </div>
                <div className="p-8">
                    {ads.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ads.map(ad => (
                                <div key={ad.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-lg">📢</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black uppercase text-white truncate">{ad.title}</h4>
                                        <p className="text-[9px] font-mono text-slate-500 truncate mt-1">{ad.duration}s • {ad.ad_url}</p>
                                    </div>
                                    <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-500/10 rounded-lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Ad Transmissions Found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {isAddingAd && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
                        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-8">Deploy New Ad</h2>
                        <form onSubmit={handleAddAd} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ad Title</label>
                                <input
                                    value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                    placeholder="Fall Collection 2026" required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stream URL (R2 Filename)</label>
                                <input
                                    value={newAd.ad_url} onChange={e => setNewAd({ ...newAd, ad_url: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                    placeholder="ads/promo_01.mp4" required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duration (sec)</label>
                                    <input
                                        type="number" value={newAd.duration} onChange={e => setNewAd({ ...newAd, duration: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        placeholder="30" required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Link</label>
                                    <input
                                        value={newAd.click_through_url} onChange={e => setNewAd({ ...newAd, click_through_url: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsAddingAd(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-500">Cancel</button>
                                <button type="submit" className="flex-1 py-4 bg-orange-600 rounded-2xl font-black uppercase text-[10px] text-white">Deploy Clip</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdManager;
