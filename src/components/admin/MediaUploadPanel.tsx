import React, { useState, useRef } from 'react';
import { r2Service, UploadProgress } from '../../services/r2Service';
import { supabase } from '../../services/supabaseClient';
import { CLOUDFLARE_BASE_URL } from '../../constants';

interface MediaUploadPanelProps {
    onUploadComplete: () => void;
}

interface UploadFile {
    file: File;
    type: 'video' | 'cover';
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
    url?: string;
    error?: string;
    metadata?: {
        duration?: number;
        width?: number;
        height?: number;
    };
}

const MediaUploadPanel = ({ onUploadComplete }: MediaUploadPanelProps) => {
    const [uploads, setUploads] = useState<UploadFile[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Movie' as 'Movie' | 'Series' | 'Fallen' | 'Documentary' | 'Music',
        genre: '',
        release_year: new Date().getFullYear(),
    });
    const [isUploading, setIsUploading] = useState(false);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (files: FileList | null, type: 'video' | 'cover') => {
        if (!files) return;

        const newUploads: UploadFile[] = Array.from(files).map(file => ({
            file,
            type,
            progress: 0,
            status: 'pending',
        }));

        setUploads(prev => [...prev, ...newUploads]);

        // Extract metadata for videos
        if (type === 'video') {
            for (const upload of newUploads) {
                try {
                    const metadata = await r2Service.extractVideoMetadata(upload.file);
                    setUploads(prev =>
                        prev.map(u =>
                            u.file === upload.file ? { ...u, metadata } : u
                        )
                    );
                } catch (error) {
                    console.error('Metadata extraction failed:', error);
                }
            }
        }
    };

    const handleUpload = async () => {
        if (uploads.length === 0) {
            alert('Please select files to upload');
            return;
        }

        if (!formData.title) {
            alert('Please enter a title');
            return;
        }

        setIsUploading(true);

        try {
            const videoUpload = uploads.find(u => u.type === 'video');
            const coverUpload = uploads.find(u => u.type === 'cover');

            if (!videoUpload) {
                throw new Error('No video file selected');
            }

            // Upload video
            setUploads(prev =>
                prev.map(u =>
                    u === videoUpload ? { ...u, status: 'uploading' } : u
                )
            );

            const videoUrl = await r2Service.uploadFile(
                videoUpload.file,
                'videos',
                (progress) => {
                    setUploads(prev =>
                        prev.map(u =>
                            u === videoUpload ? { ...u, progress: progress.percentage } : u
                        )
                    );
                }
            );

            setUploads(prev =>
                prev.map(u =>
                    u === videoUpload ? { ...u, status: 'complete', url: videoUrl, progress: 100 } : u
                )
            );

            // Upload cover if provided, otherwise generate thumbnail
            let coverUrl = '';
            if (coverUpload) {
                setUploads(prev =>
                    prev.map(u =>
                        u === coverUpload ? { ...u, status: 'uploading' } : u
                    )
                );

                coverUrl = await r2Service.uploadFile(
                    coverUpload.file,
                    'covers',
                    (progress) => {
                        setUploads(prev =>
                            prev.map(u =>
                                u === coverUpload ? { ...u, progress: progress.percentage } : u
                            )
                        );
                    }
                );

                setUploads(prev =>
                    prev.map(u =>
                        u === coverUpload ? { ...u, status: 'complete', url: coverUrl, progress: 100 } : u
                    )
                );
            } else {
                // Generate thumbnail from video
                setUploads(prev =>
                    prev.map(u =>
                        u === videoUpload ? { ...u, status: 'processing' } : u
                    )
                );

                try {
                    const thumbnail = await r2Service.generateThumbnail(videoUpload.file);
                    coverUrl = await r2Service.uploadFile(thumbnail, 'covers');
                } catch (error) {
                    console.error('Thumbnail generation failed:', error);
                    // Use a default placeholder or video URL as fallback
                    coverUrl = videoUrl;
                }
            }

            // Save to database
            const { data, error } = await supabase.from('media_library').insert({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                genre: formData.genre,
                release_year: formData.release_year,
                stream_url: videoUrl.replace(CLOUDFLARE_BASE_URL, ''),
                cover_url: coverUrl.replace(CLOUDFLARE_BASE_URL, ''),
                is_active: true,
            }).select().single();

            if (error) throw error;

            alert('Upload successful!');
            resetForm();
            onUploadComplete();

            // If it's a series, maybe tell the parent to open the episode manager
            if (formData.category === 'Series' && data) {
                // We could pass data back if needed, but for now we'll just rely on the user manual navigation or auto-switching view.
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
            setUploads(prev =>
                prev.map(u => ({ ...u, status: 'error', error: error.message }))
            );
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setUploads([]);
        setFormData({
            title: '',
            description: '',
            category: 'Movie',
            genre: '',
            release_year: new Date().getFullYear(),
        });
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    const removeUpload = (upload: UploadFile) => {
        setUploads(prev => prev.filter(u => u !== upload));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                    Upload Media to R2
                </h2>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Title *
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                        placeholder="Movie or Series Title"
                    />
                </div>

                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Category *
                    </label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    >
                        <option value="Movie">Movie</option>
                        <option value="Series">Series</option>
                        <option value="Fallen">Fallen</option>
                        <option value="Documentary">Documentary</option>
                        <option value="Music">Music</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Genre
                    </label>
                    <input
                        type="text"
                        value={formData.genre}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                        placeholder="Action, Drama, etc."
                    />
                </div>

                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Release Year
                    </label>
                    <input
                        type="number"
                        value={formData.release_year}
                        onChange={(e) => setFormData({ ...formData, release_year: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50"
                        min="1900"
                        max={new Date().getFullYear() + 5}
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 h-24"
                        placeholder="Enter a brief description..."
                    />
                </div>
            </div>

            {/* File Upload Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Upload */}
                <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-orange-500', 'bg-orange-500/10'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-orange-500', 'bg-orange-500/10'); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-orange-500', 'bg-orange-500/10');
                        handleFileSelect(e.dataTransfer.files, 'video');
                    }}
                    className="transition-all rounded-xl"
                >
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Video File * (.mp4, .webm, .mov)
                    </label>
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => handleFileSelect(e.target.files, 'video')}
                        className="hidden"
                    />
                    <button
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-orange-500/50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                    >
                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Click or Drag video here</p>
                    </button>
                </div>

                {/* Cover Upload */}
                <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-500/10'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-500', 'bg-blue-500/10'); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-500/10');
                        handleFileSelect(e.dataTransfer.files, 'cover');
                    }}
                    className="transition-all rounded-xl"
                >
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Cover Image (Optional)
                    </label>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e.target.files, 'cover')}
                        className="hidden"
                    />
                    <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500/50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                    >
                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Click or Drag image here</p>
                        <p className="text-[10px] text-slate-600 mt-1">Auto-generated if not provided</p>
                    </button>
                </div>
            </div>

            {/* Upload Preview */}
            {uploads.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-orange-500">Selected Files</h3>
                    {uploads.map((upload, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${upload.type === 'video' ? 'bg-orange-600/20 text-orange-400' : 'bg-blue-600/20 text-blue-400'
                                        }`}>
                                        {upload.type === 'video' ? '🎬' : '🖼️'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{upload.file.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                                            {upload.metadata && ` • ${Math.floor(upload.metadata.duration / 60)}:${(upload.metadata.duration % 60).toFixed(0).padStart(2, '0')}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeUpload(upload)}
                                    disabled={isUploading}
                                    className="p-2 hover:bg-red-600/20 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Progress Bar */}
                            {upload.status === 'uploading' && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Uploading...</span>
                                        <span className="text-orange-400 font-bold">{upload.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-600 transition-all duration-300"
                                            style={{ width: `${upload.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {upload.status === 'processing' && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-blue-400">
                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    Generating thumbnail...
                                </div>
                            )}

                            {upload.status === 'complete' && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Upload complete
                                </div>
                            )}

                            {upload.status === 'error' && (
                                <div className="mt-3 text-xs text-red-400">
                                    Error: {upload.error}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-3">
                <button
                    onClick={handleUpload}
                    disabled={isUploading || uploads.length === 0}
                    className="flex-1 px-6 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    {isUploading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload to R2
                        </>
                    )}
                </button>

                <button
                    onClick={resetForm}
                    disabled={isUploading}
                    className="px-6 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default MediaUploadPanel;
