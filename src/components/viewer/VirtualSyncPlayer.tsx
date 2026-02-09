
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { CLOUDFLARE_BASE_URL, APP_BRANDING } from '../../constants';
import VideoPlayer from './VideoPlayer';

interface VirtualSyncPlayerProps {
    channelId: string;
    channelName: string;
    isTheater: boolean;
    onToggleTheater: () => void;
}

interface ScheduleSegment {
    url: string;
    poster: string;
    title: string;
    isAd: boolean;
    duration: number;
    seekPosition: number;
}

const VirtualSyncPlayer = ({ channelId, channelName, isTheater, onToggleTheater }: VirtualSyncPlayerProps) => {
    const [channelData, setChannelData] = useState<any>(null);
    const [countdownText, setCountdownText] = useState("");
    const [status, setStatus] = useState<'loading' | 'countdown' | 'playing' | 'offline' | 'error'>('loading');
    const [currentSegment, setCurrentSegment] = useState<ScheduleSegment | null>(null);
    const [nextSegmentTitle, setNextSegmentTitle] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const scheduleRef = useRef<any[]>([]);
    const countdownIntervalRef = useRef<any>(null);
    const syncIntervalRef = useRef<any>(null);
    const presenceChannelRef = useRef<any>(null);
    const viewerIdRef = useRef<string>('');

    if (!viewerIdRef.current) {
        const existing = localStorage.getItem('nexus_viewer_id');
        const id = existing || (crypto?.randomUUID?.() ?? `viewer_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        viewerIdRef.current = id;
        if (!existing) localStorage.setItem('nexus_viewer_id', id);
    }

    // Fetch initial channel and schedule data
    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                // Get channel info
                const { data: chan, error: chanError } = await supabase
                    .from('virtual_channels')
                    .select('*')
                    .eq('id', channelId)
                    .single();

                if (chanError) throw chanError;
                if (!mounted) return;

                setChannelData(chan);

                // Check if channel is active
                if (!chan.is_active) {
                    setStatus('offline');
                    return;
                }

                // Check if scheduled for future
                if (chan.scheduled_start_time) {
                    const startTime = new Date(chan.scheduled_start_time).getTime();
                    const now = Date.now();

                    if (startTime > now) {
                        setStatus('countdown');
                        updateCountdown(startTime);
                        countdownIntervalRef.current = setInterval(() => {
                            if (startTime > Date.now()) {
                                updateCountdown(startTime);
                            } else {
                                // Scheduled time has passed
                                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                                fetchScheduleAndStart(chan.live_started_at || chan.scheduled_start_time);
                            }
                        }, 1000);
                        return;
                    }
                }

                // Channel is live, fetch schedule
                let startTime = chan.live_started_at || chan.scheduled_start_time;
                if (!startTime) {
                    startTime = new Date().toISOString();
                    // Best-effort: stamp a start time so all viewers can sync
                    supabase.from('virtual_channels').upsert({
                        id: chan.id,
                        live_started_at: startTime
                    }, { onConflict: 'id' }).then(() => { });
                }
                await fetchScheduleAndStart(startTime);

            } catch (err: any) {
                console.error('Error fetching channel:', err);
                if (mounted) {
                    setStatus('error');
                    setErrorMessage(err.message || 'Failed to load channel');
                }
            }
        };

        const fetchScheduleAndStart = async (startTime: string) => {
            try {
                // Fetch schedule
                const { data: scheduleData, error: scheduleError } = await supabase
                    .from('channel_schedule')
                    .select('*, media_library(title, stream_url, cover_url, duration), ads_library(title, ad_url, duration)')
                    .eq('channel_id', channelId)
                    .order('order_index', { ascending: true });

                if (scheduleError) throw scheduleError;
                if (!scheduleData || scheduleData.length === 0) {
                    setStatus('error');
                    setErrorMessage('Schedule is empty');
                    return;
                }

                if (!mounted) return;

                setSchedule(scheduleData);
                scheduleRef.current = scheduleData;

                // Calculate playback state based on server-side start time
                const playbackState = calculatePlaybackState(scheduleData, startTime);
                setCurrentSegment(playbackState.segment);
                setNextSegmentTitle(playbackState.nextTitle);
                setStatus('playing');

                // Set up periodic sync check (every 5 seconds)
                syncIntervalRef.current = setInterval(() => {
                    const newState = calculatePlaybackState(scheduleData, startTime);
                    if (newState.segment.url !== currentSegment?.url || newState.segment.seekPosition !== currentSegment?.seekPosition) {
                        setCurrentSegment(newState.segment);
                        setNextSegmentTitle(newState.nextTitle);
                    }
                }, 5000);

            } catch (err: any) {
                console.error('Error fetching schedule:', err);
                if (mounted) {
                    setStatus('error');
                    setErrorMessage(err.message || 'Failed to load schedule');
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [channelId]);

    // Presence tracking for live viewer count
    useEffect(() => {
        if (status !== 'playing') {
            if (presenceChannelRef.current) {
                supabase.removeChannel(presenceChannelRef.current);
                presenceChannelRef.current = null;
            }
            return;
        }

        const channel = supabase.channel(`live-viewers:${channelId}`, {
            config: { presence: { key: viewerIdRef.current } }
        });

        channel.subscribe((state) => {
            if (state === 'SUBSCRIBED') {
                channel.track({ online_at: new Date().toISOString() });
            }
        });

        presenceChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            presenceChannelRef.current = null;
        };
    }, [channelId, status]);

    const updateCountdown = (startTime: number) => {
        const diff = startTime - Date.now();
        if (diff <= 0) {
            setCountdownText("");
            return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`${hours}h ${mins}m ${secs}s`);
    };

    const resolveMediaUrl = (item: any): string => {
        if (item.media_id && item.media_library?.stream_url) {
            const url = item.media_library.stream_url;
            if (url.startsWith('http')) return url;
            return CLOUDFLARE_BASE_URL + url.replace(/^\/+/, '');
        }
        if (item.ad_id && item.ads_library?.ad_url) {
            const url = item.ads_library.ad_url;
            if (url.startsWith('http')) return url;
            return CLOUDFLARE_BASE_URL + url.replace(/^\/+/, '');
        }
        return '';
    };

    const resolvePoster = (item: any): string => {
        if (item.media_library?.cover_url) {
            const url = item.media_library.cover_url;
            if (url.startsWith('http')) return url;
            return CLOUDFLARE_BASE_URL + url.replace(/^\/+/, '');
        }
        return '';
    };

    const getItemDuration = (item: any): number => {
        return item.duration || item.media_library?.duration || item.ads_library?.duration || 0;
    };

    // Calculate playback state based on start time
    const calculatePlaybackState = (scheduleData: any[], startTime: string): { segment: ScheduleSegment; nextTitle: string } => {
        const startMs = new Date(startTime).getTime();
        if (Number.isNaN(startMs)) {
            return {
                segment: { url: '', poster: '', title: 'Invalid Start Time', isAd: false, duration: 0, seekPosition: 0 },
                nextTitle: ''
            };
        }
        const elapsedMs = Date.now() - startMs;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        const totalDuration = scheduleData.reduce((acc, curr) => acc + getItemDuration(curr), 0);
        if (totalDuration === 0) {
            return {
                segment: { url: '', poster: '', title: 'No Content', isAd: false, duration: 0, seekPosition: 0 },
                nextTitle: ''
            };
        }

        const cycleOffset = elapsedSeconds % totalDuration;

        let cumulative = 0;
        for (let i = 0; i < scheduleData.length; i++) {
            const item = scheduleData[i];
            const itemDuration = getItemDuration(item);

            if (cycleOffset >= cumulative && cycleOffset < cumulative + itemDuration) {
                const seekPosition = cycleOffset - cumulative;
                const url = resolveMediaUrl(item);
                const poster = resolvePoster(item);
                const title = item.media_library?.title || item.ads_library?.title || 'Unknown';
                const isAd = !!item.ad_id;

                // Get next title
                const nextIdx = (i + 1) % scheduleData.length;
                const nextItem = scheduleData[nextIdx];
                const nextTitle = nextItem?.media_library?.title || nextItem?.ads_library?.title || '';

                return {
                    segment: { url, poster, title, isAd, duration: itemDuration, seekPosition },
                    nextTitle
                };
            }
            cumulative += itemDuration;
        }

        // Fallback to first item
        const first = scheduleData[0];
        return {
            segment: {
                url: resolveMediaUrl(first),
                poster: resolvePoster(first),
                title: first.media_library?.title || first.ads_library?.title || 'Unknown',
                isAd: !!first.ad_id,
                duration: getItemDuration(first),
                seekPosition: 0
            },
            nextTitle: scheduleData[1]?.media_library?.title || scheduleData[1]?.ads_library?.title || ''
        };
    };

    const handleVideoEnded = useCallback(() => {
        if (scheduleRef.current.length === 0) return;

        // Get current index
        const currentIndex = scheduleRef.current.findIndex(item => {
            const url = resolveMediaUrl(item);
            return url === currentSegment?.url;
        });

        const nextIndex = (currentIndex + 1) % scheduleRef.current.length;
        const nextItem = scheduleRef.current[nextIndex];

        setCurrentSegment({
            url: resolveMediaUrl(nextItem),
            poster: resolvePoster(nextItem),
            title: nextItem.media_library?.title || nextItem.ads_library?.title || 'Unknown',
            isAd: !!nextItem.ad_id,
            duration: getItemDuration(nextItem),
            seekPosition: 0
        });

        // Update "Up Next"
        const afterNext = (nextIndex + 1) % scheduleRef.current.length;
        setNextSegmentTitle(scheduleRef.current[afterNext]?.media_library?.title || scheduleRef.current[afterNext]?.ads_library?.title || '');
    }, [currentSegment]);

    // Loading state
    if (status === 'loading') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-[2rem] border-2 border-slate-800 animate-pulse">
                <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Syncing Frequency...</span>
            </div>
        );
    }

    // Countdown state
    if (status === 'countdown') {
        return (
            <div
                className="w-full h-full flex flex-col items-center justify-center rounded-[2rem] border-2 border-slate-800 relative overflow-hidden"
                style={{
                    backgroundImage: `url(${APP_BRANDING.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-6 md:mb-8 shadow-[0_0_50px_rgba(168,85,247,0.2)]" />
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-white mb-3 md:mb-4 kairo-cyber-glow">Coming Live</h2>
                    <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-purple-500 mb-8 md:mb-12">{channelName}</p>
                    <div className="flex gap-4 justify-center">
                        <div className="bg-white/5 border border-white/10 px-4 py-4 md:px-8 md:py-6 rounded-3xl backdrop-blur-xl">
                            <span className="text-2xl md:text-5xl font-mono font-black text-white tracking-tighter">{countdownText}</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Time Remaining</p>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-6 md:bottom-12 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-slate-400 animate-pulse">{APP_BRANDING.name} Broadcast</div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-[2rem] border-2 border-slate-800">
                <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">Signal Lost</span>
                <span className="text-[9px] text-slate-500">{errorMessage || 'Unable to load channel'}</span>
            </div>
        );
    }

    // Offline state
    if (status === 'offline') {
        return (
            <div
                className="w-full h-full flex flex-col items-center justify-center rounded-[2rem] border-2 border-slate-800 relative overflow-hidden"
                style={{
                    backgroundImage: `url(${APP_BRANDING.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="absolute inset-0 bg-black/70 pointer-events-none" />
                <div className="relative z-10 text-center">
                    <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Channel Offline</span>
                    <span className="text-[9px] text-slate-500">This virtual channel is not currently broadcasting</span>
                    <p className="text-[8px] text-slate-600 mt-4">{APP_BRANDING.name}</p>
                </div>
            </div>
        );
    }

    // No segment loaded
    if (!currentSegment) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-[2rem] border-2 border-slate-800">
                <svg className="w-16 h-16 text-slate-800 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">No Signal Detected</span>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {/* Ad Badge Overlay */}
            {currentSegment.isAd && (
                <div className="absolute top-4 right-4 z-30 px-3 py-1.5 bg-orange-600 rounded-lg shadow-xl animate-pulse">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">AD</span>
                </div>
            )}

            {/* Now Playing / Up Next Overlay */}
            <div className="absolute bottom-20 left-4 z-30 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 max-w-xs">
                    <p className="text-[8px] font-black uppercase tracking-widest text-purple-400 mb-0.5">
                        {currentSegment.isAd ? 'AD BREAK' : 'NOW PLAYING'}
                    </p>
                    <p className="text-[10px] font-black uppercase text-white truncate">{currentSegment.title}</p>
                    {nextSegmentTitle && (
                        <p className="text-[8px] text-slate-500 mt-1 truncate">Up Next: {nextSegmentTitle}</p>
                    )}
                </div>
            </div>

            <VideoPlayer
                url={currentSegment.url}
                poster={currentSegment.poster}
                isTheater={isTheater}
                onToggleTheater={onToggleTheater}
                channelName={`${channelName} (BROADCAST)`}
                onEnded={handleVideoEnded}
                initialSeek={currentSegment.seekPosition}
            />
        </div>
    );
};

export default VirtualSyncPlayer;
