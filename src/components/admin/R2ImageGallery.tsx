import React, { useState, useEffect } from 'react';
import { r2Service } from '../../services/r2Service';
import { CLOUDFLARE_BASE_URL } from '../../constants';

const R2ImageGallery = () => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<any | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('images');

    useEffect(() => {
        fetchImages();
    }, [filter]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const allFiles = await r2Service.listObjects('');

            let filtered = allFiles;
            if (filter === 'images') {
                filtered = allFiles.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.key));
            } else if (filter === 'videos') {
                filtered = allFiles.filter(f => /\.(mp4|webm|mov|avi|mkv)$/i.test(f.key));
            }

            setImages(filtered);
        } catch (err) {
            console.error('Failed to fetch images:', err);
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
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = `uploads/${Date.now()}_${file.name}`;

                await r2Service.uploadFile(file, fileName, (progress) => {
                    setUploadProgress(Math.round(((i + progress / 100) / files.length) * 100));
                });
            }

            await fetchImages();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + (err as Error).message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (key: string) => {
        if (!confirm('Delete this file? This cannot be undone.')) return;

        try {
            await r2Service.deleteObject(key);
            await fetchImages();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Delete failed');
        }
    };

    const handleDownload = (key: string) => {
        const url = `${CLOUDFLARE_BASE_URL}${key}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = key.split('/').pop() || 'download';
        a.click();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('URL copied to clipboard!');
    };

    const getFileUrl = (key: string) => `${CLOUDFLARE_BASE_URL}${key}`;

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const isImage = (key: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key);
    const isVideo = (key: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(key);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* HEADER */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-[32px] border border-white/10 p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">R2 Media Gallery</h2>
                        <p className="text-[10px] font-mono text-slate-400">
                            {images.length} file{images.length !== 1 ? 's' : ''} • {filter.toUpperCase()}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Filter */}
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                            {(['all', 'images', 'videos'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Upload Button */}
                        <label className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black uppercase tracking-widest text-white cursor-pointer transition-all shadow-xl flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Files
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>

                        <button
                            onClick={fetchImages}
                            className="p-3 bg-black/40 hover:bg-white/10 rounded-xl border border-white/10 text-white transition-all"
                            title="Refresh"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Upload Progress */}
                {uploading && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-slate-400">Uploading...</span>
                            <span className="text-xs font-mono text-purple-400">{uploadProgress}%</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* GALLERY GRID */}
            {loading ? (
                <div className="bg-white/5 rounded-[32px] border border-white/5 p-20 text-center backdrop-blur-xl">
                    <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Loading Gallery...</p>
                </div>
            ) : images.length === 0 ? (
                <div className="bg-white/5 rounded-[32px] border border-white/5 p-20 text-center backdrop-blur-xl">
                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-600">No Files Found</p>
                    <p className="text-[10px] font-mono text-slate-700 mt-2">Upload some files to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {images.map(file => (
                        <div
                            key={file.key}
                            className="group relative bg-black/40 rounded-2xl border border-white/10 overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:border-purple-500/50"
                        >
                            {/* Preview */}
                            <div className="aspect-square bg-gradient-to-br from-slate-800 to-black relative overflow-hidden cursor-pointer"
                                onClick={() => setSelectedImage(file)}
                            >
                                {isImage(file.key) ? (
                                    <img
                                        src={getFileUrl(file.key)}
                                        alt={file.key}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : isVideo(file.key) ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-16 h-16 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-16 h-16 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(getFileUrl(file.key)); }}
                                        className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-xl"
                                        title="Copy URL"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(file.key); }}
                                        className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white transition-all shadow-xl"
                                        title="Download"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(file.key); }}
                                        className="p-3 bg-red-600 hover:bg-red-500 rounded-xl text-white transition-all shadow-xl"
                                        title="Delete"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <h4 className="text-xs font-bold text-white truncate" title={file.key}>
                                    {file.key.split('/').pop()}
                                </h4>
                                <p className="text-[9px] font-mono text-slate-500 mt-1">
                                    {formatSize(file.size)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PREVIEW MODAL */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="w-full max-w-6xl bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-black text-white truncate">{selectedImage.key.split('/').pop()}</h3>
                                <p className="text-[10px] font-mono text-slate-500 mt-1">{formatSize(selectedImage.size)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="p-3 hover:bg-white/10 rounded-full text-white transition-all ml-4"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="flex-1 bg-black relative overflow-auto flex items-center justify-center p-8">
                            {isImage(selectedImage.key) ? (
                                <img
                                    src={getFileUrl(selectedImage.key)}
                                    alt={selectedImage.key}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : isVideo(selectedImage.key) ? (
                                <video
                                    src={getFileUrl(selectedImage.key)}
                                    controls
                                    className="max-w-full max-h-full"
                                />
                            ) : (
                                <div className="text-center">
                                    <svg className="w-24 h-24 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-600">Preview Not Available</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-gradient-to-r from-transparent to-purple-500/10">
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="text"
                                    value={getFileUrl(selectedImage.key)}
                                    readOnly
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white"
                                />
                                <button
                                    onClick={() => copyToClipboard(getFileUrl(selectedImage.key))}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl"
                                >
                                    Copy URL
                                </button>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => handleDownload(selectedImage.key)}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl"
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => {
                                        handleDelete(selectedImage.key);
                                        setSelectedImage(null);
                                    }}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default R2ImageGallery;
