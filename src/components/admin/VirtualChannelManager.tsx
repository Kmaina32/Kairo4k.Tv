import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ADMIN_TEST_DURATION_KEY, ADMIN_TEST_DURATION_SECONDS } from '../../constants';
import BroadcastHeader from './broadcast/BroadcastHeader';
import ChannelSelector from './broadcast/ChannelSelector';
import LiveTelemetryCard from './broadcast/LiveTelemetryCard';
import SchedulePanel from './broadcast/SchedulePanel';
import AssetPicker from './broadcast/AssetPicker';
import BroadcastControls from './broadcast/BroadcastControls';
import CreateChannelModal from './broadcast/CreateChannelModal';
import StatusToast from './broadcast/StatusToast';

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
  const [showPreview, setShowPreview] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const autoBackfillAttemptRef = useRef<string | null>(null);
  const [durationBackfillFailedCount, setDurationBackfillFailedCount] = useState(0);
  const [isSavingDurations, setIsSavingDurations] = useState(false);
  const [testDurationEnabled, setTestDurationEnabled] = useState(() => localStorage.getItem(ADMIN_TEST_DURATION_KEY) === 'true');
  const [mobilePanel, setMobilePanel] = useState<'schedule' | 'picker'>('schedule');
  const [showMissingReport, setShowMissingReport] = useState(false);

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

  const addToSchedule = async (id: string, type: 'media' | 'ad') => {
    if (!selectedChannel) return;

    let duration: number;
    let payload: any = {
      channel_id: selectedChannel.id,
      order_index: schedule.length,
    };

    if (type === 'media') {
      const media = mediaList.find(m => m.id === id);
      duration = media?.duration || 0;
      payload.media_id = id;
      payload.duration = duration;
    } else {
      const ad = adsList.find(a => a.id === id);
      duration = ad?.duration || 0;
      payload.ad_id = id;
      payload.duration = duration;
    }

    const { error } = await supabase.from('channel_schedule').insert([payload]);
    if (!error) {
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
        await supabase.from('channel_schedule').upsert({ id: items[i].id, order_index: i }, { onConflict: 'id' });
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
        const { error: updateError } = await supabase.from('virtual_channels').upsert({
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
        await supabase.from('virtual_channels').upsert({
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
      if (!isoTime) throw new Error('Invalid time value');
      const { error } = await supabase.rpc('schedule_live', { channel_uuid: selectedChannel.id, start_time: isoTime });
      if (error) {
        await supabase.from('virtual_channels').upsert({
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

  const handleDragStart = (index: number) => setDragIndex(index);
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

    const newSchedule = [...schedule];
    const [moved] = newSchedule.splice(dragIndex, 1);
    newSchedule.splice(index, 0, moved);

    setSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));
    await reindexSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));

    setDragIndex(null);
    setDragOverIndex(null);
    fetchSchedule(selectedChannel.id);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= schedule.length) return;

    const newSchedule = [...schedule];
    [newSchedule[index], newSchedule[newIndex]] = [newSchedule[newIndex], newSchedule[index]];
    setSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));
    await reindexSchedule(newSchedule.map((item, i) => ({ ...item, order_index: i })));
    fetchSchedule(selectedChannel.id);
  };

  const filteredMedia = mediaList.filter(m =>
    m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
    m.category?.toLowerCase().includes(mediaSearch.toLowerCase())
  );

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
  const missingDurationCount = schedule.filter(item => getItemDuration(item) <= 0).length;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const fromLocalInputValue = (value: string) => {
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) return '';
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const local = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
    return local.toISOString();
  };

  const resolveMediaUrl = (item: ScheduleItem) => {
    if (item.media_library?.stream_url) return item.media_library.stream_url;
    if (item.ads_library?.ad_url) return item.ads_library.ad_url;
    return '';
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

  const applyDurationOverride = (scheduleId: string, duration: number) => {
    setSchedule(prev => prev.map(item => item.id === scheduleId ? { ...item, duration } : item));
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
          applyDurationOverride(item.id, duration);
        } catch {
          failedCount += 1;
        }
      }
      await fetchSchedule(channelId);
    } finally {
      if (failedCount > 0) setDurationBackfillFailedCount(failedCount);
      setProcessing(null);
    }
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
          applyDurationOverride(item.id, duration);
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

      const { error } = await supabase.from('channel_schedule').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setSuccess('Durations saved to database');
    } catch (err: any) {
      setError(err.message || 'Failed to save durations');
    } finally {
      setIsSavingDurations(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 4000);
    }
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
      applyDurationOverride(item.id, duration);
      fetchSchedule(selectedChannel.id);
      setSuccess(`Duration updated for ${item.title}`);
    } catch (err: any) {
      setError(err.message || 'Retry failed');
    } finally {
      setProcessing(null);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  const getMissingDurationItems = () => {
    return schedule.filter(item => getItemDuration(item) <= 0).map(item => ({
      id: item.id,
      title: item.media_library?.title || item.ads_library?.title || 'Unknown',
      type: item.ad_id ? 'AD' : 'MEDIA',
      url: resolveMediaUrl(item)
    }));
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

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && <StatusToast kind="error" message={error} />}
      {success && <StatusToast kind="success" message={success} />}

      <BroadcastHeader
        onCreate={() => setIsCreating(true)}
        onGoLive={handleGoLive}
        canGoLive={!!selectedChannel && schedule.length > 0}
      />

      <div className="space-y-6">
        <div className="w-full px-2 md:px-4">
          <ChannelSelector
            channels={channels}
            selectedChannel={selectedChannel}
            onSelect={(chan) => { setSelectedChannel(chan); setError(null); setSuccess(null); }}
          />
        </div>

        {selectedChannel && (
          <div className="w-full px-2 md:px-4">
            <div className="space-y-6 md:space-y-8 bg-white/5 border border-white/10 rounded-[24px] md:rounded-[28px] p-4 md:p-8">
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

            <LiveTelemetryCard
              liveViewers={liveViewers}
              liveMetrics={liveMetrics}
              formatDuration={formatDuration}
              realtimeError={realtimeError}
            />

            <SchedulePanel
              schedule={schedule}
              liveIndex={liveMetrics?.index ?? null}
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview(!showPreview)}
              onRemove={removeFromSchedule}
              onMove={moveItem}
              formatDuration={formatDuration}
              getItemDuration={getItemDuration}
              totalDuration={totalDuration}
              mobileHidden={mobilePanel !== 'schedule'}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dragOverIndex={dragOverIndex}
              dragIndex={dragIndex}
            />

            <AssetPicker
              pickerTab={pickerTab}
              setPickerTab={setPickerTab}
              mediaSearch={mediaSearch}
              setMediaSearch={setMediaSearch}
              filteredMedia={filteredMedia}
              adsList={adsList}
              schedule={schedule}
              addToSchedule={addToSchedule}
              mobileHidden={mobilePanel !== 'picker'}
            />

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
          supabase.from('virtual_channels').upsert({ id: selectedChannel.id, scheduled_start_time: null }, { onConflict: 'id' }).then(() => fetchData());
        }}
        onRefresh={() => selectedChannel && fetchSchedule(selectedChannel.id)}
        onAutoCalc={backfillMissingDurations}
        autoCalcRunning={processing === 'Calculating durations...' || processing === 'Auto-calculating durations...'}
        onSaveDurations={saveDurationsToDb}
        savingDurations={isSavingDurations}
        onResync={() => {
          const now = new Date().toISOString();
          supabase.from('virtual_channels').upsert({ id: selectedChannel.id, live_started_at: now, is_active: true }, { onConflict: 'id' }).then(() => fetchData());
        }}
        onGoLive={handleGoLive}
        onGoOffline={handleGoOffline}
        disableGoLive={schedule.length === 0 || processing !== null || missingDurationCount > 0}
        processingLabel={processing}
              missingDurationCount={missingDurationCount}
              onShowMissingReport={() => setShowMissingReport(true)}
            />
            </div>
          </div>
        )}
      </div>

      {isCreating && (
        <CreateChannelModal
          onClose={() => setIsCreating(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {durationBackfillFailedCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-black/80 border border-orange-500/30 rounded-2xl p-4">
          <p className="text-[10px] font-mono text-orange-400">{durationBackfillFailedCount} item(s) failed duration fetch</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => selectedChannel && backfillMissingDurations()}
              className="px-3 py-2 bg-orange-600/40 hover:bg-orange-600/60 border border-orange-500/40 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-orange-100"
            >
              Retry
            </button>
            <button
              onClick={() => setDurationBackfillFailedCount(0)}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-300"
            >
              Dismiss
            </button>
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
                        className="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white"
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
    </div>
  );
};

export default VirtualChannelManager;
