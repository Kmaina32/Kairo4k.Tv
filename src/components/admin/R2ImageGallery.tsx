import React, { useEffect, useState } from 'react';
import { r2Service, R2Object } from '../../services/r2Service';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];

const isImageKey = (key: string) => {
    const lower = key.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const R2ImageGallery = () => {
    const [images, setImages] = useState<R2Object[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const objects = await r2Service.listObjects();
            const onlyImages = objects.filter(obj => isImageKey(obj.key));
            setImages(onlyImages);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const filtered = images.filter(img => img.key.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white">R2 Image Vault</h2>
                    <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-1">Cloudflare Storage</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search images..."
                        className="bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-white w-56 focus:outline-none focus:border-orange-500/50"
                    />
                    <button
                        onClick={fetchImages}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-50">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">Scanning Images...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center opacity-30 border-2 border-dashed border-white/10 rounded-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.3em]">No images found</p>
                    <p className="text-[10px] mt-2">Upload covers or posters to see them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map(img => (
                        <div key={img.key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="aspect-square bg-black/40">
                                <img src={img.url} alt={img.key} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3">
                                <p className="text-[9px] font-black uppercase text-white truncate">{img.key.split('/').pop()}</p>
                                <p className="text-[8px] text-slate-500 font-mono mt-1">
                                    {(img.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default R2ImageGallery;
