
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const VirtualChannelManager = () => {
    const [channels, setChannels] = useState<any[]>([]);
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [adsList, setAdsList] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<any>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [pickerTab, setPickerTab] = useState<'media' | 'ads'>('media');
    const [mediaSearch, setMediaSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: chanData } = await supabase.from('virtual_channels').select('*').order('created_at', { ascending: false });
        const { data: mediaData } = await supabase.from('media_library').select('id, title, duration, cover_url, category').is('parent_id', null);
        const { data: adsData } = await supabase.from('ads_library').select('*').eq('is_active', true);

        if (chanData) setChannels(chanData);
        if (mediaData) setMediaList(mediaData);
        if (adsData) setAdsList(adsData);
    };

    const fetchSchedule = async (channelId: string) => {
        const { data } = await supabase
            .from('channel_schedule')
            .select('*, media_library(title, duration, cover_url), ads_library(title, duration)')
            .eq('channel_id', channelId)
            .order('order_index', { ascending: true });
        if (data) setSchedule(data);
    };

    const handleCreateChannel = async (e: any) => {
        e.preventDefault();
        const name = e.target.name.value;
        const { data, error } = await supabase.from('virtual_channels').insert([{ name }]).select().single();
        if (!error && data) {
            setIsCreating(false);
            fetchData();
        }
    };

    const addToSchedule = async (id: string, type: 'media' | 'ad') => {
        if (!selectedChannel) return;
        const payload: any = {
            channel_id: selectedChannel.id,
            order_index: schedule.length,
            duration: type === 'media'
                ? mediaList.find(m => m.id === id)?.duration
                : adsList.find(a => a.id === id)?.duration
        };

        if (type === 'media') payload.media_id = id;
        else payload.ad_id = id;

        const { error } = await supabase.from('channel_schedule').insert([payload]);
        if (!error) fetchSchedule(selectedChannel.id);
    };

    const removeFromSchedule = async (id: string) => {
        const { error } = await supabase.from('channel_schedule').delete().eq('id', id);
        if (!error) fetchSchedule(selectedChannel.id);
    };

    const updateChannelStartTime = async (id: string, time: string) => {
        const { error } = await supabase
            .from('virtual_channels')
            .update({ scheduled_start_time: time || null })
            .eq('id', id);

        if (!error) fetchData();
    };

    const toggleChannelLive = async (channel: any) => {
        const { error } = await supabase
            .from('virtual_channels')
            .update({ is_active: !channel.is_active })
            .eq('id', channel.id);

        if (!error) {
            fetchData();
            const updated = { ...channel, is_active: !channel.is_active };
            if (selectedChannel?.id === channel.id) {
                setSelectedChannel(updated);
            }
        }
    };

    const filteredMedia = mediaList.filter(m =>
        m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
        m.category.toLowerCase().includes(mediaSearch.toLowerCase())
    );

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white">Broadcast Deck</h2>
                    <p className="text-[10px] text-purple-500 font-black mt-1 uppercase tracking-widest">Virtual VOD-to-Live Systems</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/20"
                >
                    Initialize Channel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Channel List */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Active Frequencies</h3>
                    {channels.map(chan => (
                        <div
                            key={chan.id}
                            onClick={() => { setSelectedChannel(chan); fetchSchedule(chan.id); }}
                            className={`p-6 rounded-[32px] border transition-all cursor-pointer ${selectedChannel?.id === chan.id ? 'bg-purple-600 border-purple-400 shadow-2xl shadow-purple-900/40' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${chan.is_active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
                                <span className={`font-black uppercase tracking-widest text-sm ${selectedChannel?.id === chan.id ? 'text-white' : 'text-slate-300'}`}>{chan.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Schedule & Media Picker */}
                {selectedChannel && (
                    <div className="lg:col-span-2 space-y-8 bg-white/5 border border-white/10 rounded-[40px] p-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Program Loop: {selectedChannel.name}</h3>
                            <span className="text-[10px] font-mono text-purple-400 uppercase">{schedule.length} Segments</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {schedule.map((item, idx) => (
                                <div key={item.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-6 group">
                                    <span className="text-[10px] font-black text-slate-700 w-4">{idx + 1}</span>
                                    <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0">
                                        {item.media_library ? (
                                            <img src={item.media_library.cover_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-orange-500/10">
                                                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5.882V19.297A1.71 1.71 0 018.676 20.825L4.241 17.5H1.75C0.784 17.5 0 16.716 0 15.75V9.25C0 8.284 0.784 7.5 1.75 7.5H4.241L8.676 4.175A1.71 1.71 0 0111 5.882Z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[11px] font-black uppercase text-white">{item.media_library?.title || item.ads_library?.title}</h4>
                                            {item.ad_id && <span className="px-1.5 py-0.5 bg-orange-600/20 text-orange-500 text-[7px] font-black rounded border border-orange-500/20">AD</span>}
                                        </div>
                                        <p className="text-[9px] font-mono text-slate-500 uppercase mt-1">Duration: {Math.floor((item.media_library?.duration || item.ads_library?.duration || 0) / 60)}m</p>
                                    </div>
                                    <button onClick={() => removeFromSchedule(item.id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}

                            <div className="mt-8 pt-8 border-t border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setPickerTab('media')}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${pickerTab === 'media' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            Media Library
                                        </button>
                                        <button
                                            onClick={() => setPickerTab('ads')}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${pickerTab === 'ads' ? 'text-white border-b-2 border-orange-500 pb-1' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            Ads Library
                                        </button>
                                    </div>
                                    {pickerTab === 'media' && (
                                        <input
                                            type="text"
                                            placeholder="Search media..."
                                            value={mediaSearch}
                                            onChange={(e) => setMediaSearch(e.target.value)}
                                            className="bg-black/20 border border-white/5 rounded-xl px-4 py-1.5 text-[10px] text-white w-48 focus:outline-none focus:border-purple-500/50"
                                        />
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto no-scrollbar pr-2">
                                    {pickerTab === 'media' ? (
                                        filteredMedia.map(media => (
                                            <div
                                                key={media.id}
                                                onClick={() => addToSchedule(media.id, 'media')}
                                                className="bg-white/5 border border-white/5 hover:border-purple-500/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden relative">
                                                    <img src={media.cover_url} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white truncate block">{media.title}</span>
                                                    <span className="text-[7px] text-slate-600 uppercase font-bold">{media.category}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        adsList.map(ad => (
                                            <div
                                                key={ad.id}
                                                onClick={() => addToSchedule(ad.id, 'ad')}
                                                className="bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-orange-600/10 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-orange-500/40 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5.882V19.297A1.71 1.71 0 018.676 20.825L4.241 17.5H1.75C0.784 17.5 0 16.716 0 15.75V9.25C0 8.284 0.784 7.5 1.75 7.5H4.241L8.676 4.175A1.71 1.71 0 0111 5.882Z" /></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white truncate block">{ad.title}</span>
                                                    <span className="text-[7px] text-orange-500/60 uppercase font-bold">{Math.floor(ad.duration)}s Manual Ad</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-10 flex border-t border-white/5 pt-8 justify-between items-center">
                                    <div className="flex gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-600 mb-1">Total Duration</span>
                                            <span className="text-sm font-black text-white">
                                                {Math.floor(schedule.reduce((acc, curr) => acc + (curr.media_library?.duration || curr.ads_library?.duration || 0), 0) / 60)} Minutes
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-600 mb-1">Loop Status</span>
                                            <span className={`text-sm font-black ${selectedChannel.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {selectedChannel.is_active ? 'LIVE & BROADCASTING' : 'OFFLINE / STANDBY'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-600 mb-2">Schedule Start Time (Countdown)</span>
                                            <input
                                                type="datetime-local"
                                                defaultValue={selectedChannel.scheduled_start_time ? new Date(selectedChannel.scheduled_start_time).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => updateChannelStartTime(selectedChannel.id, e.target.value)}
                                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => toggleChannelLive(selectedChannel)}
                                            className={`px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-2xl ${selectedChannel.is_active ? 'bg-red-600 text-white shadow-red-900/20' : 'bg-emerald-600 text-white shadow-emerald-900/20 hover:scale-105 active:scale-95'}`}
                                        >
                                            {selectedChannel.is_active ? 'Go Offline' : 'Go Live Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
                        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-8">New Frequency</h2>
                        <form onSubmit={handleCreateChannel} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Channel Name</label>
                                <input
                                    name="name"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    placeholder="KAIRO_LIVE_01" required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-500">Abort</button>
                                <button type="submit" className="flex-1 py-4 bg-purple-600 rounded-2xl font-black uppercase text-[10px] text-white">Initialize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualChannelManager;
