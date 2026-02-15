import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';
import * as Constants from '../../../constants';
import { parseM3U } from '../../../services/m3uParser';
import { verifyStreamSignal } from '../../../services/signalScanner';
import VideoPlayer from '../../viewer/player/VideoPlayer';
import BrandedDialog from '../../frontend/BrandedDialog';

interface Playlist {
    id: string;
    name: string;
    url: string;
    type: string;
}

interface ChannelItem {
    id: string;
    name: string;
    group: string;
    logo: string;
    url: string;
    sourceName: string;
    playlistId: string;
}

interface BlacklistEntry {
    url: string;
    reason: string;
    created_at: string;
}

const LiveStreamManager = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [allChannels, setAllChannels] = useState<ChannelItem[]>([]);
    const [blacklist, setBlacklist] = useState<Record<string, BlacklistEntry>>({});
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);

    // UI State
    const [filter, setFilter] = useState<'all' | 'live' | 'blacklisted' | 'dead'>('all');
    const [search, setSearch] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
    const [signalStatus, setSignalStatus] = useState<Record<string, 'live' | 'dead' | 'pending'>>({});
    const [selectedSource, setSelectedSource] = useState<string>('All');
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'multiview'>('grid');
    const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
    const sourceDropdownRef = useRef<HTMLDivElement>(null);
    const [multiviewSlots, setMultiviewSlots] = useState<(ChannelItem | null)[]>([null, null, null, null]);
    const [flattenView, setFlattenView] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
                setIsSourceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchWithFallback = async (url: string, sourceName: string): Promise<string> => {
        if (!url) return '';

        if (url.startsWith('data:')) {
            try {
                const response = await fetch(url);
                return await response.text();
            } catch (e) {
                console.error(`Failed to fetch data URL for ${sourceName}:`, e);
                return '';
            }
        }

        const cacheKey = `kairo_cache_${sourceName}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < Constants.CACHE_TTL) return data;
        }

        // Try each proxy in order
        for (const proxy of Constants.PROXY_OPTIONS) {
            try {
                const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const text = await res.text();
                    if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
                        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
                        return text;
                    }
                }
            } catch (e) {
                console.warn(`Proxy ${proxy} failed for ${sourceName}, trying next...`);
            }
        }

        // Final direct fetch attempt
        try {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) {
                const text = await res.text();
                if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
                    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
                    return text;
                }
            }
        } catch (e) {
            console.error(`Direct fetch failed for ${sourceName}:`, e);
        }

        return '';
    };

    const fetchData = async (ignoreCache = false) => {
        setLoading(true);
        // Clear previous channels to prevent stale data
        setAllChannels([]);

        try {
            console.log('🔍 Fetching playlists from database...');
            const { data: dbPlaylists, error: plError } = await supabase.from('playlists').select('*').eq('is_active', true);

            if (plError) console.error('❌ Error fetching playlists:', plError);

            // Fetch virtual channels (Kairo Originals)
            const { data: vChannels } = await supabase.from('virtual_channels').select('*').eq('is_active', true);

            // Fallback to DEFAULT_PLAYLISTS if DB is empty
            let pl = (dbPlaylists || []).map(p => ({ ...p, id: p.id || p.name }));
            if (pl.length === 0) {
                console.log('💡 No active playlists in DB, using defaults...');
                pl = Constants.DEFAULT_PLAYLISTS.map((p, idx) => ({
                    ...p,
                    id: `default-${idx}`,
                    is_active: true
                }));
            }

            // Include Kairo Originals in the source list for filtering
            const virtualSource: Playlist = {
                id: 'virtual',
                name: 'KAIRO ORIGINALS',
                url: '',
                type: 'Premium'
            };

            const updatedPlaylists = [virtualSource, ...pl];
            console.log('📋 Updated Playlists:', updatedPlaylists.map(p => p.name));
            setPlaylists(updatedPlaylists);

            // Initial Blacklist Load
            const { data: bl } = await supabase.from('channel_blacklist').select('*');
            const blMap: Record<string, BlacklistEntry> = {};
            bl?.forEach((item: any) => {
                blMap[item.url] = item;
            });
            setBlacklist(blMap);

            // 1. Process Virtual Channels
            const virtualChannels: ChannelItem[] = (vChannels || []).map(vc => ({
                id: vc.id,
                name: vc.name,
                group: 'Kairo Originals',
                logo: vc.logo_url || '',
                url: `virtual://${vc.id}`,
                sourceName: 'KAIRO ORIGINALS',
                playlistId: 'virtual'
            }));

            if (virtualChannels.length > 0) {
                console.log(`✨ Added ${virtualChannels.length} virtual channels`);
                setAllChannels(prev => [...prev, ...virtualChannels]);
            }

            // 2. Process M3U Playlists Incrementally
            if (pl.length > 0) {
                console.log(`📡 Processing ${pl.length} playlists...`);

                const promises = pl.map(async (p) => {
                    try {
                        if (ignoreCache) {
                            localStorage.removeItem(`kairo_cache_${p.name}`);
                        }
                        const text = await fetchWithFallback(p.url, p.name);
                        if (!text) {
                            console.warn(`⚠️ No M3U text for playlist: ${p.name}`);
                            return;
                        }

                        const parsed = parseM3U(text, p.name);
                        console.log(`📌 Parsed ${parsed.length} channels from ${p.name}`);

                        if (parsed.length > 0) {
                            const mappedChannels = parsed.map(c => ({
                                id: c.id || `${p.id}-${Math.random().toString(36).substr(2, 9)}`,
                                name: c.name,
                                group: c.group || 'Uncategorized',
                                logo: c.logo || '',
                                url: c.url,
                                sourceName: p.name,
                                playlistId: p.id
                            }));

                            setAllChannels(prev => {
                                // Filter out existing channels from this source to prevent duplicates on refresh
                                const others = prev.filter(c => c.sourceName !== p.name);
                                return [...others, ...mappedChannels];
                            });
                        }
                    } catch (e: any) {
                        console.error(`❌ Failed to process playlist ${p.name}:`, e.message || e);
                    }
                });

                // Wait for either all to finish or 10 seconds timeout
                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 10000));
                await Promise.race([Promise.allSettled(promises), timeoutPromise]);
            }

        } catch (e) {
            console.error('💥 Error fetching data:', e);
        } finally {
            console.log('📡 Fetch complete');
            setLoading(false);
        }
    };

    // Group channels by their group name
    // Group channels by their group name
    const { groupedChannels, filteredItems } = useMemo<{
        groupedChannels: Record<string, ChannelItem[]>,
        filteredItems: ChannelItem[]
    }>(() => {
        let items = allChannels;

        console.log(`📊 Recalculating grouped channels. Total items: ${items.length}, Source: ${selectedSource}, Filter: ${filter}`);

        if (selectedSource !== 'All') {
            const normalizedSource = selectedSource.trim().toLowerCase();
            items = items.filter(c => (c.sourceName || '').trim().toLowerCase() === normalizedSource);
            console.log(`🔍 Filtered by source "${normalizedSource}": ${items.length} items remain`);
        }

        if (search) {
            const lowSearch = search.toLowerCase().trim();
            items = items.filter(c =>
                c.name.toLowerCase().includes(lowSearch) ||
                (c.group || '').toLowerCase().includes(lowSearch)
            );
        }

        if (filter === 'blacklisted') {
            items = items.filter(c => blacklist[c.url]);
        } else if (filter === 'live') {
            items = items.filter(c => signalStatus[c.url] === 'live');
        } else if (filter === 'dead') {
            items = items.filter(c => signalStatus[c.url] === 'dead');
        }

        // Group by category or flatten
        if (flattenView) {
            return {
                groupedChannels: { "All Channels": items },
                filteredItems: items
            };
        }

        const grouped: Record<string, ChannelItem[]> = {};
        items.forEach(channel => {
            const group = (channel.group || 'Uncategorized').trim();
            if (!grouped[group]) {
                grouped[group] = [];
            }
            grouped[group].push(channel);
        });

        console.log(`📦 Grouping complete. ${Object.keys(grouped).length} groups created.`);
        return {
            groupedChannels: grouped,
            filteredItems: items
        };
    }, [allChannels, blacklist, signalStatus, search, filter, selectedSource, flattenView]);

    const checkSignal = async (url: string) => {
        setSignalStatus(prev => ({ ...prev, [url]: 'pending' }));
        const isLive = await verifyStreamSignal(url);
        setSignalStatus(prev => ({ ...prev, [url]: isLive ? 'live' : 'dead' }));
        return isLive;
    };

    const handleBatchScan = async (group: string) => {
        setScanning(true);
        const channels = groupedChannels[group] || [];
        const batch = channels.filter(c => !signalStatus[c.url]);

        for (let i = 0; i < batch.length; i += 5) {
            const chunk = batch.slice(i, i + 5);
            await Promise.all(chunk.map(c => checkSignal(c.url)));
        }
        setScanning(false);
    };

    const toggleBlacklist = async (channel: ChannelItem) => {
        const isBlocked = !!blacklist[channel.url];

        if (isBlocked) {
            await supabase.from('channel_blacklist').delete().eq('url', channel.url);
            setBlacklist(prev => {
                const next = { ...prev };
                delete next[channel.url];
                return next;
            });
        } else {
            await supabase.from('channel_blacklist').insert({
                url: channel.url,
                channel_name: channel.name,
                reason: 'Manual Block'
            });
            setBlacklist(prev => ({
                ...prev,
                [channel.url]: {
                    url: channel.url,
                    reason: 'Manual Block',
                    created_at: new Date().toISOString()
                }
            }));
        }
    };

    const getGroupStats = (group: string) => {
        const channels = groupedChannels[group] || [];
        const total = channels.length;
        const live = channels.filter(c => signalStatus[c.url] === 'live').length;
        const dead = channels.filter(c => signalStatus[c.url] === 'dead').length;
        const blacklisted = channels.filter(c => blacklist[c.url]).length;
        return { total, live, dead, blacklisted };
    };

    const addToMultiview = (channel: ChannelItem) => {
        setMultiviewSlots(prev => {
            const next = [...prev];
            const emptyIndex = next.findIndex(slot => slot === null);
            if (emptyIndex !== -1) {
                next[emptyIndex] = channel;
            } else {
                // If full, replace first slot or show alert
                next[0] = channel;
            }
            return next;
        });
        setViewMode('multiview');
    };

    const removeFromMultiview = (index: number) => {
        setMultiviewSlots(prev => {
            const next = [...prev];
            next[index] = null;
            return next;
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* HEADER & CONTROLS */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-[32px] border border-white/10 p-8 backdrop-blur-xl shadow-2xl relative z-50 overflow-visible">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">Live Stream Monitor</h2>
                            <div className="flex flex-wrap gap-4 text-[10px] font-mono">
                                <span className="text-slate-400">Total: <span className="text-white font-bold">{allChannels.length}</span></span>
                                <span className="text-slate-400">Groups: <span className="text-purple-400 font-bold">{Object.keys(groupedChannels).length}</span></span>
                                <span className="text-slate-400">Blacklisted: <span className="text-red-400 font-bold">{Object.keys(blacklist).length}</span></span>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchData(true)}
                            disabled={loading}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all disabled:opacity-50 group"
                            title="Force Refresh (Ignore Cache)"
                        >
                            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Frequency (Source) Selector Dropdown */}
                        <div className="relative" ref={sourceDropdownRef}>
                            <button
                                onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-all min-w-[180px]"
                            >
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white flex-1 text-left truncate">
                                    {(selectedSource === 'All' ? 'All Frequencies' : selectedSource).trim()}
                                </span>
                                <svg className={`w-3 h-3 text-slate-500 transition-transform ${isSourceDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isSourceDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden z-[110] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 border-b border-white/5 bg-white/5">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Select Frequency</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto no-scrollbar">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSource('All');
                                                setIsSourceDropdownOpen(false);
                                                console.log('🎯 Frequency Selected: All');
                                            }}
                                            className={`w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between gap-3 ${selectedSource === 'All' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-1.5 h-1.5 rounded-full ${selectedSource === 'All' ? 'bg-white' : 'bg-slate-700'}`} />
                                                All Frequencies
                                            </div>
                                            <span className="text-[8px] opacity-60 font-mono">{allChannels.length}</span>
                                        </button>
                                        {playlists.map(p => {
                                            const normalizedPName = (p.name || '').trim().toLowerCase();
                                            const count = allChannels.filter(c => (c.sourceName || '').trim().toLowerCase() === normalizedPName).length;
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSource(p.name);
                                                        setIsSourceDropdownOpen(false);
                                                        console.log(`🎯 Frequency Selected: ${p.name}, Count: ${count}`);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between gap-3 ${selectedSource === p.name ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${selectedSource === p.name ? 'bg-white' : 'bg-slate-700'}`} />
                                                        {p.name}
                                                    </div>
                                                    <span className="text-[8px] opacity-60 font-mono">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search channels..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-xs text-white w-64 focus:outline-none focus:border-purple-500/50 transition-all"
                            />
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Filter */}
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                            {(['all', 'live', 'dead', 'blacklisted'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* View Mode */}
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                            {[
                                { id: 'grid', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', label: 'Grid' },
                                { id: 'list', icon: 'M4 6h16M4 12h16M4 18h16', label: 'List' },
                                { id: 'multiview', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', label: 'Multiview' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setViewMode(m.id as any)}
                                    className={`p-2 rounded-lg transition-all ${viewMode === m.id ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    title={`${m.label} View`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
                                    </svg>
                                </button>
                            ))}
                        </div>

                        {/* Flatten Toggle */}
                        <button
                            onClick={() => setFlattenView(!flattenView)}
                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${flattenView ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-black/40 border-white/10 text-slate-500'}`}
                        >
                            {flattenView ? 'Grouped View' : 'All Channels'}
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            {loading ? (
                <div className="bg-white/5 rounded-[32px] border border-white/5 p-20 text-center backdrop-blur-xl">
                    <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Syncing Network Map...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {viewMode === 'multiview' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-350px)]">
                            {multiviewSlots.map((slot, index) => (
                                <div key={index} className="relative bg-black/60 rounded-[32px] border border-white/10 overflow-hidden group min-h-[300px]">
                                    {slot ? (
                                        <div className="w-full h-full flex flex-col">
                                            <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/5 h-12">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{slot.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeFromMultiview(index)}
                                                    className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-lg transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex-1 bg-black">
                                                <VideoPlayer
                                                    url={slot.url}
                                                    poster={slot.logo}
                                                    channelName={slot.name}
                                                    isTheater={false}
                                                    onToggleTheater={() => { }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-700 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[length:24px_24px]">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                                <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Frequency Slot {index + 1}</p>
                                            <p className="text-[8px] font-mono text-slate-800">Add channel from Grouped View</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : Object.keys(groupedChannels).length === 0 ? (
                        <div className="bg-white/5 rounded-[32px] border border-white/5 p-20 text-center backdrop-blur-xl">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-600">No Channels Found</p>
                            <p className="text-[10px] font-mono text-slate-700 mt-2">Try adjusting your filters</p>
                        </div>
                    ) : (
                        Object.entries(groupedChannels).map(([group, channels]) => {
                            const stats = getGroupStats(group);
                            const isExpanded = selectedGroup === group || selectedGroup === null;

                            return (
                                <div key={group} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden backdrop-blur-xl transition-all hover:border-white/10">
                                    {/* GROUP HEADER */}
                                    <div
                                        className="p-6 bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all"
                                        onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-wider text-white">{group}</h3>
                                                    <div className="flex gap-4 mt-1">
                                                        <span className="text-[9px] font-mono text-slate-500">
                                                            Total: <span className="text-white font-bold">{stats.total}</span>
                                                        </span>
                                                        {stats.live > 0 && (
                                                            <span className="text-[9px] font-mono text-emerald-400">
                                                                Live: <span className="font-bold">{stats.live}</span>
                                                            </span>
                                                        )}
                                                        {stats.dead > 0 && (
                                                            <span className="text-[9px] font-mono text-slate-500">
                                                                Offline: <span className="font-bold">{stats.dead}</span>
                                                            </span>
                                                        )}
                                                        {stats.blacklisted > 0 && (
                                                            <span className="text-[9px] font-mono text-red-400">
                                                                Blocked: <span className="font-bold">{stats.blacklisted}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBatchScan(group);
                                                    }}
                                                    disabled={scanning}
                                                    className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                                                >
                                                    {scanning ? 'Scanning...' : 'Scan All'}
                                                </button>
                                                <svg
                                                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CHANNELS */}
                                    {isExpanded && (
                                        <div className="p-6">
                                            {viewMode === 'grid' ? (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                                    {channels.map(channel => {
                                                        const isBlacklisted = !!blacklist[channel.url];
                                                        const status = signalStatus[channel.url];

                                                        return (
                                                            <div
                                                                key={channel.id}
                                                                className={`group relative bg-black/40 rounded-2xl border overflow-hidden transition-all hover:scale-105 hover:shadow-xl ${isBlacklisted ? 'border-red-500/30 opacity-50' : 'border-white/10 hover:border-purple-500/50'}`}
                                                            >
                                                                {/* Channel Logo/Thumbnail */}
                                                                <div className="aspect-video bg-gradient-to-br from-slate-800 to-black relative overflow-hidden">
                                                                    {channel.logo ? (
                                                                        <img
                                                                            src={channel.logo}
                                                                            alt={channel.name}
                                                                            className="w-full h-full object-contain p-4"
                                                                            onError={e => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${channel.name}`}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/10">
                                                                            {channel.name[0]}
                                                                        </div>
                                                                    )}

                                                                    {/* Status Badge */}
                                                                    <div className="absolute top-2 right-2">
                                                                        {isBlacklisted ? (
                                                                            <span className="px-2 py-1 bg-red-500 text-white rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg">
                                                                                Blocked
                                                                            </span>
                                                                        ) : status === 'live' ? (
                                                                            <span className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                                                Live
                                                                            </span>
                                                                        ) : status === 'dead' ? (
                                                                            <span className="px-2 py-1 bg-slate-600 text-white rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg">
                                                                                Offline
                                                                            </span>
                                                                        ) : null}
                                                                    </div>

                                                                    {/* Hover Actions */}
                                                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => setSelectedChannel(channel)}
                                                                            className="p-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition-all shadow-xl"
                                                                            title="Watch"
                                                                        >
                                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                                                <path d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => addToMultiview(channel)}
                                                                            className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white transition-all shadow-xl"
                                                                            title="Add to Multiview"
                                                                        >
                                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                            </svg>
                                                                        </button>
                                                                        {!status && (
                                                                            <button
                                                                                onClick={() => checkSignal(channel.url)}
                                                                                className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-xl"
                                                                                title="Check Signal"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => toggleBlacklist(channel)}
                                                                            className={`p-3 rounded-xl text-white transition-all shadow-xl ${isBlacklisted ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                                                                            title={isBlacklisted ? 'Restore' : 'Block'}
                                                                        >
                                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                {isBlacklisted ? (
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                ) : (
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                                )}
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Channel Info */}
                                                                <div className="p-3">
                                                                    <h4 className="text-xs font-bold text-white truncate" title={channel.name}>
                                                                        {channel.name}
                                                                    </h4>
                                                                    <p className="text-[9px] font-mono text-slate-500 truncate mt-1">
                                                                        {channel.sourceName}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {channels.map(channel => {
                                                        const isBlacklisted = !!blacklist[channel.url];
                                                        const status = signalStatus[channel.url];

                                                        return (
                                                            <div
                                                                key={channel.id}
                                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:bg-white/5 ${isBlacklisted ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-black/20'}`}
                                                            >
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <img
                                                                        src={channel.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${channel.name}`}
                                                                        alt={channel.name}
                                                                        className="w-12 h-12 rounded-lg bg-black/40 object-contain"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="text-sm font-bold text-white truncate">{channel.name}</h4>
                                                                        <p className="text-[10px] font-mono text-slate-500 truncate">{channel.url}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    {/* Status */}
                                                                    {isBlacklisted ? (
                                                                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/30">
                                                                            Blocked
                                                                        </span>
                                                                    ) : status === 'live' ? (
                                                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                            Live
                                                                        </span>
                                                                    ) : status === 'dead' ? (
                                                                        <span className="px-3 py-1 bg-slate-600/20 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-600/30">
                                                                            Offline
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => checkSignal(channel.url)}
                                                                            className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                                                                        >
                                                                            Check
                                                                        </button>
                                                                    )}

                                                                    {/* Actions */}
                                                                    <button
                                                                        onClick={() => setSelectedChannel(channel)}
                                                                        className="p-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg transition-all"
                                                                        title="Watch"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                            <path d="M8 5v14l11-7z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => addToMultiview(channel)}
                                                                        className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                                                                        title="Add to Multiview"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => toggleBlacklist(channel)}
                                                                        className={`p-2 rounded-lg transition-all ${isBlacklisted ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white'}`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            {isBlacklisted ? (
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            ) : (
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                            )}
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* WATCH MODAL */}
            {selectedChannel && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="w-full max-w-6xl bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-transparent">
                            <div className="flex items-center gap-4">
                                <img
                                    src={selectedChannel.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedChannel.name}`}
                                    alt={selectedChannel.name}
                                    className="w-12 h-12 rounded-xl bg-black/40 object-contain"
                                />
                                <div>
                                    <h3 className="text-lg font-black text-white">{selectedChannel.name}</h3>
                                    <p className="text-[10px] font-mono text-slate-500">{selectedChannel.group} • {selectedChannel.sourceName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedChannel(null)}
                                className="p-3 hover:bg-white/10 rounded-full text-white transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 bg-black relative">
                            <VideoPlayer
                                url={selectedChannel.url}
                                poster={selectedChannel.logo}
                                isTheater={false}
                                onToggleTheater={() => { }}
                                channelName={selectedChannel.name}
                            />
                        </div>
                        <div className="p-6 flex justify-between items-center gap-4 bg-gradient-to-r from-transparent to-purple-500/10 border-t border-white/10">
                            <div className="flex gap-2">
                                {!signalStatus[selectedChannel.url] && (
                                    <button
                                        onClick={() => checkSignal(selectedChannel.url)}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl"
                                    >
                                        Test Signal
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    toggleBlacklist(selectedChannel);
                                    setSelectedChannel(null);
                                }}
                                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${blacklist[selectedChannel.url] ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                            >
                                {blacklist[selectedChannel.url] ? 'Restore Channel' : 'Blacklist Channel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveStreamManager;
