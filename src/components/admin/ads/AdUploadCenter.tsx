import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { r2Service } from '../../../services/r2Service';
import { CLOUDFLARE_BASE_URL } from '../../../constants';

interface AdItem {
    id: string;
    title: string;
    ad_url: string;
    click_through_url: string;
    duration: number;
    created_at: string;
}

const AdUploadCenter = () => {
    const [ads, setAds] = useState<AdItem[]>([]);
    const [r2Videos, setR2Videos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [showR2Browser, setShowR2Browser] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        ad_url: '',
        click_through_url: '',
        duration: 30
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch ads from database
            const { data: adsData } = await supabase
                .from('ads_library')
                .select('*')
                .order('created_at', { ascending: false });

            if (adsData) setAds(adsData);

            // Fetch R2 video files
            const allFiles = await r2Service.listObjects('');
            const videoFiles = allFiles.filter(f =>
                /\.(mp4|webm|mov|avi|mkv)$/i.test(f.key) &&
                f.key.startsWith('ads/')
            );
            setR2Videos(videoFiles);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = `ads/${Date.now()}_${file.name}`;

                await r2Service.uploadFile(file, fileName, (progress) => {
                    const currentProgress = (i + (progress.percentage / 100)) / files.length;
                    setUploadProgress(Math.round(currentProgress * 100));
                });

                uploadedUrls.push(fileName);
            }

            // If only one file, auto-populate the form
            if (uploadedUrls.length === 1) {
                setFormData(prev => ({ ...prev, ad_url: uploadedUrls[0] }));
            }

            await fetchData();
            alert(`Successfully uploaded ${uploadedUrls.length} file(s)!`);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + (err as Error).message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleCreateAd = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { error } = await supabase
                .from('ads_library')
                .insert([formData]);

            if (error) throw error;

            setShowModal(false);
            setFormData({ title: '', ad_url: '', click_through_url: '', duration: 30 });
            await fetchData();
        } catch (err) {
            console.error('Failed to create ad:', err);
            alert('Failed to create ad');
        }
    };

    const handleDeleteAd = async (id: string) => {
        if (!confirm('Delete this ad? This cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('ads_library')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error('Failed to delete ad:', err);
        }
    };

    const handleDeleteR2File = async (key: string) => {
        if (!confirm('Delete this video from R2? This cannot be undone.')) return;

        try {
            await r2Service.deleteObject(key);
            await fetchData();
        } catch (err) {
            console.error('Failed to delete file:', err);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const getFileUrl = (key: string) => `${CLOUDFLARE_BASE_URL}${key}`;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* HEADER */}
            <div className="bg-gradient-to-br from-orange-500/10 to-white/5 rounded-[32px] border border-orange-500/20 p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">Ad Upload Center</h2>
                        <p className="text-[10px] font-mono text-orange-400">
                            {ads.length} Active Ads • {r2Videos.length} Videos in R2
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {/* Upload to R2 */}
                        <label className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-black uppercase tracking-widest text-white cursor-pointer transition-all shadow-xl flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload to R2
                            <input
                                type="file"
                                multiple
                                accept="video/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>

                        {/* Create Ad */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl"
                        >
                            Create Ad Entry
                        </button>
                    </div>
                </div>

                {/* Upload Progress */}
                {uploading && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-slate-400">Uploading to R2...</span>
                            <span className="text-xs font-mono text-orange-400">{uploadProgress}%</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-600 to-pink-600 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* R2 VIDEO LIBRARY */}
            <div className="bg-white/5 rounded-[32px] border border-white/10 overflow-hidden backdrop-blur-xl">
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent">
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">R2 Video Library</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">Videos stored in ads/ folder</p>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-xs font-mono text-slate-500">Loading...</p>
                        </div>
                    ) : r2Videos.length === 0 ? (
                        <div className="py-20 text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-600">No Videos in R2</p>
                            <p className="text-[10px] font-mono text-slate-700 mt-2">Upload video files to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {r2Videos.map(video => (
                                <div key={video.key} className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all">
                                    <div className="aspect-video bg-gradient-to-br from-slate-800 to-black relative">
                                        <video
                                            src={getFileUrl(video.key)}
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold text-white truncate" title={video.key}>
                                            {video.key.split('/').pop()}
                                        </h4>
                                        <p className="text-[9px] font-mono text-slate-500 mt-1">{formatSize(video.size)}</p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, ad_url: video.key }));
                                                    setShowModal(true);
                                                }}
                                                className="flex-1 px-3 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Use in Ad
                                            </button>
                                            <button
                                                onClick={() => handleDeleteR2File(video.key)}
                                                className="px-3 py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ADS DATABASE */}
            <div className="bg-white/5 rounded-[32px] border border-white/10 overflow-hidden backdrop-blur-xl">
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Active Ad Campaigns</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">Ads registered in the system</p>
                </div>

                <div className="p-6">
                    {ads.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-600">No Ads Created</p>
                            <p className="text-[10px] font-mono text-slate-700 mt-2">Create an ad entry to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {ads.map(ad => (
                                <div key={ad.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center gap-4 group hover:border-purple-500/30 transition-all">
                                    <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
                                        <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white">{ad.title}</h4>
                                        <p className="text-[10px] font-mono text-slate-500 truncate mt-1">{ad.ad_url}</p>
                                        <div className="flex gap-3 mt-1">
                                            <span className="text-[9px] font-mono text-slate-600">Duration: {ad.duration}s</span>
                                            {ad.click_through_url && (
                                                <span className="text-[9px] font-mono text-blue-400">Has Click-through</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAd(ad.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE AD MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
                            <h3 className="text-xl font-black uppercase tracking-widest text-white">Create Ad Campaign</h3>
                        </div>

                        <form onSubmit={handleCreateAd} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ad Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    placeholder="Summer Sale 2026"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Video URL (R2 Filename)</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowR2Browser(true)}
                                        className="text-[9px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        Browse R2
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={formData.ad_url}
                                    onChange={e => setFormData(prev => ({ ...prev, ad_url: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50 transition-all"
                                    placeholder="ads/promo_video.mp4"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (seconds)</label>
                                    <input
                                        type="number"
                                        value={formData.duration}
                                        onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                        min="5"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click-through URL</label>
                                    <input
                                        type="url"
                                        value={formData.click_through_url}
                                        onChange={e => setFormData(prev => ({ ...prev, click_through_url: e.target.value }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setFormData({ title: '', ad_url: '', click_through_url: '', duration: 30 });
                                    }}
                                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl"
                                >
                                    Create Ad
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* R2 BROWSER MODAL */}
            {showR2Browser && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-widest text-white">Select Video from R2</h3>
                            <button
                                onClick={() => setShowR2Browser(false)}
                                className="p-2 hover:bg-white/10 rounded-full text-white transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-4">
                                {r2Videos.map(video => (
                                    <button
                                        key={video.key}
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, ad_url: video.key }));
                                            setShowR2Browser(false);
                                        }}
                                        className="bg-black/40 border border-white/10 hover:border-orange-500/50 rounded-xl p-4 text-left transition-all group"
                                    >
                                        <div className="aspect-video bg-gradient-to-br from-slate-800 to-black rounded-lg mb-3 relative overflow-hidden">
                                            <video
                                                src={getFileUrl(video.key)}
                                                className="w-full h-full object-cover"
                                                preload="metadata"
                                            />
                                        </div>
                                        <h4 className="text-xs font-bold text-white truncate">{video.key.split('/').pop()}</h4>
                                        <p className="text-[9px] font-mono text-slate-500 mt-1">{formatSize(video.size)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdUploadCenter;
