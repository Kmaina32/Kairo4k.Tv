import React, { useState, useEffect } from 'react';
import { r2Service } from '../../../services/r2Service';
import { supabase } from '../../../services/supabaseClient';

interface R2FileBrowserProps {
    onSelect: (filename: string) => void;
    onClose: () => void;
}

interface R2File {
    key: string;
    size: number;
    lastModified: Date;
}

const R2FileBrowser = ({ onSelect, onClose }: R2FileBrowserProps) => {
    const [files, setFiles] = useState<R2File[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unused'>('unused');
    const [search, setSearch] = useState('');
    const [usedUrls, setUsedUrls] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // 1. Fetch all R2 files
            const r2Files = await r2Service.listObjects('');

            // 2. Fetch all media library stream URLs
            const { data: mediaData } = await supabase
                .from('media_library')
                .select('stream_url');

            // Extract just the filenames from full URLs
            const used = new Set<string>();
            mediaData?.forEach((item: any) => {
                const url = item.stream_url;
                // Extract filename from URL (e.g., "https://pub-.../videos/movie.mp4" -> "videos/movie.mp4")
                if (url) {
                    const match = url.match(/r2\.dev\/(.+)$/);
                    if (match) {
                        used.add(match[1]);
                    }
                    // Also check if it's just a filename
                    const filename = url.split('/').pop();
                    if (filename) {
                        used.add(filename);
                    }
                }
            });

            setUsedUrls(used);
            setFiles(r2Files);
        } catch (err) {
            console.error('Failed to fetch R2 files:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFiles = files.filter(file => {
        // Filter by video extensions
        const isVideo = /\.(mp4|mkv|avi|mov|webm|m3u8)$/i.test(file.key);
        if (!isVideo) return false;

        // Filter by search
        if (search && !file.key.toLowerCase().includes(search.toLowerCase())) {
            return false;
        }

        // Filter by usage
        if (filter === 'unused') {
            return !usedUrls.has(file.key);
        }

        return true;
    });

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* HEADER */}
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest text-white">R2 Storage Browser</h2>
                            <p className="text-[10px] font-mono text-slate-500 mt-1">
                                {filteredFiles.length} video{filteredFiles.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* FILTERS */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                            <button
                                onClick={() => setFilter('unused')}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'unused' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                Unused Only
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                All Videos
                            </button>
                        </div>
                    </div>
                </div>

                {/* FILE LIST */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-xs font-mono text-slate-500">Loading R2 storage...</p>
                            </div>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                                    {filter === 'unused' ? 'No unused videos found' : 'No videos found'}
                                </p>
                                <p className="text-[10px] font-mono text-slate-700 mt-2">
                                    {filter === 'unused' ? 'All videos are already in the library' : 'Upload videos to R2 first'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filteredFiles.map(file => {
                            const isUsed = usedUrls.has(file.key);
                            return (
                                <button
                                    key={file.key}
                                    onClick={() => onSelect(file.key)}
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-xl p-4 transition-all group text-left"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white truncate" title={file.key}>
                                                        {file.key.split('/').pop()}
                                                    </p>
                                                    {isUsed && (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[8px] font-black uppercase tracking-widest shrink-0">
                                                            In Library
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] font-mono text-slate-500">{formatSize(file.size)}</p>
                                                    <span className="text-slate-700">•</span>
                                                    <p className="text-[10px] font-mono text-slate-500">{formatDate(file.lastModified)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-white/10 bg-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default R2FileBrowser;
