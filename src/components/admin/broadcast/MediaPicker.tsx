import React from 'react';
import { CLOUDFLARE_BASE_URL } from '../../../constants';

interface MediaItem {
    id: string;
    title: string;
    duration: number | null;
    cover_url: string | null;
    category: string | null;
}

interface AdItem {
    id: string;
    title: string;
    duration: number | null;
    ad_url: string;
}

interface MediaPickerProps {
    mediaList: MediaItem[];
    adsList: AdItem[];
    schedule: any[];
    pickerTab: 'media' | 'ads';
    mediaSearch: string;
    formatDuration: (seconds: number) => string;
    onPickerTabChange: (tab: 'media' | 'ads') => void;
    onMediaSearchChange: (value: string) => void;
    onAddMedia: (id: string) => void;
    onAddAd: (id: string) => void;
}

const MediaPicker = ({
    mediaList,
    adsList,
    schedule,
    pickerTab,
    mediaSearch,
    formatDuration,
    onPickerTabChange,
    onMediaSearchChange,
    onAddMedia,
    onAddAd
}: MediaPickerProps) => {
    const filteredMedia = mediaList.filter(m =>
        m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
        m.category?.toLowerCase().includes(mediaSearch.toLowerCase())
    );

    return (
        <div className="mt-8 pt-8 border-t border-white/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div className="flex gap-4">
                    <button
                        onClick={() => onPickerTabChange('media')}
                        className={`text-[10px] font-black uppercase tracking-widest transition-all ${pickerTab === 'media' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                        Media Library ({mediaList.length})
                    </button>
                    <button
                        onClick={() => onPickerTabChange('ads')}
                        className={`text-[10px] font-black uppercase tracking-widest transition-all ${pickerTab === 'ads' ? 'text-white border-b-2 border-orange-500 pb-1' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                        Ads Library ({adsList.length})
                    </button>
                </div>
                {pickerTab === 'media' && (
                    <input
                        type="text"
                        placeholder="Search media..."
                        value={mediaSearch}
                        onChange={(e) => onMediaSearchChange(e.target.value)}
                        className="bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-white w-full md:w-48 focus:outline-none focus:border-purple-500/50"
                    />
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[45vh] md:max-h-60 overflow-y-auto no-scrollbar pr-2">
                {pickerTab === 'media' ? (
                    filteredMedia.length > 0 ? filteredMedia.map(media => {
                        const alreadyInSchedule = schedule.some(s => s.media_id === media.id);
                        const hasDuration = media.duration && media.duration > 0;

                        return (
                            <div
                                key={media.id}
                                onClick={() => onAddMedia(media.id)}
                                className={`bg-white/5 border border-white/5 hover:border-purple-500/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group ${alreadyInSchedule ? 'ring-1 ring-purple-500/20' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden relative shrink-0">
                                    <img
                                        src={media.cover_url?.startsWith('http') ? media.cover_url : CLOUDFLARE_BASE_URL + (media.cover_url || '')}
                                        className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white truncate block">{media.title}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[7px] text-slate-600 uppercase font-bold">{media.category}</span>
                                        {hasDuration && (
                                            <span className="text-[7px] text-slate-700 font-mono">{formatDuration(media.duration)}</span>
                                        )}
                                        {!hasDuration && (
                                            <span className="text-[7px] text-orange-400 font-black">⚠ No duration</span>
                                        )}
                                    </div>
                                </div>
                                {alreadyInSchedule && (
                                    <span className="text-[7px] text-purple-400 font-black">✓</span>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="col-span-2 py-8 text-center opacity-30">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No media found</p>
                        </div>
                    )
                ) : (
                    adsList.length > 0 ? adsList.map(ad => {
                        const alreadyInSchedule = schedule.some(s => s.ad_id === ad.id);

                        return (
                            <div
                                key={ad.id}
                                onClick={() => onAddAd(ad.id)}
                                className="bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-orange-600/10 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-orange-500/40 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M11 5.882V19.297A1.71 1.71 0 018.676 20.825L4.241 17.5H1.75C0.784 17.5 0 16.716 0 15.75V9.25C0 8.284 0.784 7.5 1.75 7.5H4.241L8.676 4.175A1.71 1.71 0 0111 5.882Z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white truncate block">{ad.title}</span>
                                    {ad.duration ? (
                                        <span className="text-[7px] text-orange-500/60 uppercase font-bold">{ad.duration}s Ad Clip</span>
                                    ) : (
                                        <span className="text-[7px] text-orange-400 font-black">⚠ No duration</span>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-2 py-8 text-center opacity-30">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No ads available</p>
                            <p className="text-[9px] text-slate-700 mt-1">Create ads in Revenue Control</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default MediaPicker;
