
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import VideoPlayer from './VideoPlayer';

interface VirtualSyncPlayerProps {
    channelId: string;
    channelName: string;
    isTheater: boolean;
    onToggleTheater: () => void;
}

const VirtualSyncPlayer = ({ channelId, channelName, isTheater, onToggleTheater }: VirtualSyncPlayerProps) => {
    const [schedule, setSchedule] = useState<any[]>([]);
    const [currentSegment, setCurrentSegment] = useState<any>(null);
    const [seekTime, setSeekTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [channelData, setChannelData] = useState<any>(null);
    const [countdownText, setCountdownText] = useState("");

    useEffect(() => {
        const fetchChannelAndSchedule = async () => {
            const { data: chan } = await supabase.from('virtual_channels').select('*').eq('id', channelId).single();
            setChannelData(chan);

            const { data } = await supabase
                .from('channel_schedule')
                .select('*, media_library(url, cover_url, duration), ads_library(ad_url, duration)')
                .eq('channel_id', channelId)
                .order('order_index', { ascending: true });

            if (data && data.length > 0) {
                setSchedule(data);
                calculateSync(data);
            }
            setLoading(false);
        };

        fetchChannelAndSchedule();

        // Check sync every 30 seconds to stay aligned or handle schedule shifts
        const interval = setInterval(() => {
            if (schedule.length > 0) calculateSync(schedule);

            if (channelData?.scheduled_start_time) {
                const now = new Date().getTime();
                const start = new Date(channelData.scheduled_start_time).getTime();
                const diff = start - now;

                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const secs = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdownText(`${hours}h ${mins}m ${secs}s`);
                } else {
                    setCountdownText("");
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [channelId, channelData?.scheduled_start_time]);

    const calculateSync = (currentSchedule: any[]) => {
        const totalDuration = currentSchedule.reduce((acc, curr) =>
            acc + (curr.media_library?.duration || curr.ads_library?.duration || 0), 0);

        if (totalDuration === 0) return;

        // Implementation of Phase 1: Epoch Synchronization
        const now = Math.floor(Date.now() / 1000);
        const cycleOffset = now % totalDuration;

        let cumulative = 0;
        let found = false;

        for (const item of currentSchedule) {
            const itemDuration = item.media_library?.duration || item.ads_library?.duration || 0;
            if (cycleOffset >= cumulative && cycleOffset < cumulative + itemDuration) {
                const offsetInMedia = cycleOffset - cumulative;

                // Construct normalized media object
                const mediaUrl = item.media_id
                    ? item.media_library.url
                    : `https://pub-a84b309a59b0432d9479ce0138fe01dd.r2.dev/${item.ads_library.ad_url}`;

                const poster = item.media_library?.cover_url || '';

                setCurrentSegment({ url: mediaUrl, poster });
                setSeekTime(offsetInMedia);
                found = true;
                break;
            }
            cumulative += itemDuration;
        }

        if (!found && currentSchedule.length > 0) {
            // Fallback to first item if math fails
            const mediaUrl = currentSchedule[0].media_id
                ? currentSchedule[0].media_library.url
                : `https://pub-a84b309a59b0432d9479ce0138fe01dd.r2.dev/${currentSchedule[0].ads_library.ad_url}`;
            setCurrentSegment({ url: mediaUrl, poster: currentSchedule[0].media_library?.cover_url || '' });
            setSeekTime(0);
        }
    };

    const handleVideoEnded = () => {
        // Force recalculate sync to move to next video
        calculateSync(schedule);
    };

    if (loading) return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-[2rem] border-2 border-slate-800 animate-pulse">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Syncing Frequency...</span>
        </div>
    );

    if (countdownText) return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-[2rem] border-2 border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-black pointer-events-none" />
            <div className="relative z-10 text-center">
                <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-8 shadow-[0_0_50px_rgba(168,85,247,0.2)]" />
                <h2 className="text-4xl font-black uppercase tracking-[0.3em] text-white mb-4 kairo-cyber-glow">Coming Live</h2>
                <p className="text-sm font-black uppercase tracking-[0.5em] text-purple-500 mb-12">{channelName}</p>
                <div className="flex gap-4 justify-center">
                    <div className="bg-white/5 border border-white/10 px-8 py-6 rounded-3xl backdrop-blur-xl">
                        <span className="text-5xl font-mono font-black text-white tracking-tighter">{countdownText}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Time Remaining</p>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.5em] text-slate-700 animate-pulse">Establishing Signal... Standby</div>
        </div>
    );

    if (!currentSegment) return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-[2rem] border-2 border-slate-800">
            <svg className="w-16 h-16 text-slate-800 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">No Signal Detected</span>
        </div>
    );

    return (
        <VideoPlayer
            url={currentSegment.url}
            poster={currentSegment.poster}
            isTheater={isTheater}
            onToggleTheater={onToggleTheater}
            channelName={`${channelName} (BROADCAST)`}
            onEnded={handleVideoEnded}
            initialSeek={seekTime}
        />
    );
};

export default VirtualSyncPlayer;
