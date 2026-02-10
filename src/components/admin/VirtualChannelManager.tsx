
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ADMIN_TEST_DURATION_KEY, ADMIN_TEST_DURATION_SECONDS, CLOUDFLARE_BASE_URL } from '../../constants';
import ChannelSelector from './broadcast/ChannelSelector';
import ChannelHeader from './broadcast/ChannelHeader';
import Timeline from './broadcast/Timeline';
import SchedulePanel from './broadcast/SchedulePanel';
import MediaPicker from './broadcast/MediaPicker';
import BroadcastControls from './broadcast/BroadcastControls';
import MissingDurationReport from './broadcast/MissingDurationReport';
import ResyncConfirm from './broadcast/ResyncConfirm';

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

interface MissingItem {
    id: string;
    title: string;
    url: string;
    type: 'AD' | 'MEDIA';
}

interface VirtualChannelManagerProps {
    // Allow passing cached data from parent
    cachedChannels?: any[];
    cachedMediaList?: any[];
    cachedAdsList?: any[];
    onDataRefresh?: (channels: any[], mediaList: any[], adsList: any[]) => void;
}

const VirtualChannelManager = ({
    cachedChannels,
    cachedMediaList,
    cachedAdsList,
    onDataRefresh
}: VirtualChannelManagerProps) => {
    const [channels, setChannels] = useState<any[]>(cachedChannels || []);
    const [mediaList, setMediaList] = useState<any[]>(cachedMediaList || []);
    const [adsList, setAdsList] = useState<any[]>(cachedAdsList || []);
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
    const [isLoading, setIsLoading] = useState(!cachedChannels);

    // Use cached data if available, otherwise fetch
    useEffect(() => {
        if (!cachedChannels) {
            fetchData();
        }
    }, []);

    // Notify parent of data refresh
    useEffect(() => {
        if (channels.length > 0 && mediaList.length > 0 && adsList.length > 0 && onDataRefresh) {
            onDataRefresh(channels, mediaList, adsList);
        }
    }, [channels, mediaList, adsList]);

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
        setIsLoading(true);
        const { data: chanData } = await supabase.from('virtual_channels').select('*').order('created_at', { ascending: false });
        const { data: mediaData } = await supabase.from('media_library').select('id, title, duration, cover_url, stream_url, category').is('parent_id', null).eq('is_active', true);
        const { data: adsData } = await supabase.from('ads_library').select('*').eq('is_active', true);

        if (chanData) setChannels(chanData);
        if (mediaData) setMediaList(mediaData);
        if (adsData) setAdsList(adsData);
        setIsLoading(false);
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

    const handleCreateChannel = async () => {
        setProcessing('Creating frequency...');
        try {
            const newName = `NEW CHANNEL ${channels.length + 1}`;
            const { data, error } = await supabase
                .from('virtual_channels')
                .insert([{
                    name: newName,
                    is_active: false,
                    logo_url: 'https://www.kairo.me/wp-content/uploads/2021/02/kairo_home.jpg'
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setChannels([data, ...channels]);
                setSelectedChannel(data);
                setSuccess(`Created frequency: ${newName}`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create channel');
        } finally {
            setProcessing(null);
            setTimeout(() => { setSuccess(null); setError(null); }, 3000);
        }
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

    const handleChannelSelect = (channel: any) => {
        setSelectedChannel(channel);
        setError(null);
        setSuccess(null);
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

    const handleGoLive = async () => {
        if (!selectedChannel || schedule.length === 0) {
            setError('Schedule is empty. Add media before going live.');
            return;
        }

        setProcessing('Going live...');
        setError(null);

        try {
            const { data, error } = await supabase.rpc('go_live', { channel_uuid: selectedChannel.id });

            if (error) {
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

    const handleGoOffline = async () => {
        if (!selectedChannel) return;
        setProcessing('Going offline...');

        try {
            const { error } = await supabase.rpc('go_offline', { channel_uuid: selectedChannel.id });

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

    const getMissingDurationItems = (): MissingItem[] => {
        return schedule.filter(item => getItemDuration(item) <= 0).map(item => ({
            id: item.id,
            title: item.media_library?.title || item.ads_library?.title || 'Unknown',
            type: item.ad_id ? 'AD' : 'MEDIA',
            url: resolveMediaUrl(item)
        }));
    };

    const retryDurationForItem = async (item: MissingItem) => {
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

    const timeline = getScheduleTimeline();

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Broadcast Systems...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

            {/* Header with Channel Selector Inside */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div className="flex-1">
                    <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">Broadcast Deck</h2>
                    <p className="text-xs text-purple-500 font-black uppercase tracking-widest">Virtual VOD-to-Live Systems</p>
                </div>

                {/* Channel Selector - Now inside the main container */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleCreateChannel}
                        disabled={processing !== null}
                        className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        New Channel
                    </button>

                    <div className="relative min-w-[280px]">
                        <select
                            value={selectedChannel?.id || ''}
                            onChange={(e) => {
                                const next = channels.find(c => c.id === e.target.value);
                                if (next) handleChannelSelect(next);
                            }}
                            className="w-full appearance-none bg-gradient-to-r from-orange-600/20 to-purple-600/20 border border-white/10 rounded-2xl px-6 py-4 pr-12 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono"
                        >
                            <option value="" disabled>
                                {channels.length === 0 ? 'No frequencies found' : 'Select Frequency'}
                            </option>
                            {channels.map(chan => (
                                <option key={chan.id} value={chan.id} className="bg-slate-900 text-white">
                                    {chan.name} {chan.is_active ? '• [LIVE]' : '• [IDLE]'}
                                </option>
                            ))}
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Channel Info Bar - Shows when channel is selected */}
            {selectedChannel && (
                <div className="bg-gradient-to-r from-orange-600/10 via-purple-600/10 to-blue-600/10 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${selectedChannel.is_active ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse' : 'bg-red-400'}`} />
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-widest text-white">{selectedChannel.name}</h3>
                                {selectedChannel.description && (
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">{selectedChannel.description}</p>
                                )}
                            </div>
                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-xl ${selectedChannel.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                {selectedChannel.is_active ? 'ON AIR' : 'OFFLINE'}
                            </span>
                        </div>
                        <div className="flex items-center gap-6 text-xs font-mono">
                            <div>
                                <span className="text-slate-500 uppercase tracking-wider">Segments</span>
                                <span className="block text-white font-black">{schedule.length}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 uppercase tracking-wider">Total Duration</span>
                                <span className="block text-purple-400 font-black">{formatDuration(totalDuration)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 uppercase tracking-wider">Live Viewers</span>
                                <span className="block text-emerald-400 font-black">{liveViewers}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left Column - Schedule & Timeline */}
                <div className="xl:col-span-3 space-y-6">
                    {/* Timeline Preview */}
                    {showPreview && schedule.length > 0 && (
                        <Timeline
                            timeline={timeline}
                            totalDuration={totalDuration}
                            formatDuration={formatDuration}
                            getItemDuration={getItemDuration}
                        />
                    )}

                    {/* Mobile Panel Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMobilePanel('schedule')}
                            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mobilePanel === 'schedule' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            Schedule
                        </button>
                        <button
                            onClick={() => setMobilePanel('picker')}
                            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mobilePanel === 'picker' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            Library
                        </button>
                    </div>

                    {/* Schedule Items */}
                    <div className={`bg-white/5 border border-white/10 rounded-3xl p-6 ${mobilePanel !== 'schedule' ? 'hidden xl:block' : ''}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Schedule Queue</h3>
                            {schedule.length > 0 && (
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                >
                                    {showPreview ? 'Hide Timeline' : 'Show Timeline'}
                                </button>
                            )}
                        </div>
                        <SchedulePanel
                            schedule={schedule}
                            formatDuration={formatDuration}
                            getItemDuration={getItemDuration}
                            onRemove={removeFromSchedule}
                            onMove={moveItem}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            isReordering={isReordering}
                            dragIndex={dragIndex}
                            dragOverIndex={dragOverIndex}
                        />
                    </div>

                    {/* Media Picker */}
                    <div className={`bg-white/5 border border-white/10 rounded-3xl p-6 ${mobilePanel !== 'picker' ? 'hidden xl:block' : ''}`}>
                        <MediaPicker
                            mediaList={mediaList}
                            adsList={adsList}
                            schedule={schedule}
                            pickerTab={pickerTab}
                            mediaSearch={mediaSearch}
                            formatDuration={formatDuration}
                            onPickerTabChange={setPickerTab}
                            onMediaSearchChange={setMediaSearch}
                            onAddMedia={(id) => addToSchedule(id, 'media')}
                            onAddAd={(id) => addToSchedule(id, 'ad')}
                        />
                    </div>
                </div>

                {/* Right Column - Controls */}
                <div className="xl:col-span-1">
                    {selectedChannel ? (
                        <div className="sticky top-6 space-y-4">
                            {/* Channel Header / Edit */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <ChannelHeader
                                    channel={selectedChannel}
                                    scheduleLength={schedule.length}
                                    mediaCount={mediaCount}
                                    adCount={adCount}
                                    isEditingName={isEditingName}
                                    pendingName={pendingName}
                                    showPreview={showPreview}
                                    formatDuration={formatDuration}
                                    totalDuration={totalDuration}
                                    onStartEditName={() => setIsEditingName(true)}
                                    onNameChange={setPendingName}
                                    onSaveName={saveChannelName}
                                    onCancelEditName={() => { setIsEditingName(false); setPendingName(selectedChannel.name || ''); }}
                                    onTogglePreview={() => setShowPreview(!showPreview)}
                                />
                            </div>

                            {/* Broadcast Controls */}
                            <div className="bg-gradient-to-br from-orange-600/10 to-purple-600/10 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                                <BroadcastControls
                                    selectedChannel={selectedChannel}
                                    scheduleLength={schedule.length}
                                    totalDuration={totalDuration}
                                    mediaCount={mediaCount}
                                    adCount={adCount}
                                    liveViewers={liveViewers}
                                    liveMetrics={liveMetrics}
                                    formatDuration={formatDuration}
                                    onScheduleLive={handleScheduleLive}
                                    onClearScheduleTime={() => {
                                        supabase.from('virtual_channels').upsert({
                                            id: selectedChannel.id,
                                            scheduled_start_time: null
                                        }, { onConflict: 'id' }).then(() => fetchData());
                                    }}
                                    onRefresh={() => fetchSchedule(selectedChannel.id)}
                                    onAutoCalc={backfillMissingDurations}
                                    autoCalcRunning={processing === 'Calculating durations...'}
                                    onSaveDurations={saveDurationsToDb}
                                    savingDurations={isSavingDurations}
                                    onResync={() => setShowResyncConfirm(true)}
                                    onGoLive={handleGoLive}
                                    onGoOffline={handleGoOffline}
                                    disableGoLive={schedule.length === 0 || processing !== null || missingDurationCount > 0}
                                    processingLabel={processing}
                                    missingDurationCount={missingDurationCount}
                                    onShowMissingReport={() => setShowMissingReport(true)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-2">No Frequency Selected</p>
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-8 max-w-[200px] leading-relaxed">Select an existing frequency from the dropdown or initialize a new signal path.</p>

                            <button
                                onClick={handleCreateChannel}
                                disabled={processing !== null}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2"
                            >
                                {processing === 'Creating frequency...' ? 'Initializing...' : 'Quick Create Frequency'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showMissingReport && (
                <MissingDurationReport
                    items={getMissingDurationItems()}
                    onClose={() => setShowMissingReport(false)}
                    onRetry={retryDurationForItem}
                    isProcessing={processing !== null}
                />
            )}

            {showResyncConfirm && (
                <ResyncConfirm
                    onClose={() => setShowResyncConfirm(false)}
                    onConfirm={async () => {
                        setShowResyncConfirm(false);
                        await forceResyncStart();
                    }}
                />
            )}
        </div>
    );
};

export default VirtualChannelManager;
