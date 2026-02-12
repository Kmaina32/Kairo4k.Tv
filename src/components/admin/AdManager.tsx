import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import AdUploadCenter from './AdUploadCenter';

const AdManager = () => {
    const STORAGE_KEY = 'nexus_ad_manager_state';

    const [ads, setAds] = useState<any[]>([]);
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [editingAdId, setEditingAdId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'upload'>('overview');

    const [draftAd, setDraftAd] = useState({
        title: '',
        ad_url: '',
        click_through_url: '',
        duration: ''
    });

    useEffect(() => {
        fetchAdData();
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed?.draftAd) setDraftAd(parsed.draftAd);
            if (parsed?.modalMode) setModalMode(parsed.modalMode);
            if (parsed?.editingAdId) setEditingAdId(parsed.editingAdId);
            if (parsed?.activeTab) setActiveTab(parsed.activeTab);
        } catch {
            // ignore malformed storage
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            modalMode,
            editingAdId,
            draftAd,
            activeTab
        }));
    }, [modalMode, editingAdId, draftAd, activeTab]);

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

    const openCreateModal = () => {
        setModalMode('create');
        setEditingAdId(null);
        setDraftAd({ title: '', ad_url: '', click_through_url: '', duration: '' });
    };

    const openEditModal = (ad: any) => {
        setModalMode('edit');
        setEditingAdId(ad.id);
        setDraftAd({
            title: ad.title || '',
            ad_url: ad.ad_url || '',
            click_through_url: ad.click_through_url || '',
            duration: String(ad.duration ?? '')
        });
    };

    const closeModal = () => {
        setModalMode(null);
        setEditingAdId(null);
        setDraftAd({ title: '', ad_url: '', click_through_url: '', duration: '' });
    };

    const handleSaveAd = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...draftAd,
            duration: parseInt(draftAd.duration) || 30
        };

        const { error } = modalMode === 'edit' && editingAdId
            ? await supabase.from('ads_library').update(payload).eq('id', editingAdId)
            : await supabase.from('ads_library').insert([payload]);

        if (error) return;
        closeModal();
        fetchAdData();
    };

    const handleDeleteAd = async (ad: any) => {
        if (!confirm(`Delete "${ad.title}"? This cannot be undone.`)) return;
        const { error } = await supabase.from('ads_library').delete().eq('id', ad.id);
        if (!error) fetchAdData();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header with Tabs */}
            <div className="bg-gradient-to-br from-orange-500/10 to-white/5 rounded-[32px] border border-orange-500/20 p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">Revenue Control</h2>
                        <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest">Ad Injection & Monetization</p>
                    </div>
                    {activeTab === 'overview' && (
                        <button
                            onClick={openCreateModal}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-black uppercase text-xs tracking-widest text-white transition-all shadow-xl"
                        >
                            Create Ad Clip
                        </button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 bg-black/40 rounded-xl p-1 border border-white/10">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Overview & Config
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Upload Center
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' ? (
                <>
                    {/* Ads Config Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {configs.map(config => (
                            <div key={config.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-all">
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
                    <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
                        <div className="p-8 border-b border-white/5">
                            <h3 className="text-lg font-black uppercase tracking-widest text-white">Ad Library</h3>
                        </div>
                        <div className="p-8">
                            {ads.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {ads.map(ad => (
                                        <div key={ad.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:border-orange-500/30 transition-all">
                                            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-xs font-black text-orange-400 shrink-0">
                                                AD
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black uppercase text-white truncate">{ad.title}</h4>
                                                <p className="text-[9px] font-mono text-slate-500 truncate mt-1">{ad.duration}s • {ad.ad_url}</p>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(ad)}
                                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAd(ad)}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center opacity-20">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Ad Transmissions Found</p>
                                </div>
                            )}
                            {loading && (
                                <div className="pt-6 text-[9px] font-mono text-slate-600 uppercase">Loading...</div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <AdUploadCenter />
            )}

            {/* Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
                        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-8">
                            {modalMode === 'edit' ? 'Edit Ad Clip' : 'Deploy New Ad'}
                        </h2>
                        <form onSubmit={handleSaveAd} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ad Title</label>
                                <input
                                    value={draftAd.title} onChange={e => setDraftAd({ ...draftAd, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                    placeholder="Fall Collection 2026" required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stream URL (R2 Filename)</label>
                                <input
                                    value={draftAd.ad_url} onChange={e => setDraftAd({ ...draftAd, ad_url: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                    placeholder="ads/promo_01.mp4" required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duration (sec)</label>
                                    <input
                                        type="number" value={draftAd.duration} onChange={e => setDraftAd({ ...draftAd, duration: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        placeholder="30" required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Link</label>
                                    <input
                                        value={draftAd.click_through_url} onChange={e => setDraftAd({ ...draftAd, click_through_url: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-orange-500/50"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-500">Cancel</button>
                                <button type="submit" className="flex-1 py-4 bg-orange-600 rounded-2xl font-black uppercase text-[10px] text-white">
                                    {modalMode === 'edit' ? 'Save Changes' : 'Deploy Clip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdManager;
