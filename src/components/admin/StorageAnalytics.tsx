import React, { useState, useEffect } from 'react';
import { r2Service, StorageStats } from '../../services/r2Service';

const StorageAnalytics = () => {
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await r2Service.getStorageStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch storage stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center p-12 text-slate-500">
                <p className="text-xs uppercase tracking-widest">Failed to load storage stats</p>
            </div>
        );
    }

    const usagePercentage = Math.min(100, (stats.totalSize / (100 * 1024 * 1024 * 1024)) * 100); // Assume 100GB limit

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                    R2 Storage Analytics
                </h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                >
                    <svg
                        className={`w-5 h-5 text-orange-500 ${refreshing ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Objects */}
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 border border-orange-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-600/30 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-white mb-1">{stats.totalObjects.toLocaleString()}</p>
                        <p className="text-xs uppercase tracking-widest text-orange-400/70">Total Files</p>
                    </div>
                </div>

                {/* Total Size */}
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-600/30 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-white mb-1">{stats.sizeFormatted}</p>
                        <p className="text-xs uppercase tracking-widest text-blue-400/70">Storage Used</p>
                    </div>
                </div>

                {/* Videos */}
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-white mb-1">{stats.videos.toLocaleString()}</p>
                        <p className="text-xs uppercase tracking-widest text-purple-400/70">Video Files</p>
                    </div>
                </div>

                {/* Images */}
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-600/30 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-white mb-1">{stats.images.toLocaleString()}</p>
                        <p className="text-xs uppercase tracking-widest text-emerald-400/70">Image Files</p>
                    </div>
                </div>
            </div>

            {/* Storage Usage Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Storage Usage</h3>
                    <span className="text-xs font-mono text-slate-400">{usagePercentage.toFixed(2)}% of 100 GB</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${usagePercentage > 90
                                ? 'bg-red-600'
                                : usagePercentage > 70
                                    ? 'bg-yellow-600'
                                    : 'bg-emerald-600'
                            }`}
                        style={{ width: `${usagePercentage}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>0 GB</span>
                    <span>100 GB</span>
                </div>
            </div>

            {/* File Distribution */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4">File Distribution</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full" />
                            <span className="text-sm text-slate-300">Videos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{stats.videos}</span>
                            <span className="text-xs text-slate-500">
                                ({((stats.videos / stats.totalObjects) * 100).toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                            <span className="text-sm text-slate-300">Images</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{stats.images}</span>
                            <span className="text-xs text-slate-500">
                                ({((stats.images / stats.totalObjects) * 100).toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-slate-500 rounded-full" />
                            <span className="text-sm text-slate-300">Other</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{stats.other}</span>
                            <span className="text-xs text-slate-500">
                                ({((stats.other / stats.totalObjects) * 100).toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-orange-600/10 to-orange-900/10 border border-orange-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-black uppercase tracking-wider text-orange-400 mb-1">Storage Tip</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Cloudflare R2 provides unlimited egress bandwidth at no cost. Consider enabling automatic thumbnail generation to reduce storage duplication.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StorageAnalytics;
