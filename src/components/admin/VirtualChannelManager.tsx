
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ADMIN_TEST_DURATION_KEY, ADMIN_TEST_DURATION_SECONDS, CLOUDFLARE_BASE_URL } from '../../constants';

interface ScheduleItem {
    id: string;
    channel_id: string;
    media_id: string | null;
    ad_id: string | null;
    order_index: number;
    duration: number;
    media_library?: { title: string; duration: number; cover_url: string; stream_url: string; category: string };
    ads_library?: { title: string; duration: number; ad_url: string };
}

const VirtualChannelManager = () => {
    const [channels, setChannels] = useState<any[]>([]);
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [adsList, setAdsList] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<any>(null);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [pickerTab, setPickerTab] = useState<'media' | 'ads'>('media');
    const [mediaSearch, setMediaSearch] = useState('');
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [liveViewers, setLiveViewers] = useState<number>(0);
    const [liveMetrics, setLiveMetrics] = useState<{
        title: string;
        isAd: boolean;
        segmentElapsed: number;
        segmentRemaining: number;
        segmentDuration: number;
        loopElapsed: number;
        loopDuration: number;
        index: number;
    } | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [pendingName, setPendingName] = useState('');
    const [showMissingReport, setShowMissingReport] = useState(false);
    const [showResyncConfirm, setShowResyncConfirm] = useState(false);
    const [realtimeEnabled, setRealtimeEnabled] = useState(true);
    const [realtimeError, setRealtimeError] = useState<string | null>(null);
    const autoBackfillAttemptRef = useRef<string | null>(null);
    const [durationBackfillFailedCount, setDurationBackfillFailedCount] = useState(0);
    const [isSavingDurations, setIsSavingDurations] = useState(false);
    const [testDurationEnabled, setTestDurationEnabled] = useState(() => localStorage.getItem(ADMIN_TEST_DURATION_KEY) === 'true');
    const [mobilePanel, setMobilePanel] = useState<'schedule' | 'picker'>('schedule');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === ADMIN_TEST_DURATION_KEY) {
                setTestDurationEnabled(event.newValue === 'true');
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        if (selectedChannel) {
            fetchSchedule(selectedChannel.id);
            setPendingName(selectedChannel.name || '');
            setIsEditingName(false);
        }
    }, [selectedChannel?.id]);

    useEffect(() => {
        if (!selectedChannel?.id) return;
        if (!realtimeEnabled) return;
        if (document.visibilityState !== 'visible') return;
        const channel = supabase.channel(`live-viewers:${selectedChannel.id}`, {
            config: { presence: { key: `admin_${selectedChannel.id}` } }
        });

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            setLiveViewers(Object.keys(state).length);
        });

        try {
            channel.subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setRealtimeEnabled(false);
                    setRealtimeError('Realtime connection failed. Live viewer count disabled.');
                }
            });
        } catch (err: any) {
            setRealtimeEnabled(false);
            setRealtimeError(err?.message || 'Realtime connection failed. Live viewer count disabled.');
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedChannel?.id, realtimeEnabled]);

    const fetchData = async () => {
        const { data: chanData } = await supabase.from('virtual_channels').select('*').order('created_at', { ascending: false });
        const { data: mediaData } = await supabase.from('media_library').select('id, title, duration, cover_url, stream_url, category').is('parent_id', null).eq('is_active', true);
        const { data: adsData } = await supabase.from('ads_library').select('*').eq('is_active', true);

        if (chanData) setChannels(chanData);
        if (mediaData) setMediaList(mediaData);
        if (adsData) setAdsList(adsData);
    };

    const saveChannelName = async () => {
        if (!selectedChannel) return;
        const name = pendingName.trim();
        if (!name) {
            setError('Channel name cannot be empty');
            return;
        }
        const { error } = await supabase
            .from('virtual_channels')
            .upsert({ id: selectedChannel.id, name }, { onConflict: 'id' });
        if (error) {
            setError(error.message);
            return;
        }
        setSuccess('Channel name updated');
        setIsEditingName(false);
        fetchData();
    };

    const fetchSchedule = async (channelId: string) => {
        const { data } = await supabase
            .from('channel_schedule')
            .select('*, media_library(title, duration, cover_url, stream_url, category), ads_library(title, duration, ad_url)')
            .eq('channel_id', channelId)
            .order('order_index', { ascending: true });
        if (data) {
            const cachedDurations = new Map(schedule.map(item => [item.id, item.duration]));
            setSchedule(data.map(item => {
                const resolved = toNumber(item.duration) || toNumber(item.media_library?.duration) || toNumber(item.ads_library?.duration) || 0;
                const cached = cachedDurations.get(item.id) || 0;
                return { ...item, duration: resolved > 0 ? resolved : cached };
            }));
            await autoBackfillMissingDurations(data, channelId);
        }
    };

    const handleCreateChannel = async (e: any) => {
        e.preventDefault();
        const name = e.target.name.value;
        const description = e.target.description?.value || '';
        const { data, error } = await supabase.from('virtual_channels').insert([{ name, description }]).select().single();
        if (!error && data) {
            setIsCreating(false);
            fetchData();
            setSelectedChannel(data);
        }
    };

    const addToSchedule = async (id: string, type: 'media' | 'ad', durationOverride?: number) => {
        if (!selectedChannel) return;

        let duration: number;
        let payload: any = {
            channel_id: selectedChannel.id,
            order_index: schedule.length,
        };

        if (type === 'media') {
            const media = mediaList.find(m => m.id === id);
            duration = durationOverride || media?.duration || 0;
            payload.media_id = id;
            payload.duration = duration;
        } else {
            const ad = adsList.find(a => a.id === id);
            duration = durationOverride || ad?.duration || 0;
            payload.ad_id = id;
            payload.duration = duration;
        }

        // Remove undefined values to avoid Supabase errors
        if (payload.media_id === undefined) { delete payload.media_id; }
        if (payload.ad_id === undefined) { delete payload.ad_id; }

        const { error, data: inserted } = await supabase.from('channel_schedule').insert([payload]).select().single();
        if (!error) {
            if (duration <= 0 && inserted) {
                const url = type === 'media'
                    ? normalizeR2Url(mediaList.find(m => m.id === id)?.stream_url || '')
                    : normalizeR2Url(adsList.find(a => a.id === id)?.ad_url || '');
                if (url) {
                    try {
                        const resolved = await fetchDurationFromUrl(url);
                        applyDurationOverride(inserted.id, resolved, type === 'media' ? id : null, type === 'ad' ? id : null);
                    } catch {
                        // ignore duration fetch errors
                    }
                }
            }
            fetchSchedule(selectedChannel.id);
            setSuccess(`${type === 'media' ? 'Media' : 'Ad'} added to schedule`);
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(error.message);
        }
    };

    const removeFromSchedule = async (id: string) => {
        const { error } = await supabase.from('channel_schedule').delete().eq('id', id);
        if (!error) {
            // Re-index remaining items
            const remaining = schedule.filter(s => s.id !== id);
            await reindexSchedule(remaining);
            fetchSchedule(selectedChannel.id);
        }
    };

    const reindexSchedule = async (items: ScheduleItem[]) => {
        for (let i = 0; i < items.length; i++) {
            if (items[i].order_index !== i) {
                await supabase
                    .from('channel_schedule')
                    .upsert({ id: items[i].id, order_index: i }, { onConflict: 'id' });
            }
        }
    };

    // Server-side go_live function
    const handleGoLive = async () => {
        if (!selectedChannel || schedule.length === 0) {
            setError('Schedule is empty. Add media before going live.');
            return;
        }

        setProcessing('Going live...');
        setError(null);

        try {
            // Call server-side function
            const { data, error } = await supabase.rpc('go_live', { channel_uuid: selectedChannel.id });

            if (error) {
                // Fallback to direct update
                const { error: updateError } = await supabase
                    .from('virtual_channels')
                    .upsert({
                        id: selectedChannel.id,
                        is_active: true,
                        live_started_at: new Date().toISOString(),
                        scheduled_start_time: null
                    }, { onConflict: 'id' });

                if (updateError) throw updateError;
            } else if (data?.success === false) {
                throw new Error(data.error);
            }

            fetchData();
            setSuccess('Channel is now LIVE!');
        } catch (err: any) {
            setError(err.message || 'Failed to go live');
        } finally {
            setProcessing(null);
            setTimeout(() => { setSuccess(null); setError(null); }, 5000);
        }
    };

    // Server-side go_offline function
    const handleGoOffline = async () => {
        if (!selectedChannel) return;
        setProcessing('Going offline...');

        try {
            const { error } = await supabase.rpc('go_offline', { channel_uuid: selectedChannel.id });

            // Fallback
            if (error) {
                await supabase
                    .from('virtual_channels')
                    .upsert({
                        id: selectedChannel.id,
                        is_active: false,
                        live_started_at: null
                    }, { onConflict: 'id' });
            }

            fetchData();
            setSuccess('Channel is now OFFLINE');
        } catch (err: any) {
            setError(err.message || 'Failed to go offline');
        } finally {
            setProcessing(null);
            setTimeout(() => { setSuccess(null); setError(null); }, 5000);
        }
    };

    // Server-side schedule_live function
    const handleScheduleLive = async (time: string) => {
        if (!selectedChannel || !time) return;
        setProcessing('Scheduling...');

        try {
            const isoTime = fromLocalInputValue(time);
            if (!isoTime) {
                throw new Error('Invalid time value');
            }
            const { error } = await supabase.rpc('schedule_live', {
                channel_uuid: selectedChannel.id,
                start_time: isoTime
            });

            // Fallback
            if (error) {
                await supabase
                    .from('virtual_channels')
                    .upsert({
                        id: selectedChannel.id,
                        is_active: true,
                        scheduled_start_time: isoTime,
                        live_started_at: isoTime
                    }, { onConflict: 'id' });
            }

            fetchData();
            setSuccess(`Channel scheduled for ${new Date(time).toLocaleString()}`);
        } catch (err: any) {
            setError(err.message || 'Failed to schedule');
        } finally {
            setProcessing(null);
            setTimeout(() => { setSuccess(null); setError(null); }, 5000);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = async (index: number) => {
        if (dragIndex === null || dragIndex === index) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }

        setIsReordering(true);
        const newSchedule = [...schedule];
        const [moved] = newSchedule.splice(dragIndex, 1);
        newSchedule.splice(index, 0, moved);

        setSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));
        await reindexSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));

        setDragIndex(null);
        setDragOverIndex(null);
        setIsReordering(false);
        fetchSchedule(selectedChannel.id);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const moveItem = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= schedule.length) return;

        setIsReordering(true);
        const newSchedule = [...schedule];
        [newSchedule[index], newSchedule[newIndex]] = [newSchedule[newIndex], newSchedule[index]];

        setSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));
        await reindexSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));

        setIsReordering(false);
        fetchSchedule(selectedChannel.id);
    };

    const filteredMedia = mediaList.filter(m =>
        m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
        m.category?.toLowerCase().includes(mediaSearch.toLowerCase())
    );

    const toggleTestDuration = () => {
        const next = !testDurationEnabled;
        setTestDurationEnabled(next);
        localStorage.setItem(ADMIN_TEST_DURATION_KEY, String(next));
        if (selectedChannel?.id) fetchSchedule(selectedChannel.id);
    };

    const toNumber = (value: unknown) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    };

    const getItemDuration = (item: ScheduleItem) => {
        if (testDurationEnabled) return ADMIN_TEST_DURATION_SECONDS;
        return toNumber(item.duration) || toNumber(item.media_library?.duration) || toNumber(item.ads_library?.duration) || 0;
    };

    // Calculate total duration, handling null/0 values
    const totalDuration = schedule.reduce((acc, curr) => acc + getItemDuration(curr), 0);

    const mediaCount = schedule.filter(s => s.media_id).length;
    const adCount = schedule.filter(s => s.ad_id).length;

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const toLocalInputValue = (isoString: string) => {
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return '';
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
    };

    const fromLocalInputValue = (value: string) => {
        const [datePart, timePart] = value.split('T');
        if (!datePart || !timePart) return '';
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        const local = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
        return local.toISOString();
    };

    const missingDurationCount = schedule.filter(item => getItemDuration(item) <= 0).length;

    const applyDurationOverride = (scheduleId: string, duration: number, mediaId: string | null, adId: string | null) => {
        setSchedule(prev => prev.map(item => item.id === scheduleId ? { ...item, duration } : item));
        if (mediaId) {
            setMediaList(prev => prev.map(m => m.id === mediaId ? { ...m, duration } : m));
        }
        if (adId) {
            setAdsList(prev => prev.map(a => a.id === adId ? { ...a, duration } : a));
        }
    };

    const autoBackfillMissingDurations = async (items: ScheduleItem[], channelId: string) => {
        if (testDurationEnabled) return;
        if (autoBackfillAttemptRef.current === channelId) return;
        const pending = items.filter(item => getItemDuration(item) <= 0);
        if (pending.length === 0) return;
        autoBackfillAttemptRef.current = channelId;
        setProcessing('Auto-calculating durations...');
        setDurationBackfillFailedCount(0);
        let failedCount = 0;
        try {
            for (const item of pending) {
                const url = resolveMediaUrl(item);
                if (!url) {
                    failedCount += 1;
                    continue;
                }
                try {
                    const duration = await fetchDurationFromUrl(url);
                    applyDurationOverride(item.id, duration, item.media_id, item.ad_id);
                } catch {
                    failedCount += 1;
                }
            }
            await fetchSchedule(channelId);
        } finally {
            if (failedCount > 0) {
                setDurationBackfillFailedCount(failedCount);
            }
            setProcessing(null);
        }
    };

    const saveDurationsToDb = async () => {
        if (!selectedChannel) return;
        setIsSavingDurations(true);
        setError(null);
        try {
            const payload = schedule.map(item => ({
                id: item.id,
                channel_id: selectedChannel.id,
                order_index: item.order_index,
                media_id: item.media_id,
                ad_id: item.ad_id,
                duration: getItemDuration(item)
            }));

            const { error } = await supabase
                .from('channel_schedule')
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;
            setSuccess('Durations saved to database');
        } catch (err: any) {
            setError(err.message || 'Failed to save durations');
        } finally {
            setIsSavingDurations(false);
            setTimeout(() => { setSuccess(null); setError(null); }, 4000);
        }
    };

    const normalizeR2Url = (url: string): string => {
        if (url.startsWith('http')) {
            if (url.includes('.r2.dev/')) {
                const [, path] = url.split('.r2.dev/');
                return `${CLOUDFLARE_BASE_URL}${(path || '').replace(/^\/+/, '')}`;
            }
            return url;
        }
        return `${CLOUDFLARE_BASE_URL}${url.replace(/^\/+/, '')}`;
    };

    const resolveMediaUrl = (item: ScheduleItem) => {
        if (item.media_library?.stream_url) {
            return normalizeR2Url(item.media_library.stream_url);
        }
        if (item.ads_library?.ad_url) {
            return normalizeR2Url(item.ads_library.ad_url);
        }
        return '';
    };

    const getMissingDurationItems = () => {
        return schedule.filter(item => getItemDuration(item) <= 0).map(item => ({
            id: item.id,
            title: item.media_library?.title || item.ads_library?.title || 'Unknown',
            type: item.ad_id ? 'AD' : 'MEDIA',
            url: resolveMediaUrl(item)
        }));
    };

    const retryDurationForItem = async (item: { id: string; url: string; title: string; type: string }) => {
        if (!selectedChannel) return;
        if (!item.url) {
            setError('Missing media URL');
            return;
        }
        setProcessing(`Retrying duration for ${item.title}...`);
        setError(null);
        try {
            const duration = await fetchDurationFromUrl(item.url);
            const scheduleItem = schedule.find(s => s.id === item.id);
            applyDurationOverride(item.id, duration, scheduleItem?.media_id || null, scheduleItem?.ad_id || null);
            fetchSchedule(selectedChannel.id);
            setSuccess(`Duration updated for ${item.title}`);
        } catch (err: any) {
            setError(err.message || 'Retry failed');
        } finally {
            setProcessing(null);
            setTimeout(() => { setSuccess(null); setError(null); }, 3000);
        }
    };

    const fetchDurationFromUrl = (url: string) => {
        return new Promise<number>((resolve, reject) => {
            const video = document.createElement('video');
            let timeoutId: number | null = null;

            const cleanup = () => {
                if (timeoutId) window.clearTimeout(timeoutId);
                video.remove();
            };

            video.preload = 'metadata';
            video.crossOrigin = 'anonymous';
            video.onloadedmetadata = () => {
                const dur = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
                cleanup();
                if (dur > 0) resolve(dur);
                else reject(new Error('Invalid duration'));
            };
            video.onerror = () => {
                cleanup();
                reject(new Error('Failed to load metadata'));
            };

            timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error('Metadata timeout'));
            }, 15000);

            video.src = url;
        });
    };

    const backfillMissingDurations = async () => {
        if (!selectedChannel) return;
        const pending = schedule.filter(item => getItemDuration(item) <= 0);
        if (pending.length === 0) {
            setSuccess('All items already have durations');
            setTimeout(() => setSuccess(null), 3000);
            return;
        }

        setProcessing('Calculating durations...');
        setError(null);
        try {
            for (const item of pending) {
                const url = resolveMediaUrl(item);
                if (!url) continue;

                try {
                    const duration = await fetchDurationFromUrl(url);
                    applyDurationOverride(item.id, duration, item.media_id, item.ad_id);
                } catch (e) {
                    console.warn('Duration backfill failed for item', item.id, e);
                }
            }

            fetchSchedule(selectedChannel.id);
            setSuccess('Durations recalculated');
        } catch (err: any) {
            setError(err.message || 'Failed to recalculate durations');
        } finally {
            setProcessing(null);
            setTimeout(() => { setSuccess(null); setError(null); }, 4000);
        }
    };

    const forceResyncStart = async () => {
        if (!selectedChannel) return;
        const now = new Date().toISOString();
        await supabase.from('virtual_channels').upsert({
            id: selectedChannel.id,
            live_started_at: now,
            is_active: true
        }, { onConflict: 'id' });
        fetchData();
    };

    const computeLiveMetrics = () => {
        if (!selectedChannel?.is_active || schedule.length === 0) {
            setLiveMetrics(null);
            return;
        }

        const startTime = selectedChannel.live_started_at || selectedChannel.scheduled_start_time;
        if (!startTime) {
            setLiveMetrics(null);
            return;
        }

        const startMs = new Date(startTime).getTime();
        if (Number.isNaN(startMs)) {
            setLiveMetrics(null);
            return;
        }

        const loopDuration = schedule.reduce((acc, item) => acc + getItemDuration(item), 0);
        if (loopDuration <= 0) {
            setLiveMetrics(null);
            return;
        }

        const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
        const loopElapsed = ((elapsedSeconds % loopDuration) + loopDuration) % loopDuration;

        let cumulative = 0;
        for (let i = 0; i < schedule.length; i++) {
            const item = schedule[i];
            const duration = getItemDuration(item);
            if (loopElapsed >= cumulative && loopElapsed < cumulative + duration) {
                const segmentElapsed = loopElapsed - cumulative;
                const segmentRemaining = Math.max(duration - segmentElapsed, 0);
                const title = item.media_library?.title || item.ads_library?.title || 'Unknown';
                const isAd = !!item.ad_id;
                setLiveMetrics({
                    title,
                    isAd,
                    segmentElapsed,
                    segmentRemaining,
                    segmentDuration: duration,
                    loopElapsed,
                    loopDuration,
                    index: i
                });
                return;
            }
            cumulative += duration;
        }

        setLiveMetrics(null);
    };

    useEffect(() => {
        computeLiveMetrics();
        const t = setInterval(computeLiveMetrics, 1000);
        return () => clearInterval(t);
    }, [selectedChannel?.id, selectedChannel?.is_active, selectedChannel?.live_started_at, selectedChannel?.scheduled_start_time, schedule]);

    const getScheduleTimeline = () => {
        let cumulative = 0;
        return schedule.map(item => {
            const duration = getItemDuration(item);
            const start = cumulative;
            cumulative += duration;
            return { ...item, startTime: start, endTime: cumulative };
        });
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Success/Error Messages */}
            {error && (
                <div className="fixed top-4 right-4 z-50 bg-red-500/90 border border-red-400/20 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest backdrop-blur-xl">
                    {error}
                </div>
            )}
            {success && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 border border-emerald-400/20 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest backdrop-blur-xl">
                    {success}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white">Broadcast Deck</h2>
                    <p className="text-[10px] text-purple-500 font-black mt-1 uppercase tracking-widest">Virtual VOD-to-Live Systems</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/20"
                >
                    Initialize Channel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">
                {/* Channel Dropdown */}
                <div className="space-y-4 lg:col-span-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Active Frequencies</h3>
                    {channels.length === 0 ? (
                        <div className="p-8 text-center opacity-30">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No channels initialized</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative">
                                <select
                                    value={selectedChannel?.id || ''}
                                    onChange={(e) => {
                                        const next = channels.find(c => c.id === e.target.value);
                                        if (next) {
                                            setSelectedChannel(next);
                                            setError(null);
                                            setSuccess(null);
                                        }
                                    }}
                                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-10 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-purple-500/60"
                                >
                                    <option value="" disabled>Select Channel</option>
                                    {channels.map(chan => (
                                        <option key={chan.id} value={chan.id}>
                                            {chan.name}
                                        </option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            {selectedChannel && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${selectedChannel.is_active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-red-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white block truncate">{selectedChannel.name}</span>
                                            {selectedChannel.description && (
                                                <span className="text-[8px] uppercase tracking-wider block mt-1 truncate text-slate-500">{selectedChannel.description}</span>
                                            )}
                                        </div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${selectedChannel.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {selectedChannel.is_active ? 'LIVE' : 'OFF'}
                                        </span>
                                    </div>
                                    {selectedChannel.live_started_at && selectedChannel.is_active && (
                                        <div className="mt-3 text-[8px] font-mono text-emerald-400 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                            Started: {new Date(selectedChannel.live_started_at).toLocaleTimeString()}
                                        </div>
                                    )}
                                    {selectedChannel.scheduled_start_time && selectedChannel.is_active && !selectedChannel.live_started_at && (
                                        <div className="mt-3 text-[8px] font-mono text-purple-400 flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Scheduled: {new Date(selectedChannel.scheduled_start_time).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Schedule & Media Picker */}
                {selectedChannel && (
                    <div className="lg:col-span-9 space-y-6 md:space-y-8 bg-white/5 border border-white/10 rounded-[24px] md:rounded-[28px] p-4 md:p-8">
                        {/* Channel Header */}
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div>
                                {!isEditingName ? (
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-white">{selectedChannel.name}</h3>
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                        <input
                                            value={pendingName}
                                            onChange={(e) => setPendingName(e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500 font-mono w-full sm:w-64"
                                            placeholder="Channel name"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveChannelName}
                                                className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-500 transition-all"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => { setIsEditingName(false); setPendingName(selectedChannel.name || ''); }}
                                                className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:text-white transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-[10px] font-mono text-purple-400 uppercase">{schedule.length} Segments</span>
                                    <span className="text-[10px] font-mono text-slate-600">•</span>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">{mediaCount} Media</span>
                                    <span className="text-[10px] font-mono text-slate-600">•</span>
                                    <span className="text-[10px] font-mono text-orange-400 uppercase">{adCount} Ads</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {schedule.length > 0 && (
                                    <button
                                        onClick={() => setShowPreview(!showPreview)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                    >
                                        {showPreview ? 'Hide Timeline' : 'Timeline'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Panel Toggle */}
                        <div className="md:hidden grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMobilePanel('schedule')}
                                className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${mobilePanel === 'schedule' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'}`}
                            >
                                Schedule
                            </button>
                            <button
                                onClick={() => setMobilePanel('picker')}
                                className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${mobilePanel === 'picker' ? 'bg-orange-600 text-white' : 'bg-white/5 text-slate-400'}`}
                            >
                                Library
                            </button>
                        </div>

                        {/* Timeline Preview */}
                        {showPreview && schedule.length > 0 && (
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">Broadcast Timeline ({formatDuration(totalDuration)} total)</h4>
                                <div className="flex h-8 rounded-xl overflow-hidden border border-white/5">
                                    {getScheduleTimeline().map((item, idx) => {
                                        const dur = getItemDuration(item);
                                        const widthPercent = totalDuration > 0 ? (dur / totalDuration) * 100 : 0;
                                        return (
                                            <div
                                                key={item.id}
                                                className={`relative group cursor-pointer transition-all hover:brightness-125 ${item.ad_id ? 'bg-orange-600/60' : 'bg-purple-600/60'}`}
                                                style={{ width: `${Math.max(widthPercent, 1)}%` }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                                    <span className="text-[7px] font-black text-white/60 truncate px-1">{idx + 1}</span>
                                                </div>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 border border-white/10 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                    <p className="text-[9px] font-black text-white">{item.media_library?.title || item.ads_library?.title}</p>
                                                    <p className="text-[8px] text-slate-400">{formatDuration(dur)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[8px] font-mono text-slate-600">0:00</span>
                                    <span className="text-[8px] font-mono text-slate-600">{formatDuration(totalDuration)}</span>
                                </div>
                            </div>
                        )}

                        {/* Schedule Items */}
                        <div className={`grid grid-cols-1 gap-3 max-h-[52vh] md:max-h-[520px] overflow-y-auto no-scrollbar pr-2 ${mobilePanel !== 'schedule' ? 'hidden md:grid' : ''}`}>
                            {schedule.length === 0 && (
                                <div className="py-16 text-center">
                                    <svg className="w-12 h-12 text-slate-800 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Empty Schedule</p>
                                    <p className="text-[9px] text-slate-700 mt-2">Add media and ads from the picker below</p>
                                </div>
                            )}
                            {schedule.map((item, idx) => {
                                const dur = getItemDuration(item);

                                return (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDrop={() => handleDrop(idx)}
                                        onDragEnd={handleDragEnd}
                                        className={`bg-black/40 border rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 group transition-all cursor-grab active:cursor-grabbing ${dragOverIndex === idx ? 'border-purple-500 bg-purple-500/10' :
                                            dragIndex === idx ? 'opacity-50 border-white/5' :
                                                item.ad_id ? 'border-orange-500/10' : 'border-white/5'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
                                            <div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" />
                                            <div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" />
                                            <div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" />
                                        </div>

                                        <span className="text-[10px] font-black text-slate-700 w-6 text-center">{idx + 1}</span>

                                        <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0">
                                            {item.media_library?.cover_url ? (
                                                <img src={item.media_library.cover_url.startsWith('http') ? item.media_library.cover_url : CLOUDFLARE_BASE_URL + item.media_library.cover_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${item.ad_id ? 'bg-orange-500/10' : 'bg-purple-500/10'}`}>
                                                    {item.ad_id ? (
                                                        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5.882V19.297A1.71 1.71 0 018.676 20.825L4.241 17.5H1.75C0.784 17.5 0 16.716 0 15.75V9.25C0 8.284 0.784 7.5 1.75 7.5H4.241L8.676 4.175A1.71 1.71 0 0111 5.882Z" /></svg>
                                                    ) : (
                                                        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-[11px] font-black uppercase text-white truncate">{item.media_library?.title || item.ads_library?.title || 'Unknown'}</h4>
                                                {item.ad_id && <span className="px-1.5 py-0.5 bg-orange-600/20 text-orange-500 text-[7px] font-black rounded border border-orange-500/20 shrink-0">AD</span>}
                                                {item.media_library?.category && (
                                                    <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 text-[7px] font-black rounded border border-purple-500/20 shrink-0">{item.media_library.category}</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                {dur > 0 ? (
                                                    <span className="text-[9px] font-mono text-slate-500">{formatDuration(dur)}</span>
                                                ) : (
                                                    <span className="text-[8px] text-orange-400 font-black uppercase">Duration missing</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveItem(idx, 'up'); }}
                                                disabled={idx === 0 || isReordering}
                                                className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveItem(idx, 'down'); }}
                                                disabled={idx === schedule.length - 1 || isReordering}
                                                className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromSchedule(item.id)}
                                            className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Media/Ads Picker */}
                        <div className={`mt-8 pt-8 border-t border-white/5 ${mobilePanel !== 'picker' ? 'hidden md:block' : ''}`}>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setPickerTab('media')}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-all ${pickerTab === 'media' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        Media Library ({mediaList.length})
                                    </button>
                                    <button
                                        onClick={() => setPickerTab('ads')}
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
                                        onChange={(e) => setMediaSearch(e.target.value)}
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
                                                onClick={() => addToSchedule(media.id, 'media')}
                                                className={`bg-white/5 border border-white/5 hover:border-purple-500/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group ${alreadyInSchedule ? 'ring-1 ring-purple-500/20' : ''}`}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden relative shrink-0">
                                                    <img src={media.cover_url?.startsWith('http') ? media.cover_url : CLOUDFLARE_BASE_URL + (media.cover_url || '')} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg>
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
                                                onClick={() => addToSchedule(ad.id, 'ad')}
                                                className="bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-orange-600/10 flex items-center justify-center shrink-0">
                                                    <svg className="w-5 h-5 text-orange-500/40 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5.882V19.297A1.71 1.71 0 018.676 20.825L4.241 17.5H1.75C0.784 17.5 0 16.716 0 15.75V9.25C0 8.284 0.784 7.5 1.75 7.5H4.241L8.676 4.175A1.71 1.71 0 0111 5.882Z" /></svg>
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

                        {/* Broadcast Controls */}
                        <div className="mt-10 pt-8 border-t border-white/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                {/* Stats */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                                            <span className="text-lg font-black text-white">{formatDuration(totalDuration)}</span>
                                            <p className="text-[8px] font-black uppercase text-slate-600 mt-1">Total Loop</p>
                                        </div>
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                                            <span className="text-lg font-black text-purple-400">{mediaCount}</span>
                                            <p className="text-[8px] font-black uppercase text-slate-600 mt-1">Media</p>
                                        </div>
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                                            <span className="text-lg font-black text-orange-400">{adCount}</span>
                                            <p className="text-[8px] font-black uppercase text-slate-600 mt-1">Ads</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                            <p className="text-[8px] font-black uppercase text-slate-600">Live Viewers</p>
                                            <span className="text-2xl font-black text-emerald-400">{liveViewers}</span>
                                            {realtimeError && (
                                                <p className="text-[8px] font-mono text-slate-500 mt-2">{realtimeError}</p>
                                            )}
                                        </div>
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                            <p className="text-[8px] font-black uppercase text-slate-600">Current Segment</p>
                                            {liveMetrics ? (
                                                <div className="mt-1">
                                                    <span className="text-[10px] font-black uppercase text-white block truncate">{liveMetrics.title}</span>
                                                    <span className={`text-[8px] font-black uppercase ${liveMetrics.isAd ? 'text-orange-400' : 'text-purple-400'}`}>
                                                        {liveMetrics.isAd ? 'AD' : 'MEDIA'} â€¢ #{liveMetrics.index + 1}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-500">No signal</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                        <p className="text-[8px] font-black uppercase text-slate-600">Segment Time</p>
                                        {liveMetrics ? (
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] font-mono text-white">{formatDuration(liveMetrics.segmentElapsed)}</span>
                                                <div className="flex-1 mx-3 h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500"
                                                        style={{ width: `${Math.min((liveMetrics.segmentElapsed / Math.max(liveMetrics.segmentDuration, 1)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400">-{formatDuration(liveMetrics.segmentRemaining)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-slate-500">Awaiting live signal</span>
                                        )}
                                    </div>

                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${selectedChannel.is_active ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse' : 'bg-red-400'}`} />
                                            <span className={`text-sm font-black uppercase tracking-widest ${selectedChannel.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {selectedChannel.is_active
                                                    ? selectedChannel.scheduled_start_time
                                                        ? 'SCHEDULED'
                                                        : 'LIVE & BROADCASTING'
                                                    : 'OFFLINE / STANDBY'
                                                }
                                            </span>
                                        </div>
                                        {selectedChannel.live_started_at && selectedChannel.is_active && (
                                            <p className="text-[8px] font-mono text-slate-500 mt-2">
                                                Started: {new Date(selectedChannel.live_started_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="space-y-4">
                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[8px] font-black uppercase text-slate-600">Test Duration</p>
                                                <p className="text-[9px] font-mono text-slate-500 mt-1">Forces 60s segments</p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={testDurationEnabled}
                                                onClick={toggleTestDuration}
                                                className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${testDurationEnabled ? 'bg-emerald-600/80 border-emerald-500/60' : 'bg-white/5 border-white/10'}`}
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${testDurationEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                        <div className="mt-2 text-[8px] font-black uppercase tracking-widest">
                                            <span className={testDurationEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                                                {testDurationEnabled ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                                        <label className="text-[8px] font-black uppercase text-slate-600 mb-2 block">Schedule Start Time</label>
                                        <input
                                            type="datetime-local"
                                            defaultValue={selectedChannel.scheduled_start_time ? toLocalInputValue(selectedChannel.scheduled_start_time) : ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleScheduleLive(e.target.value);
                                                } else {
                                                    supabase.from('virtual_channels').upsert({
                                                        id: selectedChannel.id,
                                                        scheduled_start_time: null
                                                    }, { onConflict: 'id' }).then(() => fetchData());
                                                }
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white focus:outline-none focus:border-purple-500 font-mono"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => selectedChannel && fetchSchedule(selectedChannel.id)}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-slate-300 transition-all"
                                        >
                                            Refresh Schedule
                                        </button>
                                        {processing === 'Auto-calculating durations...' && (
                                            <div className="flex-1 py-3 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-center text-[9px] font-black uppercase tracking-[0.2em] text-purple-300">
                                                Auto‑Calc Running…
                                            </div>
                                        )}
                                        <button
                                            onClick={backfillMissingDurations}
                                            disabled={processing !== null}
                                            className="flex-1 py-3 bg-orange-600/80 hover:bg-orange-600 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white transition-all disabled:opacity-50"
                                        >
                                            Auto-Calc Durations
                                        </button>
                                        <button
                                            onClick={saveDurationsToDb}
                                            disabled={isSavingDurations || schedule.length === 0}
                                            className="flex-1 py-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white transition-all disabled:opacity-50"
                                        >
                                            {isSavingDurations ? 'Saving...' : 'Save Durations'}
                                        </button>
                                        <button
                                            onClick={() => setShowResyncConfirm(true)}
                                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white transition-all"
                                        >
                                            Resync Start
                                        </button>
                                    </div>
                                    {durationBackfillFailedCount > 0 && (
                                        <div className="mt-3 flex items-center justify-between gap-3 bg-black/40 border border-orange-500/20 rounded-2xl px-4 py-3">
                                            <p className="text-[9px] font-mono text-orange-400">
                                                {durationBackfillFailedCount} item(s) failed duration fetch
                                            </p>
                                            <button
                                                onClick={() => selectedChannel && backfillMissingDurations()}
                                                disabled={processing !== null}
                                                className="px-3 py-2 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/30 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-orange-200 disabled:opacity-50"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {selectedChannel.is_active ? (
                                            <button
                                                onClick={handleGoOffline}
                                                disabled={processing !== null}
                                                className="flex-1 py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white transition-all shadow-2xl shadow-red-900/20 flex items-center justify-center gap-3"
                                            >
                                                <div className="w-2 h-2 bg-white rounded-full" />
                                                Go Offline
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleGoLive}
                                                disabled={schedule.length === 0 || processing !== null || missingDurationCount > 0}
                                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:cursor-not-allowed rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white transition-all shadow-2xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                {processing ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        {processing}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                        Go Live Now
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {schedule.length === 0 && !selectedChannel.is_active && (
                                        <p className="text-[9px] text-red-400/60 font-mono text-center">Add at least one media item to go live</p>
                                    )}

                                    {missingDurationCount > 0 && (
                                        <div className="text-center space-y-2">
                                            <p className="text-[9px] text-orange-400/80 font-mono">⚠ {missingDurationCount} item(s) missing duration</p>
                                            <button
                                                onClick={() => setShowMissingReport(true)}
                                                className="text-[9px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-all"
                                            >
                                                View Missing Report
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
                        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-8">New Frequency</h2>
                        <form onSubmit={handleCreateChannel} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Channel Name</label>
                                <input name="name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="KAIRO_LIVE_01" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description (Optional)</label>
                                <input name="description" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="24/7 Movie Marathon" />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-500 hover:text-white transition-all">Abort</button>
                                <button type="submit" className="flex-1 py-4 bg-purple-600 rounded-2xl font-black uppercase text-[10px] text-white hover:bg-purple-500 transition-all">Initialize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMissingReport && (
                <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Missing Duration Report</h3>
                            <button
                                onClick={() => setShowMissingReport(false)}
                                className="px-3 py-1.5 bg-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                                Close
                            </button>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto no-scrollbar space-y-2">
                            {getMissingDurationItems().map(item => (
                                <div key={item.id} className="bg-black/40 border border-white/5 rounded-xl p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase text-white truncate">{item.title}</p>
                                            <p className="text-[8px] text-slate-500 font-mono truncate">{item.url || 'Missing URL'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${item.type === 'AD' ? 'bg-orange-600/20 text-orange-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                                {item.type}
                                            </span>
                                            <button
                                                onClick={() => retryDurationForItem(item)}
                                                disabled={!item.url || processing !== null}
                                                className="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {getMissingDurationItems().length === 0 && (
                                <div className="py-10 text-center text-[9px] text-slate-500">All items have durations.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showResyncConfirm && (
                <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white mb-3">Force Resync Start</h3>
                        <p className="text-[10px] text-slate-400 font-mono mb-6">
                            This resets the live start time for all viewers and will desync anyone currently watching.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResyncConfirm(false)}
                                className="flex-1 py-3 bg-white/5 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowResyncConfirm(false);
                                    await forceResyncStart();
                                }}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white"
                            >
                                Force Resync
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualChannelManager;







